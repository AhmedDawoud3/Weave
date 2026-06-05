import asyncio
import json
import logging
import os
from importlib.metadata import metadata

import torch.nn as nn
import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sse_starlette.sse import EventSourceResponse

from compiler import (
    GraphCompiler,
    export_onnx,
    export_pytorch,
    export_torchscript,
    get_optimizer,
)
from dataset.preview import preview_dataset
from dataset.registry import load_registry
from dataset.scanner import smart_scan
from dataset.shape_inference import infer_dataset_shape
from dataset.transform_factory import get_transform_catalog
from dataset.validator import validate_dataset_config
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
    ExperimentCompareRequest,
    ExperimentCompareResponse,
    ExportRequest,
    ExportResponse,
    InferenceRequest,
    InferenceResponse,
    LossSuggestionRequest,
    LossSuggestionResponse,
    LRSchedulePreviewRequest,
    LRSchedulePreviewResponse,
    MetricsSuggestionRequest,
    MetricsSuggestionResponse,
    PipelineValidationRequest,
    PipelineValidationResponse,
    SchedulerConfig,
    ShapeInferenceRequest,
    ShapeInferenceResponse,
    TrainingConfig,
    TrainingControlMessage,
    TrainingStatusResponse,
    TransformCatalogEntry,
    TransformCatalogResponse,
)
from training.runner import TrainingRunner
from training.scheduler_factory import create_scheduler

load_dotenv()

# Retrieve project metadata
pkg_meta = metadata("engine")

title = pkg_meta.get("Name", "Weave Engine")
version = pkg_meta.get("Version", "0.1.0")

tags_metadata = [
    {
        "name": "System Utilities",
        "description": "System health checks, diagnostics, and metadata information.",
    },
    {
        "name": "Pipeline Validation",
        "description": "Validating complete model topologies and simulating tensor passing block-by-block.",
    },
    {
        "name": "Shape Inference",
        "description": "Inferring intermediate layer dimensions and dataset shapes.",
    },
    {
        "name": "Dataset Catalog",
        "description": "Scanning, previewing, and retrieving catalog entries for datasets and transforms.",
    },
    {
        "name": "Design Intelligence",
        "description": "Recommending optimal loss functions, previewing learning rate schedulers, and suggesting metrics.",
    },
    {
        "name": "Training Engine",
        "description": "Controlling background training runs and streaming real-time metrics over Server-Sent Events (SSE).",
    },
    {
        "name": "Model Exporters",
        "description": "Exporting trained checkpoints to ONNX, PyTorch state_dict, and TorchScript formats.",
    },
    {
        "name": "Predictive Inference",
        "description": "Evaluating input samples using a compiled model loaded from checkpoints.",
    },
    {
        "name": "Experiment Comparison",
        "description": "Retrieving and comparing metrics across multiple historical runs.",
    },
]


def verify_api_key(request: Request):
    """Dependency to check for valid X-API-Key header, ignoring public health/docs paths."""
    if request.url.path in ["/health", "/api/docs", "/api/openapi.json", "/api/redoc"]:
        return

    # Check if authentication is disabled (useful for local development)
    if os.environ.get("WEAVE_ENGINE_DISABLE_AUTH", "false").lower() == "true":
        return

    expected_key = os.environ.get("WEAVE_ENGINE_API_KEY", "weave-default-key-12345")
    x_api_key = request.headers.get("X-API-Key")
    if x_api_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key header.",
        )


app = FastAPI(
    title=f"{title.capitalize()} API",
    description="Backend Neural Network Training, Validation, and Serving Engine.",
    version=version,
    openapi_tags=tags_metadata,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    dependencies=[Depends(verify_api_key)],
)


@app.get("/health", tags=["System Utilities"])
def health_check():
    """Returns the engine service health status, server time, and package version."""
    from datetime import datetime

    return {
        "status": "healthy",
        "version": version,
        "timestamp": datetime.now().isoformat(),
    }


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


@app.post(
    "/validate_pipeline",
    response_model=PipelineValidationResponse,
    tags=["Pipeline Validation"],
)
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


@app.post(
    "/infer/layer", response_model=ShapeInferenceResponse, tags=["Shape Inference"]
)
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


@app.post(
    "/infer/dataset",
    response_model=DatasetShapeInferenceResponse,
    tags=["Shape Inference"],
)
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


@app.get(
    "/datasets/catalog", response_model=DatasetCatalogResponse, tags=["Dataset Catalog"]
)
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


@app.get(
    "/transforms/catalog",
    response_model=TransformCatalogResponse,
    tags=["Dataset Catalog"],
)
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


@app.post(
    "/datasets/scan", response_model=DatasetScanResponse, tags=["Dataset Catalog"]
)
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


@app.post(
    "/datasets/preview", response_model=DatasetPreviewResponse, tags=["Dataset Catalog"]
)
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


@app.post(
    "/datasets/validate",
    response_model=DatasetValidateResponse,
    tags=["Dataset Catalog"],
)
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


@app.post(
    "/loss/suggest", response_model=LossSuggestionResponse, tags=["Design Intelligence"]
)
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


@app.post(
    "/optimizer/preview_lr_schedule",
    response_model=LRSchedulePreviewResponse,
    tags=["Design Intelligence"],
)
def preview_lr_schedule(request: LRSchedulePreviewRequest):
    """Simulates learning rate updates step-by-step for visualization.

    Args:
        request: LRSchedulePreviewRequest containing optimizer, scheduler, and total steps.

    Returns:
        LRSchedulePreviewResponse with step-by-step [step, lr] pairs.
    """
    try:
        # 1. Instantiate minimal dummy model (single parameter tensor) to speed up creation
        dummy_model = nn.Linear(1, 1)

        # 2. Instantiate optimizer using the factory
        optimizer = get_optimizer(
            dummy_model.parameters(),
            {"type": request.optimizer, "params": request.optimizer_params},
        )

        # 3. Instantiate scheduler config and scheduler
        sched_config = SchedulerConfig(
            type=request.scheduler, params=request.scheduler_params
        )
        scheduler = create_scheduler(
            optimizer, sched_config, epochs=1, steps_per_epoch=request.total_steps
        )

        if not scheduler:
            # If scheduler is None, return constant learning rate
            initial_lr = optimizer.param_groups[0]["lr"]
            schedule = [
                [float(step), float(initial_lr)] for step in range(request.total_steps)
            ]
            return LRSchedulePreviewResponse(schedule=schedule)

        # 4. Simulate step-by-step learning rate values
        schedule = []
        for step in range(request.total_steps):
            current_lr = optimizer.param_groups[0]["lr"]
            schedule.append([float(step), float(current_lr)])

            # Dummy step to satisfy PyTorch's step warning
            optimizer.step()

            # Update scheduler
            try:
                if scheduler.__class__.__name__ == "ReduceLROnPlateau":
                    # Pass a constant loss to trigger plateau decay
                    scheduler.step(1.0)
                else:
                    scheduler.step()
            except Exception as e:
                logger.warning(f"Error stepping scheduler in simulation: {e}")
                pass

        return LRSchedulePreviewResponse(schedule=schedule)

    except Exception as e:
        logger.exception("Failed to preview learning rate schedule.")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to simulate learning rate schedule: {str(e)}",
        ) from e


@app.post(
    "/metrics/suggest",
    response_model=MetricsSuggestionResponse,
    tags=["Design Intelligence"],
)
def suggest_metrics(request: MetricsSuggestionRequest):
    """Suggests validation metrics based on task type.

    Args:
        request: MetricsSuggestionRequest with task type and optional num classes.

    Returns:
        MetricsSuggestionResponse with suggested validation metrics.
    """
    task_type = request.task_type
    if task_type == "classification":
        suggested = ["Accuracy", "F1Score", "ConfusionMatrix"]
    elif task_type == "regression":
        suggested = ["MSE", "MAE", "R2Score"]
    elif task_type == "multi_label":
        suggested = ["Accuracy", "F1Score", "Precision", "Recall"]
    else:
        suggested = ["Accuracy"]

    return MetricsSuggestionResponse(suggested=suggested)


@app.post("/export/onnx", response_model=ExportResponse, tags=["Model Exporters"])
def export_onnx_endpoint(request: ExportRequest):
    """Exports a trained model graph to ONNX format.

    Args:
        request: ExportRequest with graph config, checkpoint, and output paths.

    Returns:
        ExportResponse with status and output path.
    """
    try:
        path = export_onnx(request)
        return ExportResponse(status="success", output_path=path)
    except Exception as e:
        logger.exception("ONNX export failed.")
        return ExportResponse(status="error", output_path="", message=str(e))


@app.post("/export/pytorch", response_model=ExportResponse, tags=["Model Exporters"])
def export_pytorch_endpoint(request: ExportRequest):
    """Exports a trained model graph weights (state_dict).

    Args:
        request: ExportRequest with graph config, checkpoint, and output paths.

    Returns:
        ExportResponse with status and output path.
    """
    try:
        path = export_pytorch(request)
        return ExportResponse(status="success", output_path=path)
    except Exception as e:
        logger.exception("PyTorch weights export failed.")
        return ExportResponse(status="error", output_path="", message=str(e))


@app.post(
    "/export/torchscript", response_model=ExportResponse, tags=["Model Exporters"]
)
def export_torchscript_endpoint(request: ExportRequest):
    """Exports a trained model graph to platform-independent TorchScript format.

    Args:
        request: ExportRequest with graph config, checkpoint, and output paths.

    Returns:
        ExportResponse with status and output path.
    """
    try:
        path = export_torchscript(request)
        return ExportResponse(status="success", output_path=path)
    except Exception as e:
        logger.exception("TorchScript export failed.")
        return ExportResponse(status="error", output_path="", message=str(e))


@app.post(
    "/inference/predict",
    response_model=InferenceResponse,
    tags=["Predictive Inference"],
)
def predict_endpoint(request: InferenceRequest):
    """Evaluates input samples using a compiled model loaded from a checkpoint.

    Args:
        request: InferenceRequest with graph, checkpoint_path, and input list.

    Returns:
        InferenceResponse with prediction values and predicted_class index.
    """
    import torch

    from compiler.exporter import load_checkpoint_model

    try:
        # Load the compiled model and place it on CPU first
        model = load_checkpoint_model(request.graph, request.checkpoint_path)

        # Handle device selection with fallback
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model.to(device)

        # Convert input array to PyTorch tensor
        input_tensor = torch.tensor(request.input, dtype=torch.float32).to(device)

        # Run forward pass under inference mode
        with torch.inference_mode():
            output = model(input_tensor)

        # Move outputs back to CPU for serialization
        output = output.cpu()

        # Handle batch dimension of size 1 if present
        if output.ndim > 1 and output.shape[0] == 1:
            output = output.squeeze(0)

        if output.ndim == 1:
            prediction = output.tolist()
            if len(prediction) > 1:
                predicted_class = int(output.argmax(dim=-1).item())
            else:
                predicted_class = None
        elif output.ndim == 0:
            prediction = [float(output.item())]
            predicted_class = None
        else:
            # Flatten multi-dimensional output batch
            prediction = output.flatten().tolist()
            predicted_class = int(output.argmax(dim=-1).flatten()[0].item())

        return InferenceResponse(prediction=prediction, predicted_class=predicted_class)

    except Exception as e:
        logger.exception("Inference prediction failed.")
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post(
    "/experiments/compare",
    response_model=ExperimentCompareResponse,
    tags=["Experiment Comparison"],
)
def compare_experiments(request: ExperimentCompareRequest):
    """Retrieves logs for multiple run IDs to compare their training progress.

    Args:
        request: ExperimentCompareRequest with run_ids and metrics list.

    Returns:
        ExperimentCompareResponse containing requested metrics for each run.
    """
    from typing import Any

    from training.experiments import get_run

    runs_data = []
    for run_id in request.run_ids:
        try:
            run = get_run(run_id)
            if run is None:
                logger.warning(f"Run {run_id} not found, skipping comparison.")
                continue

            run_dict: dict[str, Any] = {"run_id": run_id}
            # Extract historical values for each requested metric
            for metric in request.metrics:
                values = []
                for epoch_metrics in run.metrics_history:
                    if metric in epoch_metrics:
                        values.append(epoch_metrics[metric])
                run_dict[metric] = values

            runs_data.append(run_dict)
        except Exception as e:
            logger.warning(f"Error loading run {run_id} for comparison: {e}")
            continue

    return ExperimentCompareResponse(runs=runs_data)


# ---------------------------------------------------------------------------
# Training endpoints
# ---------------------------------------------------------------------------


@app.post("/training/start", tags=["Training Engine"])
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
        ) from e


@app.get("/training/stream/{run_id}", tags=["Training Engine"])
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
                    "event": msg["event"]
                    if "event" in msg
                    else msg.get("type", "step_metrics"),
                    "data": json.dumps(msg),
                }

                if msg.get("type") in [
                    "training_complete",
                    "training_failed",
                    "stopped",
                ]:
                    break
        except asyncio.CancelledError:
            logger.info(f"SSE stream cancelled for run_id: {run_id}")
        finally:
            trainer = runner.get_trainer(run_id)
            if trainer and trainer.status in ["completed", "failed", "stopped"]:
                runner.cleanup_run(run_id)

    return EventSourceResponse(event_generator())


@app.post("/training/control/{run_id}", tags=["Training Engine"])
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
            status_code=404,
            detail=f"Run ID {run_id} not found or action {action} failed.",
        )

    return {"status": "success", "action": action}


@app.get(
    "/training/status/{run_id}",
    response_model=TrainingStatusResponse,
    tags=["Training Engine"],
)
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
        status=status_val,  # type: ignore
        current_epoch=trainer.current_epoch,
        total_epochs=trainer.total_epochs,
        latest_metrics=trainer.latest_metrics,
    )


def main():
    """Start the Weave Engine FastAPI server with auto-reload enabled."""
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    main()
