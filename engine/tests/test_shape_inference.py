"""
Tests for GraphCompiler.infer_layer_shape — single layer shape inference.
"""

import pytest

from compiler.compiler import GraphCompiler
from schemas import (
    AddNode,
    AddParams,
    ConcatNode,
    ConcatParams,
    Conv2dNode,
    Conv2dParams,
    FlattenNode,
    FlattenParams,
    LinearNode,
    LinearParams,
    MaxPool2dNode,
    MaxPool2dParams,
    ReLUNode,
    ReLUParams,
)


@pytest.fixture
def compiler():
    return GraphCompiler()


# ---------------------------------------------------------------------------
# Single-input layers
# ---------------------------------------------------------------------------


def test_infer_conv2d_shape(compiler):
    node = Conv2dNode(
        id="conv1",
        type="Conv2d",
        params=Conv2dParams(
            in_channels=3, out_channels=16, kernel_size=3, stride=1, padding=1
        ),
    )
    result = compiler.infer_layer_shape(node, input_shape=[1, 3, 32, 32])

    assert result["status"] == "success"
    assert result["output_shape"] == [1, 16, 32, 32]


def test_infer_conv2d_no_padding(compiler):
    node = Conv2dNode(
        id="conv1",
        type="Conv2d",
        params=Conv2dParams(
            in_channels=3, out_channels=64, kernel_size=5, stride=2, padding=0
        ),
    )
    result = compiler.infer_layer_shape(node, input_shape=[1, 3, 224, 224])

    assert result["status"] == "success"
    # floor((224 - 5) / 2) + 1 = 110
    assert result["output_shape"] == [1, 64, 110, 110]


def test_infer_linear_shape(compiler):
    node = LinearNode(
        id="fc1", type="Linear", params=LinearParams(in_features=128, out_features=64)
    )
    result = compiler.infer_layer_shape(node, input_shape=[32, 128])

    assert result["status"] == "success"
    assert result["output_shape"] == [32, 64]


def test_infer_relu_shape(compiler):
    node = ReLUNode(id="relu1", type="ReLU", params=ReLUParams())
    result = compiler.infer_layer_shape(node, input_shape=[1, 16, 32, 32])

    assert result["status"] == "success"
    assert result["output_shape"] == [1, 16, 32, 32]


def test_infer_flatten_shape(compiler):
    node = FlattenNode(id="flat1", type="Flatten", params=FlattenParams(start_dim=1))
    result = compiler.infer_layer_shape(node, input_shape=[32, 16, 8, 8])

    assert result["status"] == "success"
    assert result["output_shape"] == [32, 1024]  # 16 * 8 * 8 = 1024


def test_infer_maxpool2d_shape(compiler):
    node = MaxPool2dNode(
        id="pool1", type="MaxPool2d", params=MaxPool2dParams(kernel_size=2, stride=2)
    )
    result = compiler.infer_layer_shape(node, input_shape=[1, 16, 32, 32])

    assert result["status"] == "success"
    assert result["output_shape"] == [1, 16, 16, 16]


# ---------------------------------------------------------------------------
# Multi-input layers
# ---------------------------------------------------------------------------


def test_infer_add_shape(compiler):
    node = AddNode(id="add1", type="Add", params=AddParams())
    result = compiler.infer_layer_shape(
        node, input_shapes=[[1, 16, 32, 32], [1, 16, 32, 32]]
    )

    assert result["status"] == "success"
    assert result["output_shape"] == [1, 16, 32, 32]


def test_infer_concat_shape(compiler):
    node = ConcatNode(id="cat1", type="Concat", params=ConcatParams(dim=1))
    result = compiler.infer_layer_shape(
        node, input_shapes=[[1, 16, 32, 32], [1, 32, 32, 32]]
    )

    assert result["status"] == "success"
    assert result["output_shape"] == [1, 48, 32, 32]  # 16 + 32 = 48


def test_infer_add_missing_input_shapes(compiler):
    node = AddNode(id="add1", type="Add", params=AddParams())
    result = compiler.infer_layer_shape(node, input_shape=[1, 16, 32, 32])

    assert result["status"] == "error"
    assert "input_shapes" in result["message"]


# ---------------------------------------------------------------------------
# Error cases
# ---------------------------------------------------------------------------


def test_infer_layer_shape_mismatch(compiler):
    node = LinearNode(
        id="fc1", type="Linear", params=LinearParams(in_features=128, out_features=64)
    )
    # Input has 64 features but layer expects 128
    result = compiler.infer_layer_shape(node, input_shape=[32, 64])

    assert result["status"] == "error"
    assert "Shape mismatch" in result["message"]


def test_infer_layer_missing_input_shape(compiler):
    node = ReLUNode(id="relu1", type="ReLU", params=ReLUParams())
    result = compiler.infer_layer_shape(node)

    assert result["status"] == "error"
    assert "input_shape" in result["message"]


def test_infer_layer_oom_guard(compiler):
    node = ReLUNode(id="relu1", type="ReLU", params=ReLUParams())
    # 100001 * 100000 = 10 billion elements > 100M limit
    result = compiler.infer_layer_shape(node, input_shape=[100001, 100000])

    assert result["status"] == "error"
    assert "too large" in result["message"].lower()


def test_infer_multi_input_oom_guard(compiler):
    node = AddNode(id="add1", type="Add", params=AddParams())
    result = compiler.infer_layer_shape(
        node, input_shapes=[[100001, 100000], [100001, 100000]]
    )

    assert result["status"] == "error"
    assert "too large" in result["message"].lower()


# ---------------------------------------------------------------------------
# Block nodes
# ---------------------------------------------------------------------------


def test_infer_block_node_shape(compiler):
    """Block nodes delegate to validate_pipeline on their nested graph."""
    from schemas import EdgeConfig, GraphConfig

    subgraph = GraphConfig(
        nodes=[
            Conv2dNode(
                id="conv1",
                type="Conv2d",
                params=Conv2dParams(
                    in_channels=3, out_channels=16, kernel_size=3, stride=1, padding=1
                ),
            ),
            ReLUNode(id="relu1", type="ReLU", params=ReLUParams()),
        ],
        edges=[
            EdgeConfig(source="input", target="conv1"),
            EdgeConfig(source="conv1", target="relu1"),
            EdgeConfig(source="relu1", target="output"),
        ],
    )

    from schemas import CustomBlockNode

    node = CustomBlockNode(id="block1", type="Block", graph=subgraph)
    result = compiler.infer_layer_shape(node, input_shape=[1, 3, 32, 32])

    assert result["status"] == "success"
    assert result["output_shape"] == [1, 16, 32, 32]


def test_infer_block_node_missing_graph(compiler):
    # Manually construct without graph — but Pydantic requires it.
    # Instead test with a node type in BLOCK_TYPES but missing input_shape
    from schemas import CustomBlockNode, EdgeConfig, GraphConfig

    subgraph = GraphConfig(
        nodes=[
            ReLUNode(id="relu1", type="ReLU", params=ReLUParams()),
        ],
        edges=[
            EdgeConfig(source="input", target="relu1"),
            EdgeConfig(source="relu1", target="output"),
        ],
    )

    node = CustomBlockNode(id="block1", type="Block", graph=subgraph)
    result = compiler.infer_layer_shape(node)  # No input_shape

    assert result["status"] == "error"
    assert "input_shape" in result["message"]
