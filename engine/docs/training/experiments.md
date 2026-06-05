# Experiment Tracking & Runs History

Weave includes a lightweight, flat-file database format to store model configuration, network topology, epoch training metrics, and export states.

## Storing Runs

Runs are saved in the project's workspace directory at `data/runs/` inside JSON files named after their unique `run_id` (e.g. `data/runs/abc123e4-5678-abcd-ef90-123456789abc.json`).

### Atomic Writes
To avoid run history data corruption in case the process is interrupted or crashes, Weave uses atomic file replacement:
1. Serializes the `RunRecord` Pydantic model to a temporary file: `data/runs/{run_id}.tmp`.
2. Renames the temporary file atomically to `data/runs/{run_id}.json` using POSIX filesystem operations (`os.replace`).

---

## RunRecord Schema

The data schema for each persisted run contains:

- **`run_id`**: A uniquely generated UUID for the training run.
- **`created_at`**: The timestamp of when the run was initiated.
- **`status`**: The current status of the run, mapping to `running`, `completed`, `failed`, or `stopped`.
- **`config`**: A snapshot of the full `TrainingConfig` including optimizer, scheduler, dataset configs, and hyperparameters.
- **`graph_snapshot`**: The model graph design structure snapshot.
- **`metrics_history`**: A list of metrics recorded at the end of each completed epoch.
- **`best_metrics`**: Monitored metrics indicating the best epoch's performance (e.g. lowest validation loss).
- **`checkpoint_path`**: Absolute path to the saved model checkpoint `.pt` file.
- **`duration_seconds`**: Real execution duration of the training loop.

---

## API Reference

::: training.experiments.save_run
    options:
      show_root_heading: true

::: training.experiments.get_run
    options:
      show_root_heading: true

::: training.experiments.list_runs
    options:
      show_root_heading: true

::: training.experiments.delete_run
    options:
      show_root_heading: true
