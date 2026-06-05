import torch
import torch.nn as nn

from compiler.compiler import GraphCompiler
from compiler.modules import (
    ChannelScaleBias,
    DivModule,
    MatMulModule,
    MeanModule,
    ReshapeModule,
    ScaleModule,
    SliceModule,
    SqrtModule,
    SubModule,
    VarModule,
)
from schemas import GraphConfig


def _copy_param(dest_module: nn.Module, param_name: str, src_tensor: torch.Tensor, reshape_to_4d: bool = False) -> None:
    param = getattr(dest_module, param_name)
    assert isinstance(param, torch.Tensor)
    if reshape_to_4d:
        param.copy_(src_tensor.view(1, -1, 1, 1))
    else:
        param.copy_(src_tensor)


def test_math_modules():
    # Sub
    sub = SubModule()
    assert torch.allclose(sub([torch.tensor(5.0), torch.tensor(2.0)]), torch.tensor(3.0))

    # Div
    div = DivModule()
    assert torch.allclose(div([torch.tensor(6.0), torch.tensor(2.0)]), torch.tensor(3.0))

    # Sqrt
    sqrt = SqrtModule(eps=1e-5)
    assert torch.allclose(sqrt(torch.tensor(4.0 - 1e-5)), torch.tensor(2.0))

    # Mean
    mean = MeanModule(dim=[0])
    assert torch.allclose(mean(torch.tensor([1.0, 3.0])), torch.tensor(2.0))

    # Var
    var = VarModule(dim=[0], unbiased=False)
    # var of [1, 3] with unbiased=False is 1.0
    assert torch.allclose(var(torch.tensor([1.0, 3.0])), torch.tensor(1.0))

    # MatMul
    matmul = MatMulModule()
    t1 = torch.tensor([[1.0, 2.0]])
    t2 = torch.tensor([[3.0], [4.0]])
    assert torch.allclose(matmul([t1, t2]), torch.tensor([[11.0]]))

    # Scale
    scale = ScaleModule(value=2.5)
    assert torch.allclose(scale(torch.tensor(4.0)), torch.tensor(10.0))

    # ChannelScaleBias
    csb = ChannelScaleBias(num_features=3)
    t = torch.ones(2, 3, 4, 4)
    # default weight=1, bias=0
    assert torch.allclose(csb(t), t)

    # Slice
    slice_mod = SliceModule(dim=1, index=1)
    t = torch.tensor([[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]])
    assert torch.allclose(slice_mod(t), torch.tensor([2.0, 5.0]))

    # Reshape
    reshape_mod = ReshapeModule(target_shape=[-1, 3, 2])
    t_reshape = torch.randn(2, 6)
    assert reshape_mod(t_reshape).shape == (2, 3, 2)



def test_batchnorm_manually_built_graph():
    # Construct a manual Batch Norm 2D graph configuration!
    # Input -> Mean -> mean
    # Input, mean -> Sub -> x_sub
    # Input -> Var -> var
    # var -> Sqrt (eps=1e-5) -> std
    # x_sub, std -> Div -> x_norm
    # x_norm -> ChannelScaleBias -> Output
    graph_dict = {
        "nodes": [
            {"id": "mean", "type": "Mean", "params": {"dim": [0, 2, 3], "keepdim": True}},
            {"id": "x_sub", "type": "Sub", "params": {}},
            {"id": "var", "type": "Var", "params": {"dim": [0, 2, 3], "keepdim": True, "unbiased": False}},
            {"id": "std", "type": "Sqrt", "params": {"eps": 1e-5}},
            {"id": "x_norm", "type": "Div", "params": {}},
            {"id": "scale_bias", "type": "ChannelScaleBias", "params": {"num_features": 3}},
        ],
        "edges": [
            {"source": "input", "target": "mean"},
            {"source": "input", "target": "x_sub"},
            {"source": "mean", "target": "x_sub"},
            {"source": "input", "target": "var"},
            {"source": "var", "target": "std"},
            {"source": "x_sub", "target": "x_norm"},
            {"source": "std", "target": "x_norm"},
            {"source": "x_norm", "target": "scale_bias"},
            {"source": "scale_bias", "target": "output"},
        ]
    }

    compiler = GraphCompiler()
    res = compiler.validate_pipeline(GraphConfig.model_validate(graph_dict), [2, 3, 4, 4])
    assert res["status"] == "success"
    assert res["node_shapes"]["output"] == [2, 3, 4, 4]

    # Compile the WeaveBlock
    block = compiler.compile(GraphConfig.model_validate(graph_dict))

    # Instantiate PyTorch equivalent in training mode (biased var, eps=1e-5)
    import torch.nn as nn
    pt_bn = nn.BatchNorm2d(num_features=3, eps=1e-5)
    pt_bn.train()

    # Align/copy parameters
    with torch.no_grad():
        _copy_param(block.operations["scale_bias"], "weight", pt_bn.weight, reshape_to_4d=True)
        _copy_param(block.operations["scale_bias"], "bias", pt_bn.bias, reshape_to_4d=True)

    # Run forward pass and compare
    x = torch.randn(2, 3, 4, 4)
    y_weave = block(x)
    y_pt = pt_bn(x)

    assert torch.allclose(y_weave, y_pt, atol=1e-5)


def test_attention_manually_built_graph():
    # Construct a manual attention graph configuration!
    graph_dict = {
        "nodes": [
            {"id": "q_proj", "type": "Linear", "params": {"in_features": 8, "out_features": 8}},
            {"id": "k_proj", "type": "Linear", "params": {"in_features": 8, "out_features": 8}},
            {"id": "v_proj", "type": "Linear", "params": {"in_features": 8, "out_features": 8}},
            {"id": "k_trans", "type": "Permute", "params": {"dims": [0, 2, 1]}},
            {"id": "scores", "type": "MatMul", "params": {}},
            {"id": "scaled_scores", "type": "Scale", "params": {"value": 0.35355339}},
            {"id": "attn_weights", "type": "Softmax", "params": {"dim": -1}},
            {"id": "context", "type": "MatMul", "params": {}},
            {"id": "out_proj", "type": "Linear", "params": {"in_features": 8, "out_features": 8}},
        ],
        "edges": [
            {"source": "input", "target": "q_proj"},
            {"source": "input", "target": "k_proj"},
            {"source": "input", "target": "v_proj"},
            {"source": "k_proj", "target": "k_trans"},
            {"source": "q_proj", "target": "scores"},
            {"source": "k_trans", "target": "scores"},
            {"source": "scores", "target": "scaled_scores"},
            {"source": "scaled_scores", "target": "attn_weights"},
            {"source": "attn_weights", "target": "context"},
            {"source": "v_proj", "target": "context"},
            {"source": "context", "target": "out_proj"},
            {"source": "out_proj", "target": "output"},
        ]
    }

    compiler = GraphCompiler()
    res = compiler.validate_pipeline(GraphConfig.model_validate(graph_dict), [2, 5, 8])
    assert res["status"] == "success"
    assert res["node_shapes"]["output"] == [2, 5, 8]

    # Compile the WeaveBlock
    block = compiler.compile(GraphConfig.model_validate(graph_dict))

    # Reference PyTorch linear layers
    import torch.nn as nn
    q_proj = nn.Linear(8, 8)
    k_proj = nn.Linear(8, 8)
    v_proj = nn.Linear(8, 8)
    out_proj = nn.Linear(8, 8)

    # Copy parameters
    with torch.no_grad():
        _copy_param(block.operations["q_proj"], "weight", q_proj.weight)
        _copy_param(block.operations["q_proj"], "bias", q_proj.bias)
        _copy_param(block.operations["k_proj"], "weight", k_proj.weight)
        _copy_param(block.operations["k_proj"], "bias", k_proj.bias)
        _copy_param(block.operations["v_proj"], "weight", v_proj.weight)
        _copy_param(block.operations["v_proj"], "bias", v_proj.bias)
        _copy_param(block.operations["out_proj"], "weight", out_proj.weight)
        _copy_param(block.operations["out_proj"], "bias", out_proj.bias)

    x = torch.randn(2, 5, 8)
    y_weave = block(x)

    # Reference PyTorch calculation
    q = q_proj(x)
    k = k_proj(x)
    v = v_proj(x)
    scores = torch.matmul(q, k.transpose(2, 1)) * 0.35355339
    attn = torch.softmax(scores, dim=-1)
    context = torch.matmul(attn, v)
    y_pt = out_proj(context)

    assert torch.allclose(y_weave, y_pt, atol=1e-5)


def test_rnn_manually_built_graph():
    # Construct an unrolled manual RNN graph configuration (T=3)!
    graph_dict = {
        "nodes": [
            {"id": "slice_0", "type": "Slice", "params": {"dim": 1, "index": 0}},
            {"id": "slice_1", "type": "Slice", "params": {"dim": 1, "index": 1}},
            {"id": "slice_2", "type": "Slice", "params": {"dim": 1, "index": 2}},
            {"id": "i2h_0", "type": "Linear", "params": {"in_features": 4, "out_features": 6}},
            {"id": "h0", "type": "Tanh", "params": {}},
            {"id": "i2h_1", "type": "Linear", "params": {"in_features": 4, "out_features": 6}},
            {"id": "h2h_1", "type": "Linear", "params": {"in_features": 6, "out_features": 6}},
            {"id": "add_1", "type": "Add", "params": {}},
            {"id": "h1", "type": "Tanh", "params": {}},
            {"id": "i2h_2", "type": "Linear", "params": {"in_features": 4, "out_features": 6}},
            {"id": "h2h_2", "type": "Linear", "params": {"in_features": 6, "out_features": 6}},
            {"id": "add_2", "type": "Add", "params": {}},
            {"id": "h2", "type": "Tanh", "params": {}},
            {"id": "concat_h", "type": "Concat", "params": {"dim": 1}},
            {"id": "reshape_out", "type": "Reshape", "params": {"target_shape": [-1, 3, 6]}},
        ],
        "edges": [
            {"source": "input", "target": "slice_0"},
            {"source": "input", "target": "slice_1"},
            {"source": "input", "target": "slice_2"},
            {"source": "slice_0", "target": "i2h_0"},
            {"source": "i2h_0", "target": "h0"},
            {"source": "slice_1", "target": "i2h_1"},
            {"source": "h0", "target": "h2h_1"},
            {"source": "i2h_1", "target": "add_1"},
            {"source": "h2h_1", "target": "add_1"},
            {"source": "add_1", "target": "h1"},
            {"source": "slice_2", "target": "i2h_2"},
            {"source": "h1", "target": "h2h_2"},
            {"source": "i2h_2", "target": "add_2"},
            {"source": "h2h_2", "target": "add_2"},
            {"source": "add_2", "target": "h2"},
            {"source": "h0", "target": "concat_h"},
            {"source": "h1", "target": "concat_h"},
            {"source": "h2", "target": "concat_h"},
            {"source": "concat_h", "target": "reshape_out"},
            {"source": "reshape_out", "target": "output"},
        ]
    }

    compiler = GraphCompiler()
    res = compiler.validate_pipeline(GraphConfig.model_validate(graph_dict), [2, 3, 4])
    assert res["status"] == "success"
    assert res["node_shapes"]["output"] == [2, 3, 6]

    # Compile the WeaveBlock
    block = compiler.compile(GraphConfig.model_validate(graph_dict))

    # Reference PyTorch linear layers
    import torch.nn as nn
    i2h_0 = nn.Linear(4, 6)
    i2h_1 = nn.Linear(4, 6)
    i2h_2 = nn.Linear(4, 6)
    h2h_1 = nn.Linear(6, 6)
    h2h_2 = nn.Linear(6, 6)

    # Share weights
    with torch.no_grad():
        _copy_param(block.operations["i2h_0"], "weight", i2h_0.weight)
        _copy_param(block.operations["i2h_0"], "bias", i2h_0.bias)
        _copy_param(block.operations["i2h_1"], "weight", i2h_1.weight)
        _copy_param(block.operations["i2h_1"], "bias", i2h_1.bias)
        _copy_param(block.operations["i2h_2"], "weight", i2h_2.weight)
        _copy_param(block.operations["i2h_2"], "bias", i2h_2.bias)
        _copy_param(block.operations["h2h_1"], "weight", h2h_1.weight)
        _copy_param(block.operations["h2h_1"], "bias", h2h_1.bias)
        _copy_param(block.operations["h2h_2"], "weight", h2h_2.weight)
        _copy_param(block.operations["h2h_2"], "bias", h2h_2.bias)

    x = torch.randn(2, 3, 4)
    y_weave = block(x)

    # PyTorch reference calculation step by step
    x0 = x[:, 0, :]
    x1 = x[:, 1, :]
    x2 = x[:, 2, :]

    h0 = torch.tanh(i2h_0(x0))
    h1 = torch.tanh(i2h_1(x1) + h2h_1(h0))
    h2 = torch.tanh(i2h_2(x2) + h2h_2(h1))

    concat_h = torch.cat([h0, h1, h2], dim=1)
    y_pt = concat_h.reshape(-1, 3, 6)

    assert torch.allclose(y_weave, y_pt, atol=1e-5)


def test_manual_tanh_module():
    from compiler.modules import TanhModule
    t = TanhModule()
    x = torch.tensor([0.0, 1.0, -1.0], requires_grad=True)
    y = t(x)
    # Check forward values
    assert torch.allclose(y, torch.tanh(x))

    # Check backward pass derivative calculation
    y.sum().backward()
    expected_grad = 1.0 - torch.tanh(x) ** 2
    assert x.grad is not None
    assert torch.allclose(x.grad, expected_grad)


def test_custom_autograd_module():
    from compiler.modules import CustomAutogradModule
    # Define a custom square function with 2x derivative
    forward_code = "def forward(x):\n    return x * x"
    backward_code = "def backward(x, y, grad_output):\n    return grad_output * 2.0 * x"

    m = CustomAutogradModule(forward_code=forward_code, backward_code=backward_code)
    x = torch.tensor([2.0, 3.0], requires_grad=True)
    y = m(x)
    assert torch.allclose(y, torch.tensor([4.0, 9.0]))

    y.sum().backward()
    assert x.grad is not None
    assert torch.allclose(x.grad, torch.tensor([4.0, 6.0]))


def test_linear_auto_flatten_conditions():
    from compiler.block import WeaveBlock
    from schemas import LinearNode, LinearParams

    # 3D sequence input that shouldn't be flattened because in_features == input.shape[-1]
    node = LinearNode(id="fc", type="Linear", params=LinearParams(in_features=8, out_features=12))
    block = WeaveBlock(
        exec_order=["input", "fc", "output"],
        node_map={"fc": node},
        incoming_edges={"fc": ["input"], "output": ["fc"]}
    )
    x = torch.randn(2, 5, 8)
    out = block(x)
    assert out.shape == (2, 5, 12)

    # 4D image input that SHOULD be flattened because in_features != input.shape[-1]
    node_img = LinearNode(id="fc_img", type="Linear", params=LinearParams(in_features=48, out_features=10))
    block_img = WeaveBlock(
        exec_order=["input", "fc_img", "output"],
        node_map={"fc_img": node_img},
        incoming_edges={"fc_img": ["input"], "output": ["fc_img"]}
    )
    x_img = torch.randn(2, 3, 4, 4)  # 3 * 4 * 4 = 48
    out_img = block_img(x_img)
    assert out_img.shape == (2, 10)


