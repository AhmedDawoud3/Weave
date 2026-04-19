import pytest
from compiler.compiler import GraphCompiler
from schemas import GraphConfig


@pytest.fixture
def compiler():
    return GraphCompiler()


def test_validate_pipeline_success(compiler):
    graph_data = {
        "nodes": [
            {
                "id": "conv1",
                "type": "Conv2d",
                "params": {
                    "in_channels": 3,
                    "out_channels": 16,
                    "kernel_size": 3,
                    "stride": 1,
                    "padding": 1,
                },
            },
            {"id": "relu1", "type": "ReLU", "params": {}},
        ],
        "edges": [
            {"source": "input", "target": "conv1"},
            {"source": "conv1", "target": "relu1"},
            {"source": "relu1", "target": "output"},
        ],
    }
    graph = GraphConfig(**graph_data)
    input_shape = [1, 3, 32, 32]

    result = compiler.validate_pipeline(graph, input_shape)

    assert result["status"] == "success"
    assert "node_shapes" in result

    shapes = result["node_shapes"]
    assert shapes["input"] == [1, 3, 32, 32]
    assert shapes["conv1"] == [1, 16, 32, 32]
    assert shapes["relu1"] == [1, 16, 32, 32]
    assert shapes["output"] == [1, 16, 32, 32]


def test_validate_pipeline_shape_mismatch(compiler):
    graph_data = {
        "nodes": [
            {
                "id": "fc1",
                "type": "Linear",
                "params": {"in_features": 128, "out_features": 64},
            }
        ],
        "edges": [
            {"source": "input", "target": "fc1"},
            {"source": "fc1", "target": "output"},
        ],
    }
    graph = GraphConfig(**graph_data)
    # Give it an input tensor that doesn't match the in_features (64 vs 128)
    input_shape = [32, 64]

    result = compiler.validate_pipeline(graph, input_shape)

    assert result["status"] == "error"
    assert "message" in result
    assert "Shape mismatch" in result["message"]
    assert "fc1" in result["message"]
