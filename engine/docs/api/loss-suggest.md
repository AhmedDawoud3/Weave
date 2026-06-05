# Loss Function Suggestion API

Suggestions loss functions based on network topology outputs and task configurations.

- **Method**: `POST`
- **URL**: `/loss/suggest`
- **Request Body**: `LossSuggestionRequest` JSON payload
- **Response**: `LossSuggestionResponse` JSON payload

---

## Mapping Logic Matrix

Weave maps recommendations dynamically using the following configuration matrix:

| Task Type | Final Activation | Suggested Loss | Alternative Choices |
|-----------|------------------|----------------|---------------------|
| `classification` | `none` | `CrossEntropyLoss` | `NLLLoss` |
| `classification` | `log_softmax` | `NLLLoss` | `CrossEntropyLoss` |
| `classification` | `softmax` | `NLLLoss` | `CrossEntropyLoss` |
| `multi_label` | *Any* | `BCEWithLogitsLoss` | `BCELoss` |
| `regression` | *Any* | `MSELoss` | `L1Loss` |

---

## Example Requests & Responses

### Classification Scenario
#### Request
```json
{
  "output_shape": [32, 10],
  "final_activation": "none",
  "task_type": "classification"
}
```

#### Response
```json
{
  "suggested": "CrossEntropyLoss",
  "alternatives": ["NLLLoss"]
}
```

### Regression Scenario
#### Request
```json
{
  "output_shape": [32, 1],
  "final_activation": "none",
  "task_type": "regression"
}
```

#### Response
```json
{
  "suggested": "MSELoss",
  "alternatives": ["L1Loss"]
}
```
