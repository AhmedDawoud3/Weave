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


def _generate_class_for_graph(graph: GraphConfig, class_name: str, custom_defs_list: list[str]) -> str:
    from compiler.compiler import GraphCompiler

    compiler = GraphCompiler()
    block = compiler.compile(graph)

    node_map = {node.id: node for node in graph.nodes}

    init_lines = []
    forward_lines = []

    has_concat = False
    has_add = False
    has_multiply = False
    has_sub = False
    has_div = False
    has_matmul = False
    has_scale = False
    has_scale_bias = False
    has_flatten_consec = False
    has_self_attn = False
    has_pos_enc = False
    has_causal_mask = False
    has_feed_forward = False

    BLOCK_TYPES = {
        "ResidualBlock",
        "TransformerEncoder",
        "MultiHeadAttention",
        "ConvBNReLU",
        "BottleneckBlock",
        "Block",
        "BatchNorm2dManualBlock",
        "AttentionManualBlock",
        "RNNManualBlock",
        "CustomAutogradManualBlock",
    }

    for node_id in block.exec_order:
        if node_id in ("input", "output"):
            continue

        node_config = node_map.get(node_id)
        if not node_config:
            continue

        t = node_config.type
        
        if t in BLOCK_TYPES:
            subgraph = getattr(node_config, "graph", None)
            if subgraph is not None:
                sub_class_name = f"{t}_{node_id}"
                sub_class_code = _generate_class_for_graph(subgraph, sub_class_name, custom_defs_list)
                if not any(f"class {sub_class_name}" in c for c in custom_defs_list):
                    custom_defs_list.append(sub_class_code)
                init_lines.append(f"        self.{node_id} = {sub_class_name}()")
                
                inputs = block.incoming_edges.get(node_id, [])
                if len(inputs) == 1:
                    forward_lines.append(f"        tensors['{node_id}'] = self.{node_id}(tensors['{inputs[0]}'])")
                elif len(inputs) > 1:
                    forward_lines.append(f"        tensors['{node_id}'] = self.{node_id}(tensors['{inputs[0]}'])")
                continue

        params = getattr(node_config, "params", None)
        params_dict = {}
        if params is not None:
            if hasattr(params, "model_dump"):
                params_dict = params.model_dump()
            elif hasattr(params, "dict"):
                params_dict = params.dict()
            elif isinstance(params, dict):
                params_dict = params.copy()

        # Remove weight init parameters
        init_scheme = params_dict.pop("init_scheme", "auto")
        init_gain = params_dict.pop("init_gain", None)
        init_fan_mode = params_dict.pop("init_fan_mode", "fan_in")

        param_strs = []
        for k, v in params_dict.items():
            if isinstance(v, str):
                param_strs.append(f"{k}='{v}'")
            elif isinstance(v, list):
                param_strs.append(f"{k}={v}")
            else:
                param_strs.append(f"{k}={v}")
        params_str = ", ".join(param_strs)

        init_calls = []
        if init_scheme != "auto":
            gain_val = init_gain if init_gain is not None else 1.0
            if init_scheme == "xavier_uniform":
                init_calls.append(f"        nn.init.xavier_uniform_(self.{node_id}.weight, gain={gain_val})")
            elif init_scheme == "xavier_normal":
                init_calls.append(f"        nn.init.xavier_normal_(self.{node_id}.weight, gain={gain_val})")
            elif init_scheme == "kaiming_uniform":
                init_calls.append(f"        nn.init.kaiming_uniform_(self.{node_id}.weight, mode='{init_fan_mode}')")
            elif init_scheme == "kaiming_normal":
                init_calls.append(f"        nn.init.kaiming_normal_(self.{node_id}.weight, mode='{init_fan_mode}')")
            elif init_scheme == "zeros":
                init_calls.append(f"        nn.init.zeros_(self.{node_id}.weight)")
            elif init_scheme == "ones":
                init_calls.append(f"        nn.init.ones_(self.{node_id}.weight)")
            elif init_scheme == "normal":
                init_calls.append(f"        nn.init.normal_(self.{node_id}.weight, std={gain_val})")
            elif init_scheme == "uniform":
                init_calls.append(f"        nn.init.uniform_(self.{node_id}.weight, -{gain_val}, {gain_val})")
        else:
            if t in ("Conv1d", "Conv2d", "ConvTranspose2d", "Linear"):
                init_calls.append(f"        nn.init.kaiming_uniform_(self.{node_id}.weight, a=math.sqrt(5))")
                init_calls.append(f"        if self.{node_id}.bias is not None:")
                init_calls.append(f"            fan_in, _ = nn.init._calculate_fan_in_and_fan_out(self.{node_id}.weight)")
                init_calls.append(f"            bound = 1 / math.sqrt(fan_in) if fan_in > 0 else 0")
                init_calls.append(f"            nn.init.uniform_(self.{node_id}.bias, -bound, bound)")
            elif t == "Embedding":
                init_calls.append(f"        nn.init.normal_(self.{node_id}.weight, mean=0.0, std=1.0 / math.sqrt(self.{node_id}.embedding_dim))")

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
        elif t == "FlattenConsecutive":
            init_lines.append(f"        self.{node_id} = FlattenConsecutiveModule({params_str})")
            has_flatten_consec = True
        elif t == "SelfAttention":
            init_lines.append(f"        self.{node_id} = SelfAttentionModule({params_str})")
            has_self_attn = True
        elif t == "PositionalEncoding":
            init_lines.append(f"        self.{node_id} = PositionalEncodingModule({params_str})")
            has_pos_enc = True
        elif t == "CausalMask":
            init_lines.append(f"        self.{node_id} = CausalMaskModule()")
            has_causal_mask = True
        elif t == "FeedForward":
            init_lines.append(f"        self.{node_id} = FeedForwardModule({params_str})")
            has_feed_forward = True
        else:
            init_lines.append(f"        self.{node_id} = nn.{t}({params_str})")
            for call in init_calls:
                init_lines.append(call)

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

    if has_add and not any("class AddModule" in c for c in custom_defs_list):
        custom_defs_list.append("""class AddModule(nn.Module):
    def forward(self, xs):
        return sum(xs)""")
    if has_concat and not any("class ConcatModule" in c for c in custom_defs_list):
        custom_defs_list.append("""class ConcatModule(nn.Module):
    def __init__(self, dim=1):
        super().__init__()
        self.dim = dim
    def forward(self, xs):
        return torch.cat(xs, dim=self.dim)""")
    if has_multiply and not any("class MultiplyModule" in c for c in custom_defs_list):
        custom_defs_list.append("""class MultiplyModule(nn.Module):
    def forward(self, xs):
        res = xs[0]
        for x in xs[1:]:
            res = res * x
        return res""")
    if has_sub and not any("class SubModule" in c for c in custom_defs_list):
        custom_defs_list.append("""class SubModule(nn.Module):
    def forward(self, xs):
        return xs[0] - xs[1]""")
    if has_div and not any("class DivModule" in c for c in custom_defs_list):
        custom_defs_list.append("""class DivModule(nn.Module):
    def forward(self, xs):
        return xs[0] / xs[1]""")
    if has_matmul and not any("class MatMulModule" in c for c in custom_defs_list):
        custom_defs_list.append("""class MatMulModule(nn.Module):
    def forward(self, xs):
        return torch.matmul(xs[0], xs[1])""")
    if has_scale and not any("class ScaleModule" in c for c in custom_defs_list):
        custom_defs_list.append("""class ScaleModule(nn.Module):
    def __init__(self, value=1.0):
        super().__init__()
        self.value = value
    def forward(self, x):
        return x * self.value""")
    if has_scale_bias and not any("class ChannelScaleBias" in c for c in custom_defs_list):
        custom_defs_list.append("""class ChannelScaleBias(nn.Module):
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
    if has_flatten_consec and not any("class FlattenConsecutiveModule" in c for c in custom_defs_list):
        custom_defs_list.append("""class FlattenConsecutiveModule(nn.Module):
    def __init__(self, n=2):
        super().__init__()
        self.n = n
    def forward(self, x):
        B, T, C = x.shape
        return x.contiguous().view(B, T // self.n, C * self.n)""")
    if has_self_attn and not any("class SelfAttentionModule" in c for c in custom_defs_list):
        custom_defs_list.append("""class SelfAttentionModule(nn.Module):
    def __init__(self, embed_dim, num_heads, dropout=0.0, causal=True, bias=True):
        super().__init__()
        self.causal = causal
        self.attn = nn.MultiheadAttention(
            embed_dim, num_heads, dropout=dropout, bias=bias, batch_first=True
        )
    def forward(self, x):
        T = x.size(1)
        attn_mask = None
        if self.causal:
            attn_mask = torch.triu(
                torch.ones(T, T, device=x.device, dtype=torch.bool), diagonal=1
            )
        out, _ = self.attn(x, x, x, attn_mask=attn_mask, need_weights=False)
        return out""")
    if has_pos_enc and not any("class PositionalEncodingModule" in c for c in custom_defs_list):
        custom_defs_list.append("""class PositionalEncodingModule(nn.Module):
    def __init__(self, embed_dim, max_seq_len=1024, pe_type="sinusoidal"):
        super().__init__()
        self.pe_type = pe_type
        if pe_type == "learned":
            self.pos_emb = nn.Embedding(max_seq_len, embed_dim)
        else:
            import math
            pe = torch.zeros(max_seq_len, embed_dim)
            position = torch.arange(0, max_seq_len, dtype=torch.float).unsqueeze(1)
            div_term = torch.exp(
                torch.arange(0, embed_dim, 2, dtype=torch.float)
                * (-math.log(10000.0) / embed_dim)
            )
            pe[:, 0::2] = torch.sin(position * div_term)
            if embed_dim % 2 == 1:
                pe[:, 1::2] = torch.cos(position * div_term[:-1])
            else:
                pe[:, 1::2] = torch.cos(position * div_term)
            self.register_buffer("pe", pe.unsqueeze(0))
    def forward(self, x):
        T = x.size(1)
        if self.pe_type == "learned":
            positions = torch.arange(T, device=x.device)
            return x + self.pos_emb(positions)
        else:
            return x + self.pe[:, :T, :]""")
    if has_causal_mask and not any("class CausalMaskModule" in c for c in custom_defs_list):
        custom_defs_list.append("""class CausalMaskModule(nn.Module):
    def forward(self, x):
        T = x.size(1)
        return torch.triu(torch.ones(T, T, device=x.device, dtype=torch.bool), diagonal=1)""")
    if has_feed_forward and not any("class FeedForwardModule" in c for c in custom_defs_list):
        custom_defs_list.append("""class FeedForwardModule(nn.Module):
    def __init__(self, embed_dim, expansion=4, dropout=0.0):
        super().__init__()
        hidden = embed_dim * expansion
        self.net = nn.Sequential(
            nn.Linear(embed_dim, hidden),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden, embed_dim),
            nn.Dropout(dropout),
        )
    def forward(self, x):
        return self.net(x)""")

    output_src = block.incoming_edges.get("output", ["input"])[0]
    init_str = "\n".join(init_lines)
    forward_str = "\n".join(forward_lines)

    return f"""class {class_name}(nn.Module):
    def __init__(self):
        super().__init__()
{init_str}

    def forward(self, x):
        tensors = {{"input": x}}
{forward_str}
        return tensors['{output_src}']"""


def generate_pytorch_code(graph: GraphConfig) -> str:
    """Generates standalone, human-readable PyTorch source code for the model graph."""
    custom_defs_list = []
    model_class_code = _generate_class_for_graph(graph, "Model", custom_defs_list)
    
    custom_code = "\n\n".join(custom_defs_list)
    if custom_code:
        custom_code += "\n\n"
        
    return f"""import math
import torch
import torch.nn as nn

{custom_code}{model_class_code}
"""
