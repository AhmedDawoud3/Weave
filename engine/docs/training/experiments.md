# Experiment Tracking & Runs History

Weave includes a lightweight, flat-file database format to store model configuration, network topology, epoch training metrics, and export states.

## Storing Runs

Runs are saved in the project's workspace directory at `data/runs/` using two distinct file types per run:

1. **Run Metadata & Epochs (`{run_id}.json`)**: Stores overall run details, hyperparameters, and epoch summaries.
2. **Step Metrics & Event Logs (`{run_id}.steps.jsonl`)**: Stores step-level metrics and setup phase events.

### Step-Level Metrics (JSONL Format)
To avoid severe I/O overhead from serializing and writing a large JSON file on every training step (e.g. on every batch gradient step), step-level metrics are appended to a JSON Lines (`.jsonl`) file. This achieves O(1) append times, preserving filesystem health and avoiding I/O blocks.

### Atomic Writes for Metadata
To avoid run history data corruption in case the process is interrupted or crashes, Weave uses atomic file replacement for the main JSON record:
1. Serializes the `RunRecord` Pydantic model to a temporary file: `data/runs/{run_id}.tmp`.
2. Renames the temporary file atomically to `data/runs/{run_id}.json` using POSIX filesystem operations (`os.replace`).

---

## Graceful Crash Recovery

If the Weave backend crashes or restarts (which commonly happens when Uvicorn reloads on file changes during development) while a training run is active:
1. The background PyTorch training thread is terminated.
2. When the backend restarts, the run's memory reference is gone, but the flat-file record still states its status is `running` or `paused`.
3. Upon any attempt to retrieve the status or stream of the run, the `TrainingRunner` detects this orphaned state, updates the disk metadata in `{run_id}.json` to `stopped`, and appends a final `stopped` event to the `{run_id}.steps.jsonl` file.
4. Late-connecting clients automatically fetch this updated history, showing that training stopped due to an engine restart, and close the stream cleanly.

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
