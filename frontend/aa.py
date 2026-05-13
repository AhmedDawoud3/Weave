import json
import time
import os
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from pathlib import Path

batch_size = 32

transform = transforms.Compose(
    [
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,)),
    ]
)

train_dataset = datasets.MNIST(
    root="./data", train=True, download=True, transform=transform
)
test_dataset = datasets.MNIST(
    root="./data", train=False, download=True, transform=transform
)

train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class Net(nn.Module):
    def __init__(self):
        super().__init__()
        self.layer1 = nn.Flatten()
        self.layer2 = nn.Linear(784, 10)

    def forward(self, x):
        x = self.layer1(x)
        x = self.layer2(x)
        return x


# Setup checkpoint directory
checkpoint_dir = Path("checkpoints")
checkpoint_dir.mkdir(exist_ok=True)

# Training configuration
total_epochs = 5
print(
    json.dumps(
        {
            "type": "info",
            "message": "Starting training",
            "total_epochs": total_epochs,
            "device": str(device),
        }
    )
)

model = Net().to(device)

criterion = nn.CrossEntropyLoss()

optimizer = torch.optim.Adam(model.parameters(), lr=0.001)


def calculate_accuracy(model, loader):
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for data, target in loader:
            data, target = data.to(device), target.to(device)
            output = model(data)
            _, predicted = torch.max(output.data, 1)
            total += target.size(0)
            correct += (predicted == target).sum().item()
    return 100 * correct / total if total > 0 else 0


def train_one_epoch(epoch, total_epochs):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    total_batches = len(train_loader)
    epoch_start = time.time()

    for batch_idx, (data, target) in enumerate(train_loader):
        data, target = data.to(device), target.to(device)
        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()

        running_loss += loss.item()
        _, predicted = torch.max(output.data, 1)
        total += target.size(0)
        correct += (predicted == target).sum().item()

        # Report batch progress every 10 batches
        if (batch_idx + 1) % 10 == 0 or batch_idx == total_batches - 1:
            print(
                json.dumps(
                    {
                        "type": "batch",
                        "epoch": epoch,
                        "batch": batch_idx + 1,
                        "total_batches": total_batches,
                        "loss": running_loss / (batch_idx + 1),
                    }
                )
            )

    avg_loss = running_loss / max(1, total_batches)
    train_acc = 100 * correct / total if total > 0 else 0
    epoch_time = time.time() - epoch_start

    # Calculate validation accuracy
    val_acc = calculate_accuracy(model, test_loader)

    # Report epoch completion
    print(
        json.dumps(
            {
                "type": "epoch",
                "epoch": epoch,
                "train_loss": round(avg_loss, 4),
                "train_acc": round(train_acc, 2),
                "val_acc": round(val_acc, 2),
                "time": round(epoch_time, 2),
            }
        )
    )

    return avg_loss, train_acc, val_acc


def save_checkpoint(epoch, model, optimizer, loss, accuracy):
    checkpoint_path = checkpoint_dir / f"checkpoint_epoch_{epoch}.pt"
    torch.save(
        {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "loss": loss,
            "accuracy": accuracy,
        },
        checkpoint_path,
    )
    print(
        json.dumps(
            {
                "type": "checkpoint",
                "path": str(checkpoint_path),
                "epoch": epoch,
                "loss": round(loss, 4),
                "accuracy": round(accuracy, 2),
                "timestamp": int(time.time() * 1000),
            }
        )
    )


# Training loop
for epoch in range(1, total_epochs + 1):
    loss, train_acc, val_acc = train_one_epoch(epoch, total_epochs)
    save_checkpoint(epoch, model, optimizer, loss, val_acc)

print(json.dumps({"type": "complete", "message": "Training completed!"}))
