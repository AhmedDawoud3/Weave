import json
import logging
import os

from schemas import RunRecord

logger = logging.getLogger(__name__)

# Base runs directory inside the workspace (Weave/data/runs)
RUNS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "runs")
)


def get_runs_dir() -> str:
    """Returns the absolute path to the runs directory, creating it if necessary."""
    os.makedirs(RUNS_DIR, exist_ok=True)
    return RUNS_DIR


def save_run(record: RunRecord) -> None:
    """Saves a RunRecord to disk atomically.

    Args:
        record: The RunRecord to save.
    """
    runs_dir = get_runs_dir()
    filepath = os.path.join(runs_dir, f"{record.run_id}.json")
    tmppath = os.path.join(runs_dir, f"{record.run_id}.tmp")

    # Serialize record to JSON string (Pydantic handles datetime correctly)
    record_json = record.model_dump_json()

    try:
        with open(tmppath, "w", encoding="utf-8") as f:
            f.write(record_json)
        # Atomic replacement on POSIX filesystems
        os.replace(tmppath, filepath)
    except Exception as e:
        if os.path.exists(tmppath):
            try:
                os.remove(tmppath)
            except Exception:
                pass
        logger.error(f"Failed to save run {record.run_id}: {e}")
        raise e


def get_run(run_id: str) -> RunRecord | None:
    """Retrieves a RunRecord from disk by run_id.

    Args:
        run_id: The unique run identifier.

    Returns:
        RunRecord if found, None otherwise.
    """
    runs_dir = get_runs_dir()
    filepath = os.path.join(runs_dir, f"{run_id}.json")
    if not os.path.exists(filepath):
        return None
    try:
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
        return RunRecord(**data)
    except Exception as e:
        logger.error(f"Failed to load run {run_id} from {filepath}: {e}")
        return None


def list_runs() -> list[RunRecord]:
    """Lists all saved RunRecords from disk."""
    runs_dir = get_runs_dir()
    records = []
    if not os.path.exists(runs_dir):
        return records
    for filename in os.listdir(runs_dir):
        if filename.endswith(".json"):
            run_id = filename[:-5]
            record = get_run(run_id)
            if record:
                records.append(record)
    # Sort runs by created_at descending
    records.sort(key=lambda r: r.created_at, reverse=True)
    return records


def delete_run(run_id: str) -> bool:
    """Deletes a RunRecord from disk.

    Args:
        run_id: The unique run identifier.

    Returns:
        True if deleted, False if not found or on error.
    """
    runs_dir = get_runs_dir()
    filepath = os.path.join(runs_dir, f"{run_id}.json")
    if not os.path.exists(filepath):
        return False
    try:
        os.remove(filepath)
        return True
    except Exception as e:
        logger.error(f"Failed to delete run {run_id}: {e}")
        return False
