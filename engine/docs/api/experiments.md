# Experiment Comparison API

Compare the historical training progress of multiple neural network runs.

---

## Compare Endpoint

- **Method**: `POST`
- **URL**: `/experiments/compare`
- **Request Body**: `ExperimentCompareRequest` JSON payload
- **Response**: `ExperimentCompareResponse` JSON payload

### Robust Error Tolerance
The comparison endpoint is designed to be highly resilient:
- If a requested `run_id` does not exist on disk, a warning is logged internally, and it is skipped.
- If a run record file is corrupted or fails to parse, it is skipped.
- The service will still return a successful `200 OK` response with all valid and successfully loaded runs.

---

## Example Request & Response

### Request
```json
{
  "run_ids": [
    "run_comp_1",
    "run_comp_2",
    "nonexistent_run_id"
  ],
  "metrics": [
    "loss",
    "accuracy"
  ]
}
```

### Response (Success)
```json
{
  "runs": [
    {
      "run_id": "run_comp_1",
      "loss": [0.5, 0.3],
      "accuracy": [70.0, 85.0]
    },
    {
      "run_id": "run_comp_2",
      "loss": [0.6, 0.4],
      "accuracy": [65.0, 80.0]
    }
  ]
}
```
