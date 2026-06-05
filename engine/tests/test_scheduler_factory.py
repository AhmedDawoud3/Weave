import pytest
import torch.nn as nn
import torch.optim as optim

from schemas import SchedulerConfig
from training.scheduler_factory import create_scheduler


@pytest.fixture
def dummy_optimizer():
    model = nn.Linear(10, 2)
    return optim.SGD(model.parameters(), lr=0.1)


def test_create_scheduler_none(dummy_optimizer):
    assert create_scheduler(dummy_optimizer, None) is None


def test_create_cosine_annealing(dummy_optimizer):
    config = SchedulerConfig(type="CosineAnnealingLR", params={"T_max": 100})
    scheduler = create_scheduler(dummy_optimizer, config)
    assert scheduler is not None
    assert scheduler.T_max == 100


def test_create_step_lr(dummy_optimizer):
    config = SchedulerConfig(type="StepLR", params={"step_size": 10, "gamma": 0.5})
    scheduler = create_scheduler(dummy_optimizer, config)
    assert scheduler is not None
    assert scheduler.step_size == 10
    assert scheduler.gamma == 0.5


def test_create_exponential_lr(dummy_optimizer):
    config = SchedulerConfig(type="ExponentialLR", params={"gamma": 0.9})
    scheduler = create_scheduler(dummy_optimizer, config)
    assert scheduler is not None
    assert scheduler.gamma == 0.9


def test_create_reduce_lr_on_plateau(dummy_optimizer):
    config = SchedulerConfig(
        type="ReduceLROnPlateau", params={"mode": "min", "factor": 0.2}
    )
    scheduler = create_scheduler(dummy_optimizer, config)
    assert scheduler is not None
    assert scheduler.factor == 0.2
    assert scheduler.mode == "min"


def test_create_one_cycle_lr_computed_steps(dummy_optimizer):
    # Tests that total_steps is computed from epochs and steps_per_epoch
    config = SchedulerConfig(type="OneCycleLR", params={"max_lr": 0.2})
    scheduler = create_scheduler(
        dummy_optimizer, config, epochs=5, steps_per_epoch=20
    )
    assert scheduler is not None
    # OneCycleLR calculates total_steps inside, which equals epochs * steps_per_epoch = 100
    assert scheduler.total_steps == 100


def test_create_one_cycle_lr_explicit_steps(dummy_optimizer):
    config = SchedulerConfig(
        type="OneCycleLR", params={"max_lr": 0.2, "total_steps": 50}
    )
    scheduler = create_scheduler(dummy_optimizer, config)
    assert scheduler is not None
    assert scheduler.total_steps == 50


def test_create_one_cycle_lr_deduced_max_lr(dummy_optimizer):
    # Test that max_lr is deduced from optimizer lr if not present
    config = SchedulerConfig(type="OneCycleLR", params={"total_steps": 50})
    scheduler = create_scheduler(dummy_optimizer, config)
    assert scheduler is not None
    # dummy_optimizer has lr = 0.1, so max_lr should be 0.1
    # with default div_factor = 25.0, base_lrs = [0.1 / 25.0] = [0.004]
    assert scheduler.base_lrs == [0.004]


def test_unsupported_scheduler_type(dummy_optimizer):
    config = SchedulerConfig(type="InvalidScheduler", params={})
    with pytest.raises(ValueError, match="Unsupported scheduler type"):
        create_scheduler(dummy_optimizer, config)


def test_invalid_parameters(dummy_optimizer):
    # CosineAnnealingLR requires T_max, we pass invalid arg 'foo'
    config = SchedulerConfig(type="CosineAnnealingLR", params={"foo": "bar"})
    with pytest.raises(ValueError, match="Error instantiating scheduler"):
        create_scheduler(dummy_optimizer, config)
