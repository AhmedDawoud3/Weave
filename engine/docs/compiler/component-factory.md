# ComponentFactory

::: compiler.factory.ComponentFactory
    options:
      show_source: true

## Overview

`ComponentFactory` uses the **Factory pattern** with a **decorator-based registry** to map node types to PyTorch module builders. It follows the Open/Closed Principle — new layer types can be added by registering a builder function without modifying the core factory logic.

## Class Methods

### `register(node_type)`

Decorator that registers a builder function for a given node type.

```python
@ComponentFactory.register("Conv2d")
def _build_conv2d(node: NodeConfig) -> nn.Module:
    ...
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `node_type` | `str` | The node type string (must match `NodeConfig.type`) |

**Returns:** Decorator function

### `create_layer(node)`

Creates a PyTorch module from a node configuration.

```python
layer = ComponentFactory.create_layer(node)
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `node` | `NodeConfig` | The node configuration |

**Returns:** `nn.Module`

**Raises:**

| Exception | Condition |
|-----------|-----------|
| `NotImplementedError` | Node type not in registry |

## Registered Builders

### Convolution & Pooling

| Node Type | Builder | PyTorch Module |
|-----------|---------|----------------|
| `Conv2d` | `_build_conv2d` | `nn.Conv2d` |
| `MaxPool2d` | `_build_maxpool2d` | `nn.MaxPool2d` |
| `AdaptiveAvgPool2d` | `_build_adaptiveavgpool2d` | `nn.AdaptiveAvgPool2d` |

### Linear & Embedding

| Node Type | Builder | PyTorch Module |
|-----------|---------|----------------|
| `Linear` | `_build_linear` | `nn.Linear` |

### Normalization

| Node Type | Builder | PyTorch Module |
|-----------|---------|----------------|
| `BatchNorm2d` | `_build_batchnorm2d` | `nn.BatchNorm2d` |

### Activations

| Node Type | Builder | PyTorch Module |
|-----------|---------|----------------|
| `ReLU` | `_build_relu` | `nn.ReLU` |
| `GELU` | `_build_gelu` | `nn.GELU` |
| `Softmax` | `_build_softmax` | `nn.Softmax` |

### Shape Manipulation

| Node Type | Builder | PyTorch Module |
|-----------|---------|----------------|
| `Flatten` | `_build_flatten` | `nn.Flatten` |

### Multi-Input Operations

| Node Type | Builder | PyTorch Module |
|-----------|---------|----------------|
| `Add` | `_build_add` | `AddModule` |
| `Concat` | `_build_concat` | `ConcatModule` |
| `Multiply` | `_build_multiply` | `MultiplyModule` |

## Helper Functions

### `_normalize_config(config)`

Extracts and flattens parameters from a config dictionary. Handles both flat schema and nested `params` key.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `dict[str, Any]` | Configuration dictionary with `type` and optional `params` |

**Returns:** `tuple[str, dict[str, Any]]` — (type, flattened_params)

**Raises:**

| Exception | Condition |
|-----------|-----------|
| `ValueError` | Missing or empty `type` field |
| `ValueError` | `params` is not a dictionary |

### `get_loss_function(config)`

Creates a PyTorch loss function from a configuration dictionary.

**Supported losses:** `CrossEntropyLoss`, `MSELoss`

### `get_optimizer(model_params, config)`

Creates a PyTorch optimizer from a configuration dictionary.

**Supported optimizers:** `Adam` (default lr=0.001), `SGD`
