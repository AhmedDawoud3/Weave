# Predictive Inference API

Evaluate input samples using a compiled model loaded directly from a checkpoint.

---

## Predict Endpoint

- **Method**: `POST`
- **URL**: `/inference/predict`
- **Request Body**: `InferenceRequest` JSON payload
- **Response**: `InferenceResponse` JSON payload

### Device Fallback and Inference Optimization
The prediction request:
1. Compiles the model topology in memory from the graph config.
2. Loads the model weights from the specified checkpoint path.
3. Automatically selects the available execution hardware (CUDA with CPU fallback if GPU is not available).
4. Evaluates predictions under `torch.inference_mode()` (disabling gradient tracking to minimize latency and memory consumption).

---

## Example Request & Response

### Request (Classification Task)
```json
{
  "graph": {
    "nodes": [
      {
        "id": "fc1",
        "type": "Linear",
        "params": {
          "in_features": 10,
          "out_features": 3
        }
      }
    ],
    "edges": [
      { "source": "input", "target": "fc1" },
      { "source": "fc1", "target": "output" }
    ]
  },
  "checkpoint_path": "data/checkpoints/best.pt",
  "input": [
    [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]
  ]
}
```

### Response (Classification Task)
```json
{
  "prediction": [0.05, 0.1, 0.85],
  "predicted_class": 2
}
```

### Request (Regression Task)
```json
{
  "graph": {
    "nodes": [
      {
        "id": "fc1",
        "type": "Linear",
        "params": {
          "in_features": 5,
          "out_features": 1
        }
      }
    ],
    "edges": [
      { "source": "input", "target": "fc1" },
      { "source": "fc1", "target": "output" }
    ]
  },
  "checkpoint_path": "data/checkpoints/best.pt",
  "input": [
    [0.5, 0.5, 0.5, 0.5, 0.5]
  ]
}
```

### Response (Regression Task)
```json
{
  "prediction": [4.5],
  "predicted_class": null
}
```
