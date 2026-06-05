import os
import json
import asyncio
import logging
from importlib.metadata import metadata

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sse_starlette.sse import EventSourceResponse

from compiler.compiler import GraphCompiler
from dataset.preview import preview_dataset
from dataset.registry import load_registry
from dataset.scanner import smart_scan
from dataset.shape_inference import infer_dataset_shape
from dataset.transform_factory import get_transform_catalog
from dataset.validator import validate_dataset_config
from training.runner import TrainingRunner
from schemas import (
    DatasetCatalogEntry,
    DatasetCatalogResponse,
    DatasetPreviewRequest,
    DatasetPreviewResponse,
    DatasetScanRequest,
    DatasetScanResponse,
    DatasetShapeInferenceRequest,
    DatasetShapeInferenceResponse,
    DatasetValidateRequest,
    DatasetValidateResponse,
    PipelineValidationRequest,
    PipelineValidationResponse,
    ShapeInferenceRequest,
    ShapeInferenceResponse,
    TransformCatalogEntry,
    TransformCatalogResponse,
    TrainingConfig,
    TrainingControlMessage,
    TrainingStatusResponse,
    LossSuggestionRequest,
    LossSuggestionResponse,
)

# Retrieve project metadata
pkg_meta = metadata("engine")

title = pkg_meta.get("Name", "Weave Engine")
version = pkg_meta.get("Version", "0.1.0")

app = FastAPI(
    title=f"{title.capitalize()} API",
    version=version,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://weave-ai.dev",
        "http://localhost:5173",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)
compiler = GraphCompiler()
runner = TrainingRunner()

# Serve MkDocs-built documentation at /docs (if the site has been built)
_site_dir = os.path.join(os.path.dirname(__file__), "site")
if os.path.isdir(_site_dir):
    app.mount("/docs", StaticFiles(directory=_site_dir, html=True), name="docs")


# ---------------------------------------------------------------------------
# Existing endpoints
# ---------------------------------------------------------------------------


@app.post("/validate_pipeline", response_model=PipelineValidationResponse)
def validate_pipeline(request: PipelineValidationRequest):
    """Simulates dummy tensor passing through the graph to evaluate shapes block-by-block.

    Args:
        request: Pipeline validation request containing the graph config and input shape.

    Returns:
        PipelineValidationResponse with status "success" and node_shapes dict,
        or status "error" with a human-readable message.
    """
    try:
        result = compiler.validate_pipeline(request.graph, request.input_shape)
        return PipelineValidationResponse(**result)
    except Exception as e:
        return PipelineValidationResponse(
            status="error",
            message=f"Oops! Something went wrong in the engine. Try refreshing your network. Technical details: {str(e)}",
        )


@app.post("/infer/layer", response_model=ShapeInferenceResponse)
def infer_layer_shape(request: ShapeInferenceRequest):
    """Compute the output shape of a single layer or block given its input shape.

    Supports multi-input layers (Add, Concat, Multiply) via input_shapes.

    Args:
        request: Shape inference request containing the node config and input shape(s).

    Returns:
        ShapeInferenceResponse with status "success" and output_shape,
        or status "error" with a human-readable message.
    """
    try:
        result = compiler.infer_layer_shape(
            node=request.node,
            input_shape=request.input_shape,
            input_shapes=request.input_shapes,
        )
        return ShapeInferenceResponse(**result)
    except Exception as e:
        return ShapeInferenceResponse(
            status="error",
            message=f"Shape inference failed: {str(e)}",
        )


@app.post("/infer/dataset", response_model=DatasetShapeInferenceResponse)
def infer_dataset_shape_endpoint(request: DatasetShapeInferenceRequest):
    """Compute the per-sample and batch tensor shapes for a dataset configuration.

    Args:
        request: Dataset shape inference request containing the dataset config.

    Returns:
        DatasetShapeInferenceResponse with status "success", per_sample_shape,
        batch_shape, and num_classes, or status "error" with a message.
    """
    try:
        result = infer_dataset_shape(request.dataset_config)
        return DatasetShapeInferenceResponse(**result)
    except Exception as e:
        return DatasetShapeInferenceResponse(
            status="error",
            message=f"Dataset shape inference failed: {str(e)}",
        )


# ---------------------------------------------------------------------------
# Dataset catalog & scan endpoints
# ---------------------------------------------------------------------------


@app.get("/datasets/catalog", response_model=DatasetCatalogResponse)
def datasets_catalog():
    """List all predefined datasets with metadata for the visual editor picker.

    Returns:
        DatasetCatalogResponse with a list of dataset entries including
        name, description, tags, modality, shape, and num_classes.
    """
    registry = load_registry()
    entries = []
    for name, config in registry.items():
        entries.append(
            DatasetCatalogEntry(
                name=name,
                description=config.get("description", ""),
                tags=config.get("tags", []),
                modality=config.get("modality", "image"),
                shape=config.get("shape"),
                num_classes=config.get("num_classes"),
            )
        )
    return DatasetCatalogResponse(datasets=entries)


@app.get("/transforms/catalog", response_model=TransformCatalogResponse)
def transforms_catalog():
    """List all available transforms with parameter schemas for the visual editor.

    Returns:
        TransformCatalogResponse with a list of transform entries including
        name, params, category, and description.
    """
    catalog = get_transform_catalog()
    entries = [
        TransformCatalogEntry(
            name=item["name"],
            params=item["params"],
            category=item["category"],
            description=item["description"],
        )
        for item in catalog
    ]
    return TransformCatalogResponse(transforms=entries)


@app.post("/datasets/scan", response_model=DatasetScanResponse)
def datasets_scan(request: DatasetScanRequest):
    """Scan a local path for data and return structure info.

    Supports image folders, CSV files, text files, and audio folders.
    Auto-detects the data type if modality is not specified.

    Args:
        request: Scan request with path and optional modality hint.

    Returns:
        DatasetScanResponse with scan results or error message.
    """
    try:
        result = smart_scan(request.path, request.modality)
        return DatasetScanResponse(status="success", result=result)
    except Exception as e:
        return DatasetScanResponse(status="error", message=str(e))


@app.post("/datasets/preview", response_model=DatasetPreviewResponse)
def datasets_preview(request: DatasetPreviewRequest):
    """Preview a few samples from a dataset configuration.

    Returns sample data in a frontend-friendly format (base64 thumbnails
    for images, token IDs for text, feature vectors for tabular, etc.).

    Args:
        request: Preview request with dataset config and sample count.

    Returns:
        DatasetPreviewResponse with samples and total dataset size.
    """
    try:
        result = preview_dataset(request.dataset_config, request.num_samples)
        return DatasetPreviewResponse(**result)
    except Exception as e:
        return DatasetPreviewResponse(
            status="error",
            message=str(e),
        )


@app.post("/datasets/validate", response_model=DatasetValidateResponse)
def datasets_validate(request: DatasetValidateRequest):
    """Validate a dataset configuration and return errors/warnings.

    Checks required fields, path existence, column validity, and
    transform compatibility.

    Args:
        request: Validate request with dataset config.

    Returns:
        DatasetValidateResponse with valid flag, errors, and warnings.
    """
    result = validate_dataset_config(request.dataset_config)
    return DatasetValidateResponse(**result)


@app.post("/loss/suggest", response_model=LossSuggestionResponse)
def suggest_loss(request: LossSuggestionRequest):
    """Suggests a loss function based on task type and final activation.

    Args:
        request: LossSuggestionRequest with output shape, activation, and task type.

    Returns:
        LossSuggestionResponse with suggested loss and alternative choices.
    """
    task_type = request.task_type
    final_activation = request.final_activation.lower()

    if task_type == "classification":
        if final_activation == "log_softmax":
            suggested = "NLLLoss"
            alternatives = ["CrossEntropyLoss"]
        elif final_activation == "none":
            suggested = "CrossEntropyLoss"
            alternatives = ["NLLLoss"]
        elif final_activation == "softmax":
            suggested = "NLLLoss"
            alternatives = ["CrossEntropyLoss"]
        else:
            suggested = "CrossEntropyLoss"
            alternatives = ["NLLLoss"]
    elif task_type == "multi_label":
        suggested = "BCEWithLogitsLoss"
        alternatives = ["BCELoss"]
    elif task_type == "regression":
        suggested = "MSELoss"
        alternatives = ["L1Loss"]
    else:
        suggested = "MSELoss"
        alternatives = []

    return LossSuggestionResponse(suggested=suggested, alternatives=alternatives)


# ---------------------------------------------------------------------------
# Training endpoints
# ---------------------------------------------------------------------------


@app.post("/training/start")
def start_training(config: TrainingConfig):
    """Starts a training run in the background.

    Args:
        config: TrainingConfig containing dataset, model graph, loss, optimizer, and settings.

    Returns:
        dict: Containing the generated unique run_id.
    """
    try:
        run_id = runner.start_run(config)
        return {"run_id": run_id}
    except Exception as e:
        logger.exception("Failed to start training.")
        raise HTTPException(
            status_code=400, detail=f"Failed to start training: {str(e)}"
        )


@app.get("/training/stream/{run_id}")
async def stream_training(run_id: str):
    """Streams step-level and epoch-level metrics from a run using Server-Sent Events (SSE).

    Args:
        run_id: The training run identifier.

    Returns:
        EventSourceResponse: Event stream containing metrics messages.
    """
    queue = runner.get_queue(run_id)
    if not queue:
        raise HTTPException(status_code=404, detail="Run ID not found.")

    async def event_generator():
        try:
            while True:
                msg = await queue.get()
                yield {
                    "event": msg["event"] if "event" in msg else msg.get("type", "step_metrics"),
                    "data": json.dumps(msg)
                }

                if msg.get("type") in ["training_complete", "training_failed", "stopped"]:
                    break
        except asyncio.CancelledError:
            logger.info(f"SSE stream cancelled for run_id: {run_id}")
        finally:
            trainer = runner.get_trainer(run_id)
            if trainer and trainer.status in ["completed", "failed", "stopped"]:
                runner.cleanup_run(run_id)

    return EventSourceResponse(event_generator())


@app.post("/training/control/{run_id}")
def control_training(run_id: str, message: TrainingControlMessage):
    """Controls an active training run (pause, resume, or stop).

    Args:
        run_id: The training run identifier.
        message: TrainingControlMessage containing the action to perform.

    Returns:
        dict: Success status and action taken.
    """
    action = message.action
    if action == "pause":
        success = runner.pause_run(run_id)
    elif action == "resume":
        success = runner.resume_run(run_id)
    elif action == "stop":
        success = runner.stop_run(run_id)
    else:
        success = False

    if not success:
        raise HTTPException(
            status_code=404, detail=f"Run ID {run_id} not found or action {action} failed."
        )

    return {"status": "success", "action": action}


@app.get("/training/status/{run_id}", response_model=TrainingStatusResponse)
def get_training_status(run_id: str):
    """Gets the current status and latest metrics for a training run.

    Args:
        run_id: The training run identifier.

    Returns:
        TrainingStatusResponse: Containing status, current epoch, total epochs, and latest metrics.
    """
    trainer = runner.get_trainer(run_id)
    if not trainer:
        raise HTTPException(status_code=404, detail="Run ID not found.")

    # Status value mapping
    status_val = trainer.status
    if status_val not in ["running", "paused", "completed", "failed", "stopped"]:
        status_val = "failed"

    return TrainingStatusResponse(
        run_id=run_id,
        status=status_val,
        current_epoch=trainer.current_epoch,
        total_epochs=trainer.total_epochs,
        latest_metrics=trainer.latest_metrics,
    )


def main():
    """Start the Weave Engine FastAPI server with auto-reload enabled."""
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    main()
