import pytest
import torch.nn as nn
import torch.optim as optim

from compiler.factory import ComponentFactory, get_loss_function, get_optimizer
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


def test_get_loss_function_cross_entropy_flat_config():
    """Test loss mapper supports flat config shape."""
    loss = get_loss_function({"type": "CrossEntropyLoss"})

    assert isinstance(loss, nn.CrossEntropyLoss)


def test_get_loss_function_mse_nested_params():
    """Test loss mapper supports nested params config shape."""
    loss = get_loss_function({"type": "MSELoss", "params": {"reduction": "sum"}})

    assert isinstance(loss, nn.MSELoss)
    assert loss.reduction == "sum"


def test_get_optimizer_adam_default_lr():
    """Test optimizer mapper uses default Adam learning rate when omitted."""
    model = nn.Linear(4, 2)

    optimizer = get_optimizer(model.parameters(), {"type": "Adam"})

    assert isinstance(optimizer, optim.Adam)
    assert optimizer.param_groups[0]["lr"] == pytest.approx(0.001)


def test_get_optimizer_sgd_custom_lr_flat_config():
    """Test optimizer mapper passes through flat optimizer parameters."""
    model = nn.Linear(4, 2)

    optimizer = get_optimizer(
        model.parameters(), {"type": "SGD", "lr": 0.1, "momentum": 0.9}
    )

    assert isinstance(optimizer, optim.SGD)
    assert optimizer.param_groups[0]["lr"] == pytest.approx(0.1)
    assert optimizer.param_groups[0]["momentum"] == pytest.approx(0.9)


def test_get_optimizer_adam_nested_params():
    """Test optimizer mapper supports nested params config shape."""
    model = nn.Linear(4, 2)

    optimizer = get_optimizer(
        model.parameters(), {"type": "Adam", "params": {"lr": 0.01}}
    )

    assert isinstance(optimizer, optim.Adam)
    assert optimizer.param_groups[0]["lr"] == pytest.approx(0.01)


def test_get_loss_function_missing_type_raises():
    """Test loss mapper raises for missing type."""
    with pytest.raises(ValueError, match="type"):
        get_loss_function({})


def test_get_optimizer_missing_type_raises():
    """Test optimizer mapper raises for missing type."""
    model = nn.Linear(4, 2)

    with pytest.raises(ValueError, match="type"):
        get_optimizer(model.parameters(), {})


def test_get_loss_function_unsupported_type_raises():
    """Test loss mapper raises for unsupported type."""
    with pytest.raises(ValueError, match="Unsupported loss type"):
        get_loss_function({"type": "BCEWithLogitsLoss"})


def test_get_optimizer_unsupported_type_raises():
    """Test optimizer mapper raises for unsupported type."""
    model = nn.Linear(4, 2)

    with pytest.raises(ValueError, match="Unsupported optimizer type"):
        get_optimizer(model.parameters(), {"type": "RMSprop"})
