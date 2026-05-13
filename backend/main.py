import os
import queue
import subprocess
import threading
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI(
    title="Weave Execution Engine",
    description="PyTorch execution engine for the Weave Neural Network Editor",
    version="0.1.0",
)


def _get_allowed_origins() -> list[str]:
    raw_origins = os.getenv("ALLOWED_ORIGINS")
    if raw_origins:
        return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return ["http://localhost:5173", "http://127.0.0.1:5173"]


# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RunRequest(BaseModel):
    code: str


class ShapeRequest(BaseModel):
    dataset: str
    custom_path: str | None = None


class DownloadRequest(BaseModel):
    dataset: str


class DatasetStatusRequest(BaseModel):
    dataset: str


# Known dataset shapes (fallback when Python execution fails)
DATASET_SHAPES: dict[str, dict] = {
    "MNIST": {"input_shape": [1, 28, 28], "num_classes": 10},
    "FashionMNIST": {"input_shape": [1, 28, 28], "num_classes": 10},
    "CIFAR-10": {"input_shape": [3, 32, 32], "num_classes": 10},
    "CIFAR-100": {"input_shape": [3, 32, 32], "num_classes": 100},
    "ImageNet": {"input_shape": [3, 224, 224], "num_classes": 1000},
}


def _enqueue_stream(stream, stream_queue: queue.Queue, label: str) -> None:
    for line in iter(stream.readline, ""):
        if line:
            stream_queue.put((label, line))
    stream.close()


def _stream_process(proc: subprocess.Popen):
    stream_queue: queue.Queue = queue.Queue()
    threads: list[threading.Thread] = []

    if proc.stdout is not None:
        thread = threading.Thread(
            target=_enqueue_stream,
            args=(proc.stdout, stream_queue, "stdout"),
            daemon=True,
        )
        thread.start()
        threads.append(thread)

    if proc.stderr is not None:
        thread = threading.Thread(
            target=_enqueue_stream,
            args=(proc.stderr, stream_queue, "stderr"),
            daemon=True,
        )
        thread.start()
        threads.append(thread)

    while True:
        if (
            all(not thread.is_alive() for thread in threads)
            and stream_queue.empty()
        ):
            break
        try:
            label, line = stream_queue.get(timeout=0.1)
            yield f"[{label}] {line}"
        except queue.Empty:
            continue

    proc.wait()


@app.get("/")
async def root():
    return {
        "message": "Hello World",
        "status": "Weave Execution Engine is running!",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/run")
def run_code(payload: RunRequest):
    script_path = Path(__file__).resolve().parent / "temp_script.py"
    script_path.write_text(payload.code, encoding="utf-8")

    process = subprocess.Popen(
        ["uv", "run", "python", "-u", "temp_script.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        cwd=script_path.parent,
    )

    return StreamingResponse(_stream_process(process), media_type="text/plain")


def _generate_shape_detection_code(dataset: str, custom_path: str | None) -> str:
    """Generate Python code to detect dataset input shape."""
    dataset_lower = dataset.lower().replace("-", "").replace(" ", "")
    
    if custom_path:
        # Custom ImageFolder dataset
        return f'''
import json
from torchvision import datasets, transforms

transform = transforms.ToTensor()
dataset = datasets.ImageFolder("{custom_path}", transform=transform)
sample, label = dataset[0]
input_shape = list(sample.shape)
num_classes = len(dataset.classes)
print(json.dumps({{"input_shape": input_shape, "num_classes": num_classes}}))
'''
    
    # Standard torchvision datasets
    dataset_map = {
        "mnist": ("MNIST", "datasets.MNIST(root='./data', train=True, download=True, transform=transform)"),
        "fashionmnist": ("FashionMNIST", "datasets.FashionMNIST(root='./data', train=True, download=True, transform=transform)"),
        "cifar10": ("CIFAR-10", "datasets.CIFAR10(root='./data', train=True, download=True, transform=transform)"),
        "cifar100": ("CIFAR-100", "datasets.CIFAR100(root='./data', train=True, download=True, transform=transform)"),
    }
    
    if dataset_lower not in dataset_map:
        # Return code that just outputs fallback
        return f'''
import json
print(json.dumps({{"error": "Unknown dataset: {dataset}"}}))
'''
    
    _, loader_code = dataset_map[dataset_lower]
    
    return f'''
import json
from torchvision import datasets, transforms

transform = transforms.ToTensor()
dataset = {loader_code}
sample, label = dataset[0]
input_shape = list(sample.shape)
num_classes = len(dataset.classes) if hasattr(dataset, 'classes') else 10
print(json.dumps({{"input_shape": input_shape, "num_classes": num_classes}}))
'''


@app.post("/shape")
def get_shape(payload: ShapeRequest):
    """Detect the input shape of a dataset by running a Python snippet."""
    import json as json_module
    
    # First, try to use fallback for known datasets (faster)
    dataset_key = payload.dataset.replace(" ", "")
    if dataset_key in DATASET_SHAPES and not payload.custom_path:
        return DATASET_SHAPES[dataset_key]
    
    # Generate and run the detection code
    code = _generate_shape_detection_code(payload.dataset, payload.custom_path)
    script_path = Path(__file__).resolve().parent / "shape_detect.py"
    script_path.write_text(code, encoding="utf-8")
    
    try:
        result = subprocess.run(
            ["uv", "run", "python", "-u", "shape_detect.py"],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=script_path.parent,
        )
        
        if result.returncode == 0 and result.stdout.strip():
            try:
                return json_module.loads(result.stdout.strip())
            except json_module.JSONDecodeError:
                pass
        
        # Fallback to known shapes
        if dataset_key in DATASET_SHAPES:
            return DATASET_SHAPES[dataset_key]
        
        return {"error": f"Failed to detect shape: {result.stderr or 'Unknown error'}"}
    
    except subprocess.TimeoutExpired:
        return {"error": "Shape detection timed out"}
    except Exception as e:
        # Fallback to known shapes
        if dataset_key in DATASET_SHAPES:
            return DATASET_SHAPES[dataset_key]
        return {"error": str(e)}


def _get_dataset_path(dataset: str) -> Path | None:
    """Get the expected path for a dataset."""
    data_dir = Path(__file__).resolve().parent / "data"
    dataset_lower = dataset.lower().replace("-", "").replace(" ", "")
    
    dataset_paths = {
        "mnist": data_dir / "MNIST",
        "fashionmnist": data_dir / "FashionMNIST",
        "cifar10": data_dir / "cifar-10-batches-py",
        "cifar100": data_dir / "cifar-100-python",
    }
    
    return dataset_paths.get(dataset_lower)


def _is_dataset_downloaded(dataset: str) -> bool:
    """Check if a dataset is already downloaded."""
    path = _get_dataset_path(dataset)
    if path is None:
        return False
    return path.exists() and any(path.iterdir()) if path.exists() else False


@app.post("/dataset/status")
def get_dataset_status(payload: DatasetStatusRequest):
    """Check if a dataset is downloaded."""
    dataset_lower = payload.dataset.lower().replace("-", "").replace(" ", "")
    
    # Custom datasets are always considered "downloaded" (user provides path)
    if "custom" in dataset_lower or "imagefolder" in dataset_lower:
        return {"downloaded": True, "dataset": payload.dataset}
    
    # ImageNet is too large - always show as not downloadable through UI
    if dataset_lower == "imagenet":
        return {
            "downloaded": False, 
            "dataset": payload.dataset,
            "message": "ImageNet must be downloaded manually due to its size"
        }
    
    is_downloaded = _is_dataset_downloaded(payload.dataset)
    return {"downloaded": is_downloaded, "dataset": payload.dataset}


def _generate_download_code(dataset: str) -> str:
    """Generate Python code to download a dataset with progress output."""
    dataset_lower = dataset.lower().replace("-", "").replace(" ", "")
    
    dataset_map = {
        "mnist": "datasets.MNIST(root='./data', train=True, download=True)",
        "fashionmnist": "datasets.FashionMNIST(root='./data', train=True, download=True)",
        "cifar10": "datasets.CIFAR10(root='./data', train=True, download=True)",
        "cifar100": "datasets.CIFAR100(root='./data', train=True, download=True)",
    }
    
    if dataset_lower not in dataset_map:
        return f'''
import json
print(json.dumps({{"type": "error", "message": "Unknown dataset: {dataset}"}}))
'''
    
    loader_code = dataset_map[dataset_lower]
    
    return f'''
import json
import sys

print(json.dumps({{"type": "start", "dataset": "{dataset}"}}))
sys.stdout.flush()

try:
    from torchvision import datasets
    print(json.dumps({{"type": "progress", "message": "Downloading {dataset}..."}}))
    sys.stdout.flush()
    
    dataset = {loader_code}
    
    print(json.dumps({{"type": "complete", "dataset": "{dataset}", "success": True}}))
    sys.stdout.flush()
except Exception as e:
    print(json.dumps({{"type": "error", "message": str(e)}}))
    sys.stdout.flush()
'''


@app.post("/dataset/download")
def download_dataset(payload: DownloadRequest):
    """Download a dataset with streaming progress."""
    dataset_lower = payload.dataset.lower().replace("-", "").replace(" ", "")
    
    # Check if already downloaded
    if _is_dataset_downloaded(payload.dataset):
        import json
        return {"type": "complete", "dataset": payload.dataset, "success": True, "message": "Already downloaded"}
    
    # ImageNet cannot be downloaded through UI
    if dataset_lower == "imagenet":
        return {"type": "error", "message": "ImageNet must be downloaded manually"}
    
    # Generate and run download code
    code = _generate_download_code(payload.dataset)
    script_path = Path(__file__).resolve().parent / "download_dataset.py"
    script_path.write_text(code, encoding="utf-8")
    
    process = subprocess.Popen(
        ["uv", "run", "python", "-u", "download_dataset.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        cwd=script_path.parent,
    )
    
    return StreamingResponse(_stream_process(process), media_type="text/plain")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
