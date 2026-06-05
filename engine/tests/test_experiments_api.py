from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from main import app
from schemas import RunRecord
from training.experiments import delete_run, save_run


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_runs():
    # Setup two mock runs on disk
    run_1 = RunRecord(
        run_id="run_comp_1",
        created_at=datetime.now(),
        status="completed",
        config={"dataset": "dummy"},
        graph_snapshot={"nodes": []},
        metrics_history=[
            {"epoch": 1, "loss": 0.5, "accuracy": 70.0},
            {"epoch": 2, "loss": 0.3, "accuracy": 85.0},
        ],
        best_metrics={"loss": 0.3},
        checkpoint_path="data/checkpoints/run_comp_1.pt",
        duration_seconds=10.0,
    )
    run_2 = RunRecord(
        run_id="run_comp_2",
        created_at=datetime.now(),
        status="completed",
        config={"dataset": "dummy"},
        graph_snapshot={"nodes": []},
        metrics_history=[
            {"epoch": 1, "loss": 0.6, "accuracy": 65.0},
            {"epoch": 2, "loss": 0.4, "accuracy": 80.0},
        ],
        best_metrics={"loss": 0.4},
        checkpoint_path="data/checkpoints/run_comp_2.pt",
        duration_seconds=12.0,
    )
    save_run(run_1)
    save_run(run_2)

    yield ["run_comp_1", "run_comp_2"]

    # Cleanup
    delete_run("run_comp_1")
    delete_run("run_comp_2")


def test_compare_experiments_success(client, sample_runs):
    payload = {
        "run_ids": sample_runs,
        "metrics": ["loss", "accuracy"],
    }
    response = client.post("/experiments/compare", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert "runs" in res_data
    assert len(res_data["runs"]) == 2

    # Check run 1 content
    run_1_data = next(r for r in res_data["runs"] if r["run_id"] == "run_comp_1")
    assert run_1_data["loss"] == [0.5, 0.3]
    assert run_1_data["accuracy"] == [70.0, 85.0]

    # Check run 2 content
    run_2_data = next(r for r in res_data["runs"] if r["run_id"] == "run_comp_2")
    assert run_2_data["loss"] == [0.6, 0.4]
    assert run_2_data["accuracy"] == [65.0, 80.0]


def test_compare_experiments_with_missing_and_corrupt_runs(client, sample_runs):
    # Request comparison for a valid run, a missing run, and an invalid/corrupt run
    payload = {
        "run_ids": ["run_comp_1", "nonexistent_run_id"],
        "metrics": ["loss"],
    }
    response = client.post("/experiments/compare", json=payload)
    assert response.status_code == 200
    res_data = response.json()
    assert "runs" in res_data
    # Should only return comparison for the existing run and gracefully skip the missing one
    assert len(res_data["runs"]) == 1
    assert res_data["runs"][0]["run_id"] == "run_comp_1"
    assert res_data["runs"][0]["loss"] == [0.5, 0.3]
