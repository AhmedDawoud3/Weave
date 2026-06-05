# Metrics Computation

The Weave training engine computes and aggregates metrics dynamically during both batch training steps and validation boundaries.

## Supported Modalities & Task Types

Metrics are calculated based on the requested `task_type`:

| Task Type | Monitored Metrics | Accuracy Calculation |
|-----------|-------------------|----------------------|
| `classification` | `loss`, `accuracy` | Batch-level argmax matching percentage: $\frac{\text{correct}}{\text{total}} \times 100$ |
| `regression` | `loss`, `mse`, `mae` | Not applicable (RMSE, MSE, and MAE are computed directly from continuous predictions) |
| `multi_label` | `loss`, `accuracy` | Element-wise threshold matching percentage across all labels |

---

## Detaching and CPU Fallbacks

To prevent GPU/CUDA memory leaks, the metric computation explicitly detaches tensors from the dynamic computation graph and maps them to standard Python `float` primitives on the host CPU.

---

## Epoch Metrics Aggregation

During an epoch, batch sizes can vary (especially on the final batch of a dataset split). Weave uses a weighted average aggregation strategy via the `EpochMetricsTracker` class to calculate epoch-level metrics accurately:

$$\text{Epoch Metric} = \frac{\sum (\text{Batch Metric} \times \text{Batch Size})}{\sum \text{Batch Size}}$$

---

## API Reference

::: training.metrics.compute_batch_metrics
    options:
      show_root_heading: true

::: training.metrics.EpochMetricsTracker
    options:
      show_root_heading: true
