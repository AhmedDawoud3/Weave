import torch

from compiler.modules import AddModule, ConcatModule


def test_add_module():
    """Test the AddModule with multiple inputs."""
    add_mod = AddModule()
    t1 = torch.tensor([1.0, 2.0])
    t2 = torch.tensor([3.0, 4.0])
    t3 = torch.tensor([5.0, 6.0])

    result = add_mod([t1, t2, t3])

    assert torch.allclose(result, torch.tensor([9.0, 12.0]))


def test_concat_module():
    """Test the ConcatModule with multiple inputs."""
    concat_mod = ConcatModule(dim=1)

    t1 = torch.zeros((2, 3))
    t2 = torch.ones((2, 4))

    result = concat_mod([t1, t2])

    assert result.shape == (2, 7)
    assert torch.allclose(result[:, :3], torch.zeros((2, 3)))
    assert torch.allclose(result[:, 3:], torch.ones((2, 4)))
