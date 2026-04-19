import uvicorn
from fastapi import FastAPI

from compiler.compiler import GraphCompiler
from schemas import PipelineValidationRequest, PipelineValidationResponse

app = FastAPI(title="Weave Engine API", version="1.0.0")
compiler = GraphCompiler()


@app.post("/validate_pipeline", response_model=PipelineValidationResponse)
def validate_pipeline(request: PipelineValidationRequest):
    """
    Simulates dummy tensor passing through the graph to evaluate shapes block-by-block.
    """
    try:
        # Compiler has validate_pipeline which returns the dict matching our schema
        result = compiler.validate_pipeline(request.graph, request.input_shape)
        return PipelineValidationResponse(**result)
    except Exception as e:
        return PipelineValidationResponse(
            status="error",
            message=f"Oops! Something went wrong in the engine. Try refreshing your network. Technical details: {str(e)}",
        )


def main():
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)


if __name__ == "__main__":
    main()
