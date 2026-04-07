from dataset.dataset_factory import get_dataset
from dataset.transform_factory import build_transforms
from dataset.registry import list_predefined_datasets
from dataset.scanner import scan_folder
from dataset.dataloader import create_dataloader

print("Available datasets:")
print(list_predefined_datasets())

transform_json = [
    {"type": "Resize", "params": {"size": 128}},
    {"type": "ToTensor", "params": {}}
]

print("\nBuilding transforms...")
transform = build_transforms(transform_json)

print("\nLoading dataset...")
dataset = get_dataset("MNIST", "./data", transform=transform)

print("\nCreating DataLoader...")
loader = create_dataloader(dataset)

print("\nTesting one batch...")
for x, y in loader:
    print("Input shape:", x.shape)
    print("Labels shape:", y.shape)
    break

print("\nScanning folder...")
print(scan_folder("./data"))