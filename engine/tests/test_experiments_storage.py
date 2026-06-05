import os
import shutil
import pytest
from datetime import datetime
from schemas import RunRecord
from training.experiments import save_run, get_run, list_runs, delete_run, get_runs_dir


@pytest.fixture(autouse=True)
def clean_runs_dir():
    # Make sure runs dir is clean before and after each test
    runs_dir = get_runs_dir()
    if os.path.exists(runs_dir):
        # Delete only json and tmp files to avoid deleting active runs directories in testing environment
        for filename in os.listdir(runs_dir):
            if filename.endswith(".json") or filename.endswith(".tmp"):
                try:
                    os.remove(os.path.join(runs_dir, filename))
                except Exception:
                    pass
    else:
        os.makedirs(runs_dir, exist_ok=True)
    yield
    # Cleanup after test
    if os.path.exists(runs_dir):
        for filename in os.listdir(runs_dir):
            if filename.endswith(".json") or filename.endswith(".tmp"):
                try:
                    os.remove(os.path.join(runs_dir, filename))
                except Exception:
                    pass


def test_run_crud_success():
    # 1. Create a RunRecord
    record = RunRecord(
        run_id="run_123",
        created_at=datetime.now(),
        status="running",
        config={"dataset": "dummy"},
        graph_snapshot={"nodes": []},
        metrics_history=[{"epoch": 1, "loss": 0.5}],
        best_metrics={"loss": 0.5},
        checkpoint_path="data/checkpoints/run_123.pt",
        duration_seconds=12.5,
    )

    # 2. Save the record
    save_run(record)
    assert os.path.exists(os.path.join(get_runs_dir(), "run_123.json"))

    # 3. Retrieve the record
    loaded = get_run("run_123")
    assert loaded is not None
    assert loaded.run_id == "run_123"
    assert loaded.status == "running"
    assert loaded.metrics_history[0]["loss"] == 0.5
    assert loaded.duration_seconds == 12.5

    # 4. List records
    runs = list_runs()
    assert len(runs) == 1
    assert runs[0].run_id == "run_123"

    # 5. Update and save
    record.status = "completed"
    record.metrics_history.append({"epoch": 2, "loss": 0.2})
    save_run(record)

    loaded_updated = get_run("run_123")
    assert loaded_updated.status == "completed"
    assert len(loaded_updated.metrics_history) == 2

    # 6. Delete record
    deleted = delete_run("run_123")
    assert deleted is True
    assert get_run("run_123") is None
