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

    # Subgraph ports
    input_ports = [n.id for n in graph.nodes if n.type == "InputPort"]
    output_ports = [n.id for n in graph.nodes if n.type == "OutputPort"]
    if not input_ports:
        input_ports = ["input"]
    if not output_ports:
        output_ports = ["output"]

    input_args = ["self"]
    for ip in input_ports:
        node = node_map.get(ip)
        arg_name = getattr(node.params, "name", ip) if node and hasattr(node, "params") else ip
        if arg_name == "input":
            arg_name = "x"
        input_args.append(arg_name)

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

    # Configurable parameters mapping
    configurable_params = getattr(graph, "configurable_params", []) or []
    cp_map = {}
    for cp in configurable_params:
        cp_map[(cp.inner_node_id, cp.param_name)] = cp.display_name

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
        if node_id in input_ports or node_id in output_ports:
            continue
        if node_id in ("input", "output"):
            continue

        node_config = node_map.get(node_id)
        if not node_config:
            continue

        t = node_config.type
        
        if t == "Module":
            sub_class_name = f"{node_config.name}_{node_id}"
            subgraph = getattr(node_config, "graph", None)
            if subgraph:
                sub_class_code = _generate_class_for_graph(subgraph, sub_class_name, custom_defs_list)
                if not any(f"class {sub_class_name}" in c for c in custom_defs_list):
                    custom_defs_list.append(sub_class_code)
                
                param_overrides = getattr(node_config, "param_overrides", {}) or {}
                override_strs = []
                for k, v in param_overrides.items():
                    if isinstance(v, str):
                        override_strs.append(f"{k}='{v}'")
                    else:
                        override_strs.append(f"{k}={v}")
                override_str = ", ".join(override_strs)
                init_lines.append(f"        self.{node_id} = {sub_class_name}({override_str})")
                
                inputs = block.incoming_edges.get(node_id, [])
                inputs_str = ", ".join(f"tensors['{src}']" for src in inputs)
                forward_lines.append(f"        tensors['{node_id}'] = self.{node_id}({inputs_str})")
                continue
                
        elif t == "Stack":
            sub_class_name = f"StackBlock_{node_id}"
            subgraph = getattr(node_config, "graph", None)
            if subgraph:
                sub_class_code = _generate_class_for_graph(subgraph, sub_class_name, custom_defs_list)
                if not any(f"class {sub_class_name}" in c for c in custom_defs_list):
                    custom_defs_list.append(sub_class_code)
                count = node_config.params.count
                init_lines.append(f"        self.{node_id} = nn.ModuleList([{sub_class_name}() for _ in range({count})])")
                
                inputs = block.incoming_edges.get(node_id, [])
                src = inputs[0] if inputs else "input"
                forward_lines.append(f"        tensors['{node_id}'] = tensors['{src}']")
                forward_lines.append(f"        for block in self.{node_id}:")
                forward_lines.append(f"            tensors['{node_id}'] = block(tensors['{node_id}'])")
                continue

        elif t in BLOCK_TYPES:
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
            if (node_id, k) in cp_map:
                param_strs.append(f"{k}={cp_map[(node_id, k)]}")
            else:
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

    # Render forward pass outputs mapping
    forward_outputs = []
    for op in output_ports:
        src = block.incoming_edges.get(op, [op])[0]
        forward_outputs.append(f"tensors['{src}']")
    return_str = forward_outputs[0] if len(forward_outputs) == 1 else f"({', '.join(forward_outputs)})"

    args_str = ", ".join(input_args)
    init_args = ["self"]
    for cp in configurable_params:
        init_args.append(f"{cp.display_name}={cp.default_value}")
    init_args_str = ", ".join(init_args)

    init_str = "\n".join(init_lines)
    forward_str = "\n".join(forward_lines)

    # Map inputs seeding logic inside generated class's forward
    seeding_lines = []
    for ip in input_ports:
        node = node_map.get(ip)
        arg_name = getattr(node.params, "name", ip) if node and hasattr(node, "params") else ip
        if arg_name == "input":
            arg_name = "x"
        seeding_lines.append(f"        tensors['{ip}'] = {arg_name}")
    seeding_str = "\n".join(seeding_lines)

    return f"""class {class_name}(nn.Module):
    def __init__({init_args_str}):
        super().__init__()
{init_str}

    def forward({args_str}):
        tensors = {{}}
{seeding_str}
{forward_str}
        return {return_str}"""


def _extract_dict(obj: Any) -> dict:
    if obj is None:
        return {}
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    if hasattr(obj, "dict"):
        return obj.dict()
    if isinstance(obj, dict):
        return obj
    return {}


def generate_pytorch_code(
    graph: GraphConfig,
    dataset_config: Any = None,
    loss: Any = None,
    optimizer: Any = None,
    training: Any = None,
) -> str:
    """Generates standalone, human-readable PyTorch source code for the model graph,
    including dataset loading and training loop.
    """
    custom_defs_list = []
    model_class_code = _generate_class_for_graph(graph, "Model", custom_defs_list)

    custom_code = "\n\n".join(custom_defs_list)
    if custom_code:
        custom_code += "\n\n"

    # Extract configs
    ds_dict = _extract_dict(dataset_config)
    loss_dict = _extract_dict(loss)
    opt_dict = _extract_dict(optimizer)
    train_dict = _extract_dict(training)

    source = ds_dict.get("source", "predefined")
    dataset_name = ds_dict.get("name", "MNIST")
    dataloader_cfg = ds_dict.get("dataloader")
    batch_size = (
        dataloader_cfg.get("batch_size", 32)
        if isinstance(dataloader_cfg, dict)
        else 32
    )

    loss_type = loss_dict.get("type", "CrossEntropyLoss")
    opt_type = opt_dict.get("type", "AdamW")
    opt_params = opt_dict.get("params", {})
    lr = opt_params.get("lr", 0.001)
    weight_decay = opt_params.get("weight_decay", 0.01)

    epochs = train_dict.get("epochs", 10)
    device = train_dict.get("device", "cuda")
    clip_norm = train_dict.get("gradient_clip_norm", 1.0)

    # Dataset loading section
    if source == "text":
        context_len = ds_dict.get("context_length", 8)
        tokenization = ds_dict.get("tokenization", "char")
        train_split = ds_dict.get("train_split", 0.9)
        dataset_code = f"""# =============================================================================
# Dataset Loading
# =============================================================================
class StandaloneTextDataset(Dataset):
    def __init__(self, text_path=None, text_content=None, context_length={context_len}, split="train", train_split={train_split}, tokenization="{tokenization}"):
        self.context_length = context_length
        self.tokenization = tokenization
        
        if text_path and os.path.exists(text_path):
            with open(text_path, encoding="utf-8") as f:
                text = f.read()
        elif text_content:
            text = text_content
        else:
            text = "Dummy text corpus to fallback on for testing model training." * 100

        if tokenization == "bpe" and os.path.exists("tokenizer.json"):
            from tokenizer import StandaloneBPETokenizer
            self.tokenizer = StandaloneBPETokenizer.load("tokenizer.json")
            self.vocab_size = len(self.tokenizer.vocab)
            encoded = self.tokenizer.encode(text)
            data = torch.tensor(encoded, dtype=torch.long)
        else:
            self.tokenizer = None
            chars = sorted(list(set(text)))
            self.vocab_size = len(chars)
            self.stoi = {{c: i for i, c in enumerate(chars)}}
            self.itos = {{i: c for i, c in enumerate(chars)}}
            data = torch.tensor([self.stoi[c] for c in text if c in self.stoi], dtype=torch.long)
            
        n = int(train_split * len(data))
        self.data = data[:n] if split == "train" else data[n:]

    def __len__(self):
        return max(0, len(self.data) - self.context_length)

    def __getitem__(self, idx):
        chunk = self.data[idx : idx + self.context_length + 1]
        x = chunk[:-1]
        y = chunk[1:]
        return x, y


def get_dataloaders(batch_size={batch_size}):
    train_dataset = StandaloneTextDataset(split="train")
    val_dataset = StandaloneTextDataset(split="val")
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    return train_loader, val_loader
"""
    elif source == "image_folder" and ds_dict.get("root"):
        root_path = ds_dict.get("root")
        dataset_code = f"""# =============================================================================
# Dataset Loading
# =============================================================================
def get_dataloaders(batch_size={batch_size}):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    dataset_path = "{root_path}"
    if os.path.exists(dataset_path):
        dataset = torchvision.datasets.ImageFolder(root=dataset_path, transform=transform)
        train_size = int(0.8 * len(dataset))
        val_size = len(dataset) - train_size
        train_dataset, val_dataset = torch.utils.data.random_split(dataset, [train_size, val_size])
    else:
        # Fallback to dummy dataset if folder path does not exist
        train_dataset = torchvision.datasets.FakeData(size=100, image_size=(3, 224, 224), num_classes=10, transform=transforms.ToTensor())
        val_dataset = torchvision.datasets.FakeData(size=20, image_size=(3, 224, 224), num_classes=10, transform=transforms.ToTensor())

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    return train_loader, val_loader
"""
    else:
        dataset_code = f"""# =============================================================================
# Dataset Loading
# =============================================================================
def get_dataloaders(batch_size={batch_size}):
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,))
    ])
    
    try:
        dataset_cls = getattr(torchvision.datasets, "{dataset_name}")
        train_dataset = dataset_cls(root='./data', train=True, download=True, transform=transform)
        val_dataset = dataset_cls(root='./data', train=False, download=True, transform=transform)
    except Exception:
        train_dataset = torchvision.datasets.MNIST(root='./data', train=True, download=True, transform=transform)
        val_dataset = torchvision.datasets.MNIST(root='./data', train=False, download=True, transform=transform)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    return train_loader, val_loader
"""

    training_code = f"""# =============================================================================
# Training Pipeline
# =============================================================================
def train():
    device = torch.device("{device}" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {{device}}")
    
    # 1. Load Data
    train_loader, val_loader = get_dataloaders(batch_size={batch_size})
    
    # 2. Instantiate Model
    model = Model().to(device)
    
    # 3. Loss & Optimizer Setup
    try:
        loss_fn = getattr(nn, "{loss_type}")()
    except Exception:
        loss_fn = nn.CrossEntropyLoss()
        
    try:
        opt_cls = getattr(optim, "{opt_type}")
        optimizer = opt_cls(model.parameters(), lr={lr}, weight_decay={weight_decay})
    except Exception:
        optimizer = optim.AdamW(model.parameters(), lr={lr}, weight_decay={weight_decay})
        
    best_loss = float("inf")
    epochs = {epochs}
    
    # 4. Training Loop
    print("Starting training loop...")
    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0
        for batch_idx, (inputs, targets) in enumerate(train_loader):
            inputs, targets = inputs.to(device), targets.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            
            if outputs.dim() == 3 and targets.dim() <= 2:
                outputs = outputs.view(-1, outputs.size(-1))
                targets = targets.view(-1)
                
            loss = loss_fn(outputs, targets)
            loss.backward()
            
            if {clip_norm} > 0:
                nn.utils.clip_grad_norm_(model.parameters(), {clip_norm})
                
            optimizer.step()
            total_loss += loss.item()
            
        avg_train_loss = total_loss / max(1, len(train_loader))
        
        # Validation
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for val_inputs, val_targets in val_loader:
                val_inputs, val_targets = val_inputs.to(device), val_targets.to(device)
                val_outputs = model(val_inputs)
                if val_outputs.dim() == 3 and val_targets.dim() <= 2:
                    val_outputs = val_outputs.view(-1, val_outputs.size(-1))
                    val_targets = val_targets.view(-1)
                loss = loss_fn(val_outputs, val_targets)
                val_loss += loss.item()
                
        avg_val_loss = val_loss / max(1, len(val_loader))
        print(f"Epoch {{epoch}}/{{epochs}} | Train Loss: {{avg_train_loss:.4f}} | Val Loss: {{avg_val_loss:.4f}}")
        
        if avg_val_loss < best_loss:
            best_loss = avg_val_loss
            os.makedirs("checkpoints", exist_ok=True)
            torch.save(model.state_dict(), "checkpoints/best.pt")
            print("  --> Saved best model checkpoint!")

if __name__ == "__main__":
    train()
"""

    return f"""import math
import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import torchvision
import torchvision.transforms as transforms

{custom_code}{model_class_code}

{dataset_code}
{training_code}"""

