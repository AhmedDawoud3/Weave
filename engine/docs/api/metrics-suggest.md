# Metrics Suggestion API

Suggests validation metrics based on task configurations.

- **Method**: `POST`
- **URL**: `/metrics/suggest`
- **Request Body**: `MetricsSuggestionRequest` JSON payload
- **Response**: `MetricsSuggestionResponse` JSON payload

---

## Mapping Logic Matrix

Weave maps validation metrics suggestions dynamically using the following task type matrix:

| Task Type | Suggested Metrics |
|-----------|-------------------|
| `classification` | `["Accuracy", "F1Score", "ConfusionMatrix"]` |
| `regression` | `["MSE", "MAE", "R2Score"]` |
| `multi_label` | `["Accuracy", "F1Score", "Precision", "Recall"]` |

---

## Example Request & Response

### Classification Scenario
#### Request
```json
{
  "task_type": "classification",
  "num_classes": 10
}
```

#### Response
```json
{
  "suggested": ["Accuracy", "F1Score", "ConfusionMatrix"]
}
```
