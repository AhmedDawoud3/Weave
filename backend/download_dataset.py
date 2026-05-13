
import json
import sys

print(json.dumps({"type": "start", "dataset": "CIFAR-10"}))
sys.stdout.flush()

try:
    from torchvision import datasets
    print(json.dumps({"type": "progress", "message": "Downloading CIFAR-10..."}))
    sys.stdout.flush()
    
    dataset = datasets.CIFAR10(root='./data', train=True, download=True)
    
    print(json.dumps({"type": "complete", "dataset": "CIFAR-10", "success": True}))
    sys.stdout.flush()
except Exception as e:
    print(json.dumps({"type": "error", "message": str(e)}))
    sys.stdout.flush()
