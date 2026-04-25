import uvicorn
from fastapi import FastAPI

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

app = FastAPI(title="Weave Engine API", version="1.0.0")
compiler = GraphCompiler()


@app.post("/validate_pipeline", response_model=PipelineValidationResponse)
def validate_pipeline(request: PipelineValidationRequest):
    """
    Simulates dummy tensor passing through the graph to evaluate shapes block-by-block.
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
    """
    Compute the output shape of a single layer or block given its input shape.
    Supports multi-input layers (Add, Concat, Multiply) via input_shapes.
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
    """
    Compute the per-sample and batch tensor shapes for a dataset configuration.
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
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    main()
