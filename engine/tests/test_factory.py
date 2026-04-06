import pytest
import torch.nn as nn
from compiler.factory import ComponentFactory
from schemas import (
    Conv2dNode,
    Conv2dParams,
    LinearNode,
    LinearParams,
    ReLUNode,
    ReLUParams,
)


def test_factory_creates_conv2d():
    """Test ComponentFactory correctly builds a Conv2d layer."""
    params = Conv2dParams(
        in_channels=3, out_channels=16, kernel_size=3, stride=1, padding=1, bias=True
    )
    node = Conv2dNode(id="conv1", type="Conv2d", params=params)

    layer = ComponentFactory.create_layer(node)

    assert isinstance(layer, nn.Conv2d)
    assert layer.in_channels == 3
    assert layer.out_channels == 16
    assert layer.kernel_size == (3, 3)
    assert layer.bias is not None


def test_factory_creates_linear():
    """Test ComponentFactory correctly builds a Linear layer."""
    params = LinearParams(in_features=64, out_features=10)
    node = LinearNode(id="fc1", type="Linear", params=params)

    layer = ComponentFactory.create_layer(node)

    assert isinstance(layer, nn.Linear)
    assert layer.in_features == 64
    assert layer.out_features == 10


def test_factory_creates_relu():
    """Test ComponentFactory correctly builds a ReLU layer."""
    params = ReLUParams(inplace=True)
    node = ReLUNode(id="relu1", type="ReLU", params=params)

    layer = ComponentFactory.create_layer(node)

    assert isinstance(layer, nn.ReLU)
    assert layer.inplace is True


def test_factory_unimplemented_type():
    """Test factory raises NotImplementedError for unknown layer types."""

    # A dummy mock type to trigger NotImplementedError
    class DummyNode:
        type = "NonExistent"

    with pytest.raises(NotImplementedError) as exc_info:
        ComponentFactory.create_layer(DummyNode())

    assert "Compilation for layer type NonExistent is not yet implemented." in str(
        exc_info.value
    )
