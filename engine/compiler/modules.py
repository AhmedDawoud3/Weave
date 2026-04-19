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
