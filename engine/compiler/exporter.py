"""
exporter.py — Model Exporters for ONNX, PyTorch, and TorchScript formats.
==========================================================================
Handles loading weights from a checkpoint path and saving compiled model graphs.
"""

from typing import Any

import torch
import torch.nn as nn

from compiler.compiler import GraphCompiler
from schemas import ExportRequest, GraphConfig


def load_checkpoint_model(graph: Any, checkpoint_path: str) -> nn.Module:
    """Builds the model from graph config and loads weights from checkpoint.

    Args:
        graph (Any): GraphConfig schema mapping.
        checkpoint_path (str): Filepath to PyTorch checkpoint (.pt).

    Returns:
        nn.Module: Loaded PyTorch module in evaluation mode.

    Raises:
        ValueError: If checkpoint loading fails.
    """
    compiler = GraphCompiler()
    model = compiler.compile(graph)

    try:
        checkpoint = torch.load(checkpoint_path, map_location="cpu")
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            model.load_state_dict(checkpoint["model_state_dict"])
        else:
            model.load_state_dict(checkpoint)
    except Exception as e:
        raise ValueError(
            f"Failed to load checkpoint from '{checkpoint_path}': {e}"
        ) from e

    model.eval()
    return model


def export_onnx(request: ExportRequest) -> str:
    """Exports the compiled model to ONNX format with dynamic batch axis.

    Args:
        request (ExportRequest): Configuration parameters for the export.

    Returns:
        str: Absolute filepath of the saved ONNX file.

    Raises:
        RuntimeError: If ONNX tracing fails.
    """
    model = load_checkpoint_model(request.graph, request.checkpoint_path)
    dummy_input = torch.randn(request.input_shape)

    try:
        torch.onnx.export(
            model,
            (dummy_input,),
            request.output_path,
            export_params=True,
            opset_version=request.opset_version or 17,
            do_constant_folding=True,
            input_names=["input"],
            output_names=["output"],
            dynamic_axes={
                "input": {0: "batch_size"},
                "output": {0: "batch_size"},
            },
        )
    except Exception as e:
        raise RuntimeError(f"ONNX export tracing failed: {e}") from e

    return request.output_path


def export_pytorch(request: ExportRequest) -> str:
    """Saves the raw state_dict of the loaded model.

    Args:
        request (ExportRequest): Configuration parameters for the export.

    Returns:
        str: Filepath where weights were saved.

    Raises:
        RuntimeError: If weights saving fails.
    """
    model = load_checkpoint_model(request.graph, request.checkpoint_path)

    try:
        torch.save(model.state_dict(), request.output_path)
    except Exception as e:
        raise RuntimeError(f"PyTorch state_dict save failed: {e}") from e

    return request.output_path


def export_torchscript(request: ExportRequest) -> str:
    """Traces and serializes the model to platform-independent TorchScript format.

    Args:
        request (ExportRequest): Configuration parameters for the export.

    Returns:
        str: Filepath where the TorchScript binary was saved.

    Raises:
        RuntimeError: If TorchScript serialization fails.
    """
    model = load_checkpoint_model(request.graph, request.checkpoint_path)
    dummy_input = torch.randn(request.input_shape)

    try:
        traced_model = torch.jit.trace(model, dummy_input)
        traced_model.save(request.output_path)
    except Exception as e:
        raise RuntimeError(f"TorchScript tracing failed: {e}") from e

    return request.output_path


def generate_pytorch_code(graph: GraphConfig) -> str:
    """Generates standalone, human-readable PyTorch source code for the model graph."""
    from compiler.compiler import GraphCompiler

    compiler = GraphCompiler()
    block = compiler.compile(graph)

    node_map = {node.id: node for node in graph.nodes}

    init_lines = []
    forward_lines = []

    custom_defs = []
    has_concat = False
    has_add = False
    has_multiply = False
    has_sub = False
    has_div = False
    has_matmul = False
    has_scale = False
    has_scale_bias = False

    for node_id in block.exec_order:
        if node_id in ("input", "output"):
            continue

        node_config = node_map.get(node_id)
        if not node_config:
            continue

        t = node_config.type
        params = getattr(node_config, "params", None)
        params_dict = {}
        if params is not None:
            if hasattr(params, "model_dump"):
                params_dict = params.model_dump()
            elif hasattr(params, "dict"):
                params_dict = params.dict()
            elif isinstance(params, dict):
                params_dict = params

        # Render params as keyword args
        param_strs = []
        for k, v in params_dict.items():
            if isinstance(v, str):
                param_strs.append(f"{k}='{v}'")
            elif isinstance(v, list):
                param_strs.append(f"{k}={v}")
            else:
                param_strs.append(f"{k}={v}")
        params_str = ", ".join(param_strs)

        if t == "Add":
            init_lines.append(f"        self.{node_id} = AddModule()")
            has_add = True
        elif t == "Concat":
            init_lines.append(f"        self.{node_id} = ConcatModule({params_str})")
            has_concat = True
        elif t == "Multiply":
            init_lines.append(f"        self.{node_id} = MultiplyModule()")
            has_multiply = True
        elif t == "Sub":
            init_lines.append(f"        self.{node_id} = SubModule()")
            has_sub = True
        elif t == "Div":
            init_lines.append(f"        self.{node_id} = DivModule()")
            has_div = True
        elif t == "MatMul":
            init_lines.append(f"        self.{node_id} = MatMulModule()")
            has_matmul = True
        elif t == "Scale":
            init_lines.append(f"        self.{node_id} = ScaleModule({params_str})")
            has_scale = True
        elif t == "ChannelScaleBias":
            init_lines.append(
                f"        self.{node_id} = ChannelScaleBias({params_str})"
            )
            has_scale_bias = True
        else:
            # Standard nn.Module
            init_lines.append(f"        self.{node_id} = nn.{t}({params_str})")

        # Determine forward pass code
        inputs = block.incoming_edges.get(node_id, [])
        if t in ("Add", "Concat", "Multiply", "Sub", "Div", "MatMul"):
            inputs_str = ", ".join(f"tensors['{src}']" for src in inputs)
            forward_lines.append(
                f"        tensors['{node_id}'] = self.{node_id}([{inputs_str}])"
            )
        else:
            if len(inputs) == 1:
                src = inputs[0]
                if t == "Linear":
                    # add auto-flatten support
                    forward_lines.append(
                        "        # Auto-flatten if input is multi-dimensional"
                    )
                    forward_lines.append(f"        inp_{node_id} = tensors['{src}']")
                    forward_lines.append(f"        if inp_{node_id}.dim() > 2:")
                    forward_lines.append(
                        f"            inp_{node_id} = inp_{node_id}.flatten(1)"
                    )
                    forward_lines.append(
                        f"        tensors['{node_id}'] = self.{node_id}(inp_{node_id})"
                    )
                else:
                    forward_lines.append(
                        f"        tensors['{node_id}'] = self.{node_id}(tensors['{src}'])"
                    )
            elif len(inputs) > 1:
                forward_lines.append(
                    f"        tensors['{node_id}'] = self.{node_id}(tensors['{inputs[0]}'])"
                )

    # Add custom modules code at the top
    if has_add:
        custom_defs.append("""class AddModule(nn.Module):
    def forward(self, xs):
        return sum(xs)""")
    if has_concat:
        custom_defs.append("""class ConcatModule(nn.Module):
    def __init__(self, dim=1):
        super().__init__()
        self.dim = dim
    def forward(self, xs):
        return torch.cat(xs, dim=self.dim)""")
    if has_multiply:
        custom_defs.append("""class MultiplyModule(nn.Module):
    def forward(self, xs):
        res = xs[0]
        for x in xs[1:]:
            res = res * x
        return res""")
    if has_sub:
        custom_defs.append("""class SubModule(nn.Module):
    def forward(self, xs):
        return xs[0] - xs[1]""")
    if has_div:
        custom_defs.append("""class DivModule(nn.Module):
    def forward(self, xs):
        return xs[0] / xs[1]""")
    if has_matmul:
        custom_defs.append("""class MatMulModule(nn.Module):
    def forward(self, xs):
        return torch.matmul(xs[0], xs[1])""")
    if has_scale:
        custom_defs.append("""class ScaleModule(nn.Module):
    def __init__(self, value=1.0):
        super().__init__()
        self.value = value
    def forward(self, x):
        return x * self.value""")
    if has_scale_bias:
        custom_defs.append("""class ChannelScaleBias(nn.Module):
    def __init__(self, num_features):
        super().__init__()
        self.weight = nn.Parameter(torch.ones(num_features))
        self.bias = nn.Parameter(torch.zeros(num_features))
    def forward(self, x):
        dims = [1] * x.dim()
        dims[1] = -1
        w = self.weight.view(*dims)
        b = self.bias.view(*dims)
        return x * w + b""")

    custom_code = "\\n\\n".join(custom_defs)
    if custom_code:
        custom_code += "\\n\\n"

    output_src = block.incoming_edges.get("output", ["input"])[0]
    init_str = "\\n".join(init_lines)
    forward_str = "\\n".join(forward_lines)

    code = f"""import torch
import torch.nn as nn

{custom_code}class Model(nn.Module):
    def __init__(self):
        super().__init__()
{init_str}

    def forward(self, x):
        tensors = {{"input": x}}
{forward_str}
        return tensors['{output_src}']
"""
    return code
