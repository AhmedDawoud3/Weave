import os
from importlib.metadata import metadata

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from compiler.compiler import GraphCompiler
from dataset.shape_inference import infer_dataset_shape
from schemas import (
    DatasetShapeInferenceRequest,
    DatasetShapeInferenceResponse,
    PipelineValidationRequest,
    PipelineValidationResponse,
    ShapeInferenceRequest,
    ShapeInferenceResponse,
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

compiler = GraphCompiler()

# Serve MkDocs-built documentation at /docs (if the site has been built)
_site_dir = os.path.join(os.path.dirname(__file__), "site")
if os.path.isdir(_site_dir):
    app.mount("/docs", StaticFiles(directory=_site_dir, html=True), name="docs")


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


def main():
    """Start the Weave Engine FastAPI server with auto-reload enabled."""
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    main()
