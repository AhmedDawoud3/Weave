# Model Export API

Weave supports exporting trained neural network graphs to standard deployment formats, including ONNX, raw PyTorch state dictionaries, and TorchScript binaries.

---

## 1. Export to ONNX Format

Exports the compiled model graph to ONNX.

- **Method**: `POST`
- **URL**: `/export/onnx`
- **Request Body**: `ExportRequest` JSON payload
- **Response**: `ExportResponse` JSON payload

### Dynamic Axis Configuration
To support variable batch sizes during production serving, the ONNX exporter automatically defines the batch dimension (index `0`) of both the input and output tensors as a dynamic axis named `batch_size`.

---

## 2. Export to PyTorch state_dict

Saves the raw weights mapping (`state_dict`) of the trained model.

- **Method**: `POST`
- **URL**: `/export/pytorch`
- **Request Body**: `ExportRequest` JSON payload
- **Response**: `ExportResponse` JSON payload

---

## 3. Export to TorchScript

Traces the model graph with a dummy input and serializes it to a platform-independent TorchScript binary (.pt/.ot).

- **Method**: `POST`
- **URL**: `/export/torchscript`
- **Request Body**: `ExportRequest` JSON payload
- **Response**: `ExportResponse` JSON payload

---

## Example Request & Response

### Request
```json
{
  "graph": {
    "nodes": [
      {
        "id": "fc1",
        "type": "Linear",
        "params": {
          "in_features": 10,
          "out_features": 2
        }
      }
    ],
    "edges": [
      { "source": "input", "target": "fc1" },
      { "source": "fc1", "target": "output" }
    ]
  },
  "input_shape": [1, 10],
  "checkpoint_path": "/checkpoints/best.pt",
  "output_path": "/tmp/exported_model.onnx",
  "opset_version": 17
}
```

### Response (Success)
```json
{
  "status": "success",
  "output_path": "/tmp/exported_model.onnx"
}
```

### Response (Error)
```json
{
  "status": "error",
  "output_path": "",
  "message": "ONNX export tracing failed: ..."
}
```
