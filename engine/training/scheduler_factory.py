"""
scheduler_factory.py — Scheduler Factory for training execution engine.
=======================================================================
Instantiates PyTorch learning rate schedulers based on SchedulerConfig.
"""

from typing import Any, Optional
import torch.optim as optim
import torch.optim.lr_scheduler as lr_scheduler
from schemas import SchedulerConfig


def create_scheduler(
    optimizer: optim.Optimizer,
    config: Optional[SchedulerConfig],
    epochs: Optional[int] = None,
    steps_per_epoch: Optional[int] = None,
) -> Optional[Any]:
    """Creates a PyTorch learning rate scheduler from a SchedulerConfig.

    Args:
        optimizer (optim.Optimizer): The optimizer to associate with the scheduler.
        config (Optional[SchedulerConfig]): The scheduler configuration. If None,
            returns None.
        epochs (Optional[int], optional): Total epochs. Used to calculate total_steps
            for OneCycleLR. Defaults to None.
        steps_per_epoch (Optional[int], optional): Steps per epoch. Used to calculate
            total_steps for OneCycleLR. Defaults to None.

    Returns:
        Optional[Any]: The instantiated PyTorch scheduler, or None if config is None.

    Raises:
        ValueError: If the scheduler type is unsupported or if instantiation fails.
    """
    if config is None:
        return None

    scheduler_type = config.type
    params = config.params.copy() if config.params else {}

    mapping = {
        "CosineAnnealingLR": lr_scheduler.CosineAnnealingLR,
        "StepLR": lr_scheduler.StepLR,
        "OneCycleLR": lr_scheduler.OneCycleLR,
        "ExponentialLR": lr_scheduler.ExponentialLR,
        "ReduceLROnPlateau": lr_scheduler.ReduceLROnPlateau,
    }

    if scheduler_type not in mapping:
        raise ValueError(f"Unsupported scheduler type: {scheduler_type}")

    scheduler_class = mapping[scheduler_type]

    # Special handling for OneCycleLR total_steps computation
    if scheduler_type == "OneCycleLR":
        # OneCycleLR requires max_lr. If max_lr is not in params, try to get it
        # from optimizer param groups.
        if "max_lr" not in params:
            max_lrs = [group["lr"] for group in optimizer.param_groups]
            if len(max_lrs) == 1:
                params["max_lr"] = max_lrs[0]
            else:
                params["max_lr"] = max_lrs

        # Compute total_steps if not already explicitly provided
        if "total_steps" not in params and ("epochs" not in params or "steps_per_epoch" not in params):
            if epochs is not None and steps_per_epoch is not None:
                params["total_steps"] = epochs * steps_per_epoch

    try:
        scheduler = scheduler_class(optimizer, **params)
    except Exception as e:
        raise ValueError(f"Error instantiating scheduler '{scheduler_type}': {e}") from e

    return scheduler
