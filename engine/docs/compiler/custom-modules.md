# Custom Modules

::: compiler.modules
    options:
      show_source: true

## Overview

Three custom `nn.Module` wrappers for multi-input operations that don't have direct PyTorch equivalents accepting lists of tensors.

## AddModule

Element-wise addition of multiple input tensors.

```python
class AddModule(nn.Module):
    def forward(self, inputs: list[torch.Tensor]) -> torch.Tensor
```

**Behavior:**

- Takes a list of tensors
- Sums them element-wise: `inputs[0] + inputs[1] + ... + inputs[n]`
- All tensors must have the same shape (broadcastable)

**Raises:** `ValueError` if `inputs` is empty

## ConcatModule

Concatenation of multiple input tensors along a specified dimension.

```python
class ConcatModule(nn.Module):
    def __init__(self, dim: int)
    def forward(self, inputs: list[torch.Tensor]) -> torch.Tensor
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `dim` | `int` | — | Dimension along which to concatenate |

**Behavior:**

- Takes a list of tensors
- Concatenates them: `torch.cat(inputs, dim=self.dim)`
- All tensors must have the same shape except along the concatenation dimension

**Raises:** `ValueError` if `inputs` is empty

## MultiplyModule

Element-wise multiplication of multiple input tensors.

```python
class MultiplyModule(nn.Module):
    def forward(self, inputs: list[torch.Tensor]) -> torch.Tensor
```

**Behavior:**

- Takes a list of tensors
- Multiplies them element-wise: `inputs[0] * inputs[1] * ... * inputs[n]`
- All tensors must have the same shape (broadcastable)

**Raises:** `ValueError` if `inputs` is empty

## Usage in Graphs

These modules are created by the `ComponentFactory` when it encounters `Add`, `Concat`, or `Multiply` node types. During the forward pass in `WeaveBlock`, they receive a **list of tensors** instead of a single tensor:

```python
# In WeaveBlock.forward()
if isinstance(layer, (AddModule, ConcatModule)):
    out = layer(input_tensors)  # list of tensors
else:
    out = layer(input_tensors[0])  # single tensor
```
