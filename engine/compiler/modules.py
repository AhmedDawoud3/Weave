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
            raise ValueError(
                "forward_code must define a 'forward' function, e.g., 'def forward(x): return x.tanh()'"
            )
        if self.backward_fn is None:
            raise ValueError(
                "backward_code must define a 'backward' function, e.g., 'def backward(x, y, grad_output): return grad_output * (1.0 - y * y)'"
            )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return CustomAutogradFunction.apply(x, self.forward_fn, self.backward_fn)


class ReshapeModule(nn.Module):
    """Reshapes a tensor to a target shape."""

    def __init__(self, target_shape: list[int]):
        super().__init__()
        self.target_shape = target_shape

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x.reshape(*self.target_shape)


class FlattenConsecutiveModule(nn.Module):
    """Merges consecutive time steps: (B, T, C) -> (B, T//n, C*n). Used in WaveNet."""

    def __init__(self, n: int = 2):
        super().__init__()
        self.n = n

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, T, C = x.shape
        if T % self.n != 0:
            raise ValueError(
                f"FlattenConsecutive: time dimension {T} must be divisible by n={self.n}"
            )
        return x.contiguous().view(B, T // self.n, C * self.n)


class SelfAttentionModule(nn.Module):
    """Multi-head self-attention with optional causal mask. Input/output: (B, T, C)."""

    def __init__(
        self,
        embed_dim: int,
        num_heads: int,
        dropout: float = 0.0,
        causal: bool = True,
        bias: bool = True,
    ):
        super().__init__()
        self.causal = causal
        self.attn = nn.MultiheadAttention(
            embed_dim, num_heads, dropout=dropout, bias=bias, batch_first=True
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        T = x.size(1)
        attn_mask = None
        if self.causal:
            # Upper-triangular mask: positions can only attend to earlier positions
            attn_mask = torch.triu(
                torch.ones(T, T, device=x.device, dtype=torch.bool), diagonal=1
            )
        out, weights = self.attn(x, x, x, attn_mask=attn_mask, need_weights=True)
        self.attn_weights = weights.detach().cpu()
        return out


class PositionalEncodingModule(nn.Module):
    """Adds positional information to token embeddings. Supports learned and sinusoidal."""

    def __init__(
        self,
        embed_dim: int,
        max_seq_len: int = 1024,
        pe_type: str = "sinusoidal",
    ):
        super().__init__()
        self.pe_type = pe_type
        if pe_type == "learned":
            self.pos_emb = nn.Embedding(max_seq_len, embed_dim)
        else:
            # Pre-compute sinusoidal table
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
            self.register_buffer("pe", pe.unsqueeze(0))  # (1, max_seq_len, embed_dim)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        T = x.size(1)
        if self.pe_type == "learned":
            positions = torch.arange(T, device=x.device)
            return x + self.pos_emb(positions)
        else:
            return x + self.pe[:, :T, :]  # type: ignore[index]


class CausalMaskModule(nn.Module):
    """Produces a boolean upper-triangular causal mask of shape (T, T) from input (B, T, C)."""

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        T = x.size(1)
        mask = torch.triu(torch.ones(T, T, device=x.device, dtype=torch.bool), diagonal=1)
        return mask


class FeedForwardModule(nn.Module):
    """Transformer feed-forward block: Linear -> GELU -> Linear with expansion ratio."""

    def __init__(self, embed_dim: int, expansion: int = 4, dropout: float = 0.0):
        super().__init__()
        hidden = embed_dim * expansion
        self.net = nn.Sequential(
            nn.Linear(embed_dim, hidden),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden, embed_dim),
            nn.Dropout(dropout),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)
