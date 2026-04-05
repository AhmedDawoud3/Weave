from typing import List

import torch
import torch.nn as nn


class AddModule(nn.Module):
    """Wrapper for node 'Add' that sums multiple inputs."""

    def forward(self, inputs: List[torch.Tensor]) -> torch.Tensor:
        return sum(inputs)


class ConcatModule(nn.Module):
    """Wrapper for node 'Concat' that concatenates multiple inputs."""

    def __init__(self, dim: int):
        super().__init__()
        self.dim = dim

    def forward(self, inputs: List[torch.Tensor]) -> torch.Tensor:
        return torch.cat(inputs, dim=self.dim)
