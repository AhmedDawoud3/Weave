import { v } from "convex/values";
import { action } from "./_generated/server";

// Layer parameters from shape inference
export interface LayerParams {
  inFeatures?: number;
  outFeatures?: number;
  inChannels?: number;
  outChannels?: number;
  kernelSize?: number | [number, number];
  stride?: number | [number, number];
  padding?: number | [number, number];
  poolSize?: number | [number, number];
  numEmbeddings?: number;
  embeddingDim?: number;
  hiddenSize?: number;
  numLayers?: number;
  numFeatures?: number;
}

export interface GraphNodeData {
  label?: string;
  dimensions?: string;
  subNodes?: GraphNode[];
  subEdges?: GraphEdge[];
  // Shape tracking fields from frontend
  inputShape?: number[];
  outputShape?: number[];
  shapeError?: string | null;
  params?: LayerParams;
  [key: string]: unknown;
}

export interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: GraphNodeData | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface PipelineConfig {
  dataset: string;
  batchSize: number;
  optimizer: string;
  learningRate: number;
  epochs: number;
}

// Convert label to valid Python class name
const toClassName = (label: string): string => {
  // Remove non-alphanumeric, capitalize words, remove spaces
  const cleaned = label
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
  return cleaned || "CustomModule";
};

// Generate code for a single module/subgraph
interface ModuleCodeResult {
  className: string;
  classCode: string;
}

const generateModuleCode = (
  moduleName: string,
  subNodes: GraphNode[],
  subEdges: GraphEdge[],
  existingClassNames: Set<string>
): ModuleCodeResult => {
  let className = toClassName(moduleName);
  
  // Ensure unique class name
  let suffix = 1;
  const baseClassName = className;
  while (existingClassNames.has(className)) {
    className = `${baseClassName}${suffix++}`;
  }
  existingClassNames.add(className);

  // Filter out module I/O nodes and sort topologically
  const layerNodes = subNodes.filter(
    (n) => n.type !== "moduleInput" && n.type !== "moduleOutput"
  );
  const orderedNodes = sortNodesTopologically(layerNodes, subEdges);

  const initLines: string[] = [];
  const forwardLines: string[] = [];

  initLines.push(`class ${className}(nn.Module):`);
  initLines.push("    def __init__(self):");
  initLines.push("        super().__init__()");

  forwardLines.push("    def forward(self, x):");

  let layerIndex = 1;

  const addLayer = (layerLine: string, forwardLine: string) => {
    initLines.push(`        ${layerLine}`);
    forwardLines.push(`        ${forwardLine}`);
  };

  for (const node of orderedNodes) {
    const label = getNodeLabel(node);
    const normalized = label.trim().toLowerCase();
    const dimensions = getNodeDimensions(node);
    const params = getNodeParams(node);

    if (normalized.includes("flatten")) {
      const layerName = `layer${layerIndex++}`;
      addLayer(`self.${layerName} = nn.Flatten()`, `x = self.${layerName}(x)`);
      continue;
    }

    if (normalized.includes("relu")) {
      forwardLines.push("        x = F.relu(x)");
      continue;
    }

    if (normalized.includes("sigmoid")) {
      forwardLines.push("        x = torch.sigmoid(x)");
      continue;
    }

    if (normalized.includes("linear") || normalized.includes("output")) {
      const { inFeatures, outFeatures } = parseLinearDims(dimensions, params);
      const layerName = `layer${layerIndex++}`;
      addLayer(
        `self.${layerName} = nn.Linear(${inFeatures}, ${outFeatures})`,
        `x = self.${layerName}(x)`
      );
      continue;
    }

    if (normalized.includes("conv")) {
      const { inChannels, outChannels, kernelSize, stride, padding } = parseConvDims(
        dimensions,
        params
      );
      const layerName = `layer${layerIndex++}`;
      const extraArgs: string[] = [];
      if (Number.isFinite(stride)) {
        extraArgs.push(`stride=${stride}`);
      }
      if (Number.isFinite(padding)) {
        extraArgs.push(`padding=${padding}`);
      }
      const argsList = [
        `${inChannels}`,
        `${outChannels}`,
        `${kernelSize}`,
        ...extraArgs,
      ];
      addLayer(
        `self.${layerName} = nn.Conv2d(${argsList.join(", ")})`,
        `x = self.${layerName}(x)`
      );
      continue;
    }

    // Default: Identity layer
    const layerName = `layer${layerIndex++}`;
    addLayer(`self.${layerName} = nn.Identity()`, `x = self.${layerName}(x)`);
  }

  if (forwardLines.length === 1) {
    initLines.push("        self.identity = nn.Identity()");
    forwardLines.push("        x = self.identity(x)");
  }

  forwardLines.push("        return x");

  const classCode = [...initLines, "", ...forwardLines].join("\n");
  return { className, classCode };
};

const getNodeLabel = (node: GraphNode): string => {
  if (node.data && typeof node.data.label === "string") {
    return node.data.label;
  }
  return node.type;
};

const getNodeDimensions = (node: GraphNode): string => {
  if (node.data && typeof node.data.dimensions === "string") {
    return node.data.dimensions;
  }
  return "";
};

// Get params from node data (from shape inference)
const getNodeParams = (node: GraphNode): LayerParams => {
  if (node.data && node.data.params) {
    return node.data.params;
  }
  return {};
};

const toNumberList = (input: string): number[] => {
  const matches = input.match(/-?\d+(\.\d+)?/g) ?? [];
  return matches
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
};

const parseKeyedNumbers = (input: string): Record<string, number> => {
  const result: Record<string, number> = {};
  const regex = /([a-zA-Z_]+)\s*:\s*(-?\d+(\.\d+)?)/g;
  let match = regex.exec(input);
  while (match) {
    result[match[1].toLowerCase()] = Number(match[2]);
    match = regex.exec(input);
  }
  return result;
};

// Parse Linear layer dimensions - uses params from shape inference if available
const parseLinearDims = (input: string, params?: LayerParams) => {
  // First check if we have inferred params
  if (params?.inFeatures !== undefined || params?.outFeatures !== undefined) {
    return {
      inFeatures: params.inFeatures ?? 128,
      outFeatures: params.outFeatures ?? 10,
    };
  }
  
  // Fall back to parsing dimensions string
  const keyed = parseKeyedNumbers(input);
  const numbers = toNumberList(input);
  const inFeatures = keyed.in ?? keyed.input ?? numbers[0] ?? 128;
  const outFeatures = keyed.out ?? keyed.output ?? numbers[1] ?? 10;
  return { inFeatures, outFeatures };
};

// Parse Conv layer dimensions - uses params from shape inference if available
const parseConvDims = (input: string, params?: LayerParams) => {
  // First check if we have inferred params
  if (params?.inChannels !== undefined || params?.outChannels !== undefined) {
    const kernelSize = typeof params.kernelSize === "number" 
      ? params.kernelSize 
      : (Array.isArray(params.kernelSize) ? params.kernelSize[0] : 3);
    const stride = typeof params.stride === "number"
      ? params.stride
      : (Array.isArray(params.stride) ? params.stride[0] : undefined);
    const padding = typeof params.padding === "number"
      ? params.padding
      : (Array.isArray(params.padding) ? params.padding[0] : undefined);
    
    return {
      inChannels: params.inChannels ?? 1,
      outChannels: params.outChannels ?? 32,
      kernelSize,
      stride,
      padding,
    };
  }
  
  // Fall back to parsing dimensions string
  const keyed = parseKeyedNumbers(input);
  const numbers = toNumberList(input);
  const inChannels = keyed.in ?? keyed.in_channels ?? numbers[0] ?? 1;
  const outChannels = keyed.out ?? keyed.out_channels ?? numbers[1] ?? 32;
  const kernelSize = keyed.k ?? keyed.kernel ?? keyed.kernel_size ?? numbers[2] ?? 3;
  const stride = keyed.stride ?? numbers[3];
  const padding = keyed.pad ?? keyed.padding ?? numbers[4];
  return { inChannels, outChannels, kernelSize, stride, padding };
};

const sortNodesTopologically = (nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] => {
  if (nodes.length <= 1) {
    return nodes;
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: GraphNode[] = [];
  for (const node of nodes) {
    if ((inDegree.get(node.id) ?? 0) === 0) {
      queue.push(node);
    }
  }

  const ordered: GraphNode[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    ordered.push(current);
    visited.add(current.id);
    const nextIds = adjacency.get(current.id) ?? [];
    for (const nextId of nextIds) {
      const nextDegree = (inDegree.get(nextId) ?? 0) - 1;
      inDegree.set(nextId, nextDegree);
      if (nextDegree === 0) {
        const nextNode = nodeMap.get(nextId);
        if (nextNode) {
          queue.push(nextNode);
        }
      }
    }
  }

  if (ordered.length !== nodes.length) {
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        ordered.push(node);
      }
    }
  }

  return ordered;
};

const toSafeNumber = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback;

const toSafeInt = (value: number, fallback: number) =>
  Number.isFinite(value) ? Math.max(1, Math.floor(value)) : fallback;

export const generateCode = action({
  args: {
    config: v.object({
      dataset: v.string(),
      batchSize: v.number(),
      optimizer: v.string(),
      learningRate: v.number(),
      epochs: v.number(),
    }),
    nodes: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        position: v.object({ x: v.number(), y: v.number() }),
        data: v.any(),
      })
    ),
    edges: v.array(
      v.object({
        id: v.string(),
        source: v.string(),
        target: v.string(),
      })
    ),
  },
  handler: async (_ctx, args) => {
    const config = args.config as PipelineConfig;
    const allNodes = args.nodes as GraphNode[];
    const allEdges = args.edges as GraphEdge[];
    const orderedNodes = sortNodesTopologically(allNodes, allEdges);

    const batchSize = toSafeInt(config.batchSize, 64);
    const learningRate = toSafeNumber(config.learningRate, 0.001);
    const epochs = toSafeInt(config.epochs, 5);
    const datasetKey = config.dataset.trim().toLowerCase();
    const optimizerKey = config.optimizer.trim().toLowerCase();

    const importLines = [
      "import json",
      "import time",
      "import os",
      "import torch",
      "import torch.nn as nn",
      "import torch.nn.functional as F",
      "from torch.utils.data import DataLoader",
      "from torchvision import datasets, transforms",
      "from pathlib import Path",
    ];

    const dataLines: string[] = [];
    dataLines.push(`batch_size = ${batchSize}`);
    if (datasetKey.includes("cifar")) {
      dataLines.push(
        String.raw`transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5)),
])`
      );
      dataLines.push(
        String.raw`train_dataset = datasets.CIFAR10(root="./data", train=True, download=True, transform=transform)
test_dataset = datasets.CIFAR10(root="./data", train=False, download=True, transform=transform)`
      );
    } else {
      dataLines.push(
        String.raw`transform = transforms.Compose([
    transforms.ToTensor(),
    transforms.Normalize((0.1307,), (0.3081,)),
])`
      );
      dataLines.push(
        String.raw`train_dataset = datasets.MNIST(root="./data", train=True, download=True, transform=transform)
test_dataset = datasets.MNIST(root="./data", train=False, download=True, transform=transform)`
      );
    }

    dataLines.push(
      String.raw`train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")`
    );

    // Collect all custom module class definitions
    const moduleClasses: string[] = [];
    const existingClassNames = new Set<string>(["Net"]); // Reserve Net for main class
    const nodeToClassName = new Map<string, string>(); // Map node ID to generated class name

    // First pass: generate module classes for custom nodes
    for (const node of orderedNodes) {
      if (node.type === "customNode" && node.data?.subNodes && Array.isArray(node.data.subNodes)) {
        const subNodes = node.data.subNodes as GraphNode[];
        const subEdges = (node.data.subEdges as GraphEdge[]) ?? [];
        const moduleName = getNodeLabel(node);
        
        if (subNodes.length > 0) {
          const { className, classCode } = generateModuleCode(
            moduleName,
            subNodes,
            subEdges,
            existingClassNames
          );
          moduleClasses.push(classCode);
          nodeToClassName.set(node.id, className);
        }
      }
    }

    // Generate main Net class
    const initLines: string[] = [];
    const forwardLines: string[] = [];

    initLines.push("class Net(nn.Module):");
    initLines.push("    def __init__(self):");
    initLines.push("        super().__init__()");

    forwardLines.push("    def forward(self, x):");

    let layerIndex = 1;

    const addLayer = (layerLine: string, forwardLine: string) => {
      initLines.push(`        ${layerLine}`);
      forwardLines.push(`        ${forwardLine}`);
    };

    for (const node of orderedNodes) {
      // Handle custom nodes (modules)
      if (node.type === "customNode") {
        const className = nodeToClassName.get(node.id);
        if (className) {
          const layerName = `module${layerIndex++}`;
          addLayer(`self.${layerName} = ${className}()`, `x = self.${layerName}(x)`);
        }
        continue;
      }

      const label = getNodeLabel(node);
      const normalized = label.trim().toLowerCase();
      const isIONode =
        node.type === "inputNode" ||
        node.type === "outputNode" ||
        node.data?.isIO === true ||
        normalized === "input" ||
        normalized === "output";

      if (isIONode) {
        continue;
      }
      const dimensions = getNodeDimensions(node);
      const params = getNodeParams(node);

      if (normalized.includes("flatten")) {
        const layerName = `layer${layerIndex++}`;
        addLayer(`self.${layerName} = nn.Flatten()`, `x = self.${layerName}(x)`);
        continue;
      }

      if (normalized.includes("relu")) {
        forwardLines.push("        x = F.relu(x)");
        continue;
      }

      if (normalized.includes("sigmoid")) {
        forwardLines.push("        x = torch.sigmoid(x)");
        continue;
      }

      if (normalized.includes("linear")) {
        const { inFeatures, outFeatures } = parseLinearDims(dimensions, params);
        const layerName = `layer${layerIndex++}`;
        addLayer(
          `self.${layerName} = nn.Linear(${inFeatures}, ${outFeatures})`,
          `x = self.${layerName}(x)`
        );
        continue;
      }

      if (normalized.includes("conv")) {
        const { inChannels, outChannels, kernelSize, stride, padding } = parseConvDims(
          dimensions,
          params
        );
        const layerName = `layer${layerIndex++}`;
        const extraArgs: string[] = [];
        if (Number.isFinite(stride)) {
          extraArgs.push(`stride=${stride}`);
        }
        if (Number.isFinite(padding)) {
          extraArgs.push(`padding=${padding}`);
        }
        const argsList = [
          `${inChannels}`,
          `${outChannels}`,
          `${kernelSize}`,
          ...extraArgs,
        ];
        addLayer(`self.${layerName} = nn.Conv2d(${argsList.join(", ")})`, `x = self.${layerName}(x)`);
        continue;
      }

      const layerName = `layer${layerIndex++}`;
      addLayer(`self.${layerName} = nn.Identity()`, `x = self.${layerName}(x)`);
    }

    if (forwardLines.length === 1) {
      initLines.push("        self.identity = nn.Identity()");
      forwardLines.push("        x = self.identity(x)");
    }

    forwardLines.push("        return x");

    // Combine module classes and main Net class
    const allModelLines = [
      ...moduleClasses,
      "",
      [...initLines, "", ...forwardLines].join("\n"),
    ].filter(Boolean).join("\n\n");

    const trainingLines: string[] = [];
    
    // Setup checkpoint directory
    trainingLines.push(`# Setup checkpoint directory
checkpoint_dir = Path("checkpoints")
checkpoint_dir.mkdir(exist_ok=True)

# Training configuration
total_epochs = ${epochs}
print(json.dumps({"type": "info", "message": "Starting training", "total_epochs": total_epochs, "device": str(device)}))`);

    trainingLines.push("model = Net().to(device)");
    trainingLines.push("criterion = nn.CrossEntropyLoss()");
    if (optimizerKey.includes("sgd")) {
      trainingLines.push(
        `optimizer = torch.optim.SGD(model.parameters(), lr=${learningRate}, momentum=0.9)`
      );
    } else {
      trainingLines.push(
        `optimizer = torch.optim.Adam(model.parameters(), lr=${learningRate})`
      );
    }

    trainingLines.push(
      String.raw`def calculate_accuracy(model, loader):
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
            print(json.dumps({
                "type": "batch",
                "epoch": epoch,
                "batch": batch_idx + 1,
                "total_batches": total_batches,
                "loss": running_loss / (batch_idx + 1)
            }))
    
    avg_loss = running_loss / max(1, total_batches)
    train_acc = 100 * correct / total if total > 0 else 0
    epoch_time = time.time() - epoch_start
    
    # Calculate validation accuracy
    val_acc = calculate_accuracy(model, test_loader)
    
    # Report epoch completion
    print(json.dumps({
        "type": "epoch",
        "epoch": epoch,
        "train_loss": round(avg_loss, 4),
        "train_acc": round(train_acc, 2),
        "val_acc": round(val_acc, 2),
        "time": round(epoch_time, 2)
    }))
    
    return avg_loss, train_acc, val_acc

def save_checkpoint(epoch, model, optimizer, loss, accuracy):
    checkpoint_path = checkpoint_dir / f"checkpoint_epoch_{epoch}.pt"
    torch.save({
        "epoch": epoch,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "loss": loss,
        "accuracy": accuracy,
    }, checkpoint_path)
    print(json.dumps({
        "type": "checkpoint",
        "path": str(checkpoint_path),
        "epoch": epoch,
        "loss": round(loss, 4),
        "accuracy": round(accuracy, 2),
        "timestamp": int(time.time() * 1000)
    }))

# Training loop
for epoch in range(1, total_epochs + 1):
    loss, train_acc, val_acc = train_one_epoch(epoch, total_epochs)
    save_checkpoint(epoch, model, optimizer, loss, val_acc)

print(json.dumps({"type": "complete", "message": "Training completed!"}))`
    );

    return [
      importLines.join("\n"),
      dataLines.join("\n\n"),
      allModelLines,
      trainingLines.join("\n\n"),
    ].join("\n\n");
  },
});
