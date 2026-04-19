import pytest
import torch
from compiler.block import WeaveBlock
from schemas import LinearNode, LinearParams, ReLUNode, ReLUParams


def create_simple_feedforward_dag():
    """Create a minimal valid linear-relu feedforward graph."""
    node_map = {
        "fc1": LinearNode(
            id="fc1", type="Linear", params=LinearParams(in_features=10, out_features=5)
        ),
        "relu1": ReLUNode(id="relu1", type="ReLU", params=ReLUParams()),
        "fc2": LinearNode(
            id="fc2", type="Linear", params=LinearParams(in_features=5, out_features=2)
        ),
    }

    exec_order = ["input", "fc1", "relu1", "fc2", "output"]
    incoming_edges = {
        "fc1": ["input"],
        "relu1": ["fc1"],
        "fc2": ["relu1"],
        "output": ["fc2"],
    }

    return node_map, exec_order, incoming_edges


def test_weavblock_initialization():
    """Ensure components are loaded correctly into the WeaveBlock operations dict."""
    node_map, exec_order, incoming_edges = create_simple_feedforward_dag()
    block = WeaveBlock(exec_order, node_map, incoming_edges)

    assert "fc1" in block.operations
    assert "relu1" in block.operations
    assert "fc2" in block.operations

    assert isinstance(block.operations["fc1"], torch.nn.Linear)
    assert isinstance(block.operations["relu1"], torch.nn.ReLU)


def test_weavblock_forward_pass():
    """Test standard forward execution on a valid DAG."""
    node_map, exec_order, incoming_edges = create_simple_feedforward_dag()
    block = WeaveBlock(exec_order, node_map, incoming_edges)

    input_tensor = torch.rand(4, 10)  # batch_size=4, features=10
    output_tensor = block(input_tensor)

    assert output_tensor.shape == (4, 2)


def test_missing_output_node_raises_error():
    """Test WeaveBlock correctly detects dead-end flow with no 'output'."""
    node_map, exec_order, incoming_edges = create_simple_feedforward_dag()
    # Remove 'output' element
    exec_order.remove("output")

    block = WeaveBlock(exec_order, node_map, incoming_edges)
    input_tensor = torch.rand(4, 10)

    with pytest.raises(RuntimeError) as exc_info:
        block(input_tensor)

    assert "Reached end of forward pass without hitting 'output' node" in str(
        exc_info.value
    )
