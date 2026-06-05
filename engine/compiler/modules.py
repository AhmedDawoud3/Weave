from typing import Any

import torch
import torch.nn as nn


class AddModule(nn.Module):
    """Wrapper for node 'Add' that sums multiple inputs."""

    def forward(self, inputs: list[torch.Tensor]) -> torch.Tensor:
        if not inputs:
            raise ValueError("AddModule requires at least one input tensor.")

        result = inputs[0]
        for t in inputs[1:]:
            result = result + t
        return result


class ConcatModule(nn.Module):
    """Wrapper for node 'Concat' that concatenates multiple inputs."""

    def __init__(self, dim: int):
        super().__init__()
        self.dim = dim

    def forward(self, inputs: list[torch.Tensor]) -> torch.Tensor:
        if not inputs:
            raise ValueError("ConcatModule requires at least one input tensor.")
        return torch.cat(inputs, dim=self.dim)


class MultiplyModule(nn.Module):
    """Wrapper for node 'Multiply' that multiplies multiple inputs element-wise."""

    def forward(self, inputs: list[torch.Tensor]) -> torch.Tensor:
        if not inputs:
            raise ValueError("MultiplyModule requires at least one input tensor.")

        result = inputs[0]
        for t in inputs[1:]:
            result = result * t
        return result


class SubModule(nn.Module):
    """Wrapper for node 'Sub' that computes inputs[0] - inputs[1]."""

    def forward(self, inputs: list[torch.Tensor]) -> torch.Tensor:
        if len(inputs) != 2:
            raise ValueError("SubModule requires exactly two input tensors.")
        return inputs[0] - inputs[1]


class DivModule(nn.Module):
    """Wrapper for node 'Div' that computes inputs[0] / inputs[1]."""

    def forward(self, inputs: list[torch.Tensor]) -> torch.Tensor:
        if len(inputs) != 2:
            raise ValueError("DivModule requires exactly two input tensors.")
        return inputs[0] / inputs[1]


class SqrtModule(nn.Module):
    """Wrapper for node 'Sqrt' that computes element-wise square root with optional eps."""

    def __init__(self, eps: float = 0.0):
        super().__init__()
        self.eps = eps

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self.eps != 0.0:
            return torch.sqrt(x + self.eps)
        return torch.sqrt(x)


class MeanModule(nn.Module):
    """Computes mean along specified dimensions."""

    def __init__(self, dim: list[int], keepdim: bool = True):
        super().__init__()
        self.dim = dim
        self.keepdim = keepdim

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x.mean(dim=self.dim, keepdim=self.keepdim)


class VarModule(nn.Module):
    """Computes variance along specified dimensions."""

    def __init__(self, dim: list[int], keepdim: bool = True, unbiased: bool = False):
        super().__init__()
        self.dim = dim
        self.keepdim = keepdim
        self.unbiased = unbiased

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x.var(dim=self.dim, keepdim=self.keepdim, unbiased=self.unbiased)


class MatMulModule(nn.Module):
    """Computes matrix multiplication of two input tensors."""

    def forward(self, inputs: list[torch.Tensor]) -> torch.Tensor:
        if len(inputs) != 2:
            raise ValueError("MatMulModule requires exactly two input tensors.")
        return torch.matmul(inputs[0], inputs[1])


class ScaleModule(nn.Module):
    """Multiplies input by a constant float scale."""

    def __init__(self, value: float):
        super().__init__()
        self.value = value

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x * self.value


class ChannelScaleBias(nn.Module):
    """Applies weight scaling and bias shifting per channel."""

    def __init__(self, num_features: int):
        super().__init__()
        self.num_features = num_features
        self.weight = nn.Parameter(torch.ones(1, num_features, 1, 1))
        self.bias = nn.Parameter(torch.zeros(1, num_features, 1, 1))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x * self.weight + self.bias


class SliceModule(nn.Module):
    """Selects/slices a tensor along a specific dimension at a specific index."""

    def __init__(self, dim: int, index: int):
        super().__init__()
        self.dim = dim
        self.index = index

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x.select(self.dim, self.index)


class PermuteModule(nn.Module):
    """Permutes the dimensions of the input tensor."""

    def __init__(self, dims: list[int]):
        super().__init__()
        self.dims = dims

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x.permute(*self.dims)


class TanhFunction(torch.autograd.Function):
    """Manual Tanh implementation specifying forward pass and backward pass derivative."""

    @staticmethod
    def forward(ctx, x: torch.Tensor) -> torch.Tensor:
        y = torch.tanh(x)
        ctx.save_for_backward(y)
        return y

    @staticmethod
    def backward(ctx: Any, *grad_outputs: Any) -> Any:
        grad_output = grad_outputs[0]
        y, = ctx.saved_tensors
        # Tanh derivative is 1 - y^2
        grad_input = grad_output * (1.0 - y * y)
        return grad_input


class TanhModule(nn.Module):
    """Module wrapper for manual TanhFunction."""

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return TanhFunction.apply(x)


class CustomAutogradFunction(torch.autograd.Function):
    """Generic autograd function invoking user-defined Python functions for forward and backward passes."""

    @staticmethod
    def forward(ctx, x: torch.Tensor, forward_fn, backward_fn) -> torch.Tensor:
        ctx.backward_fn = backward_fn
        y = forward_fn(x)
        ctx.save_for_backward(x, y)
        return y

    @staticmethod
    def backward(ctx: Any, *grad_outputs: Any) -> Any:
        grad_output = grad_outputs[0]
        x, y = ctx.saved_tensors
        backward_fn = ctx.backward_fn
        grad_input = backward_fn(x, y, grad_output)
        return grad_input, None, None


class CustomAutogradModule(nn.Module):
    """Module compiling dynamic forward/backward code blocks."""

    def __init__(self, forward_code: str, backward_code: str):
        super().__init__()
        self.forward_code = forward_code
        self.backward_code = backward_code

        # Compile forward
        loc_f = {}
        exec(forward_code, globals(), loc_f)
        self.forward_fn = loc_f.get("forward")

        # Compile backward
        loc_b = {}
        exec(backward_code, globals(), loc_b)
        self.backward_fn = loc_b.get("backward")

        if self.forward_fn is None:
            raise ValueError("forward_code must define a 'forward' function, e.g., 'def forward(x): return x.tanh()'")
        if self.backward_fn is None:
            raise ValueError("backward_code must define a 'backward' function, e.g., 'def backward(x, y, grad_output): return grad_output * (1.0 - y * y)'")

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return CustomAutogradFunction.apply(x, self.forward_fn, self.backward_fn)


class ReshapeModule(nn.Module):
    """Reshapes a tensor to a target shape."""

    def __init__(self, target_shape: list[int]):
        super().__init__()
        self.target_shape = target_shape

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x.reshape(*self.target_shape)


