/**
 * Utility to generate PyTorch code snippets for individual nodes.
 * Used for hover previews in the editor.
 */

export interface NodeCodeInfo {
  initCode: string | null; // e.g., "self.layer1 = nn.Linear(784, 128)"
  forwardCode: string;     // e.g., "x = self.layer1(x)" or "x = F.relu(x)"
}

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

const parseLinearDims = (input: string) => {
  const keyed = parseKeyedNumbers(input);
  const numbers = toNumberList(input);
  const inFeatures = keyed.in ?? keyed.input ?? numbers[0] ?? 128;
  const outFeatures = keyed.out ?? keyed.output ?? numbers[1] ?? 10;
  return { inFeatures, outFeatures };
};

const parseConvDims = (input: string) => {
  const keyed = parseKeyedNumbers(input);
  const numbers = toNumberList(input);
  const inChannels = keyed.in ?? keyed.in_channels ?? numbers[0] ?? 1;
  const outChannels = keyed.out ?? keyed.out_channels ?? numbers[1] ?? 32;
  const kernelSize = keyed.k ?? keyed.kernel ?? keyed.kernel_size ?? numbers[2] ?? 3;
  const stride = keyed.stride ?? numbers[3];
  const padding = keyed.pad ?? keyed.padding ?? numbers[4];
  return { inChannels, outChannels, kernelSize, stride, padding };
};

/**
 * Generate PyTorch code snippet for a single node.
 * @param label - The node label (e.g., "Linear", "ReLU", "Conv2d")
 * @param dimensions - Optional dimensions string (e.g., "in: 784, out: 128")
 * @param layerName - Optional layer name (defaults to "layer")
 */
export function generateNodeCode(
  label: string,
  dimensions: string = '',
  layerName: string = 'layer'
): NodeCodeInfo {
  const normalized = label.trim().toLowerCase();

  // Flatten
  if (normalized.includes('flatten')) {
    return {
      initCode: `self.${layerName} = nn.Flatten()`,
      forwardCode: `x = self.${layerName}(x)`,
    };
  }

  // ReLU (activation - no init needed)
  if (normalized.includes('relu')) {
    return {
      initCode: null,
      forwardCode: 'x = F.relu(x)',
    };
  }

  // Sigmoid (activation - no init needed)
  if (normalized.includes('sigmoid')) {
    return {
      initCode: null,
      forwardCode: 'x = torch.sigmoid(x)',
    };
  }

  // Tanh (activation - no init needed)
  if (normalized.includes('tanh')) {
    return {
      initCode: null,
      forwardCode: 'x = torch.tanh(x)',
    };
  }

  // Softmax
  if (normalized.includes('softmax')) {
    return {
      initCode: null,
      forwardCode: 'x = F.softmax(x, dim=1)',
    };
  }

  // Linear layer
  if (normalized.includes('linear') || normalized.includes('output') || normalized.includes('fc') || normalized.includes('dense')) {
    const { inFeatures, outFeatures } = parseLinearDims(dimensions);
    return {
      initCode: `self.${layerName} = nn.Linear(${inFeatures}, ${outFeatures})`,
      forwardCode: `x = self.${layerName}(x)`,
    };
  }

  // Conv2d layer
  if (normalized.includes('conv')) {
    const { inChannels, outChannels, kernelSize, stride, padding } = parseConvDims(dimensions);
    const extraArgs: string[] = [];
    if (Number.isFinite(stride)) {
      extraArgs.push(`stride=${stride}`);
    }
    if (Number.isFinite(padding)) {
      extraArgs.push(`padding=${padding}`);
    }
    const argsList = [`${inChannels}`, `${outChannels}`, `${kernelSize}`, ...extraArgs];
    return {
      initCode: `self.${layerName} = nn.Conv2d(${argsList.join(', ')})`,
      forwardCode: `x = self.${layerName}(x)`,
    };
  }

  // MaxPool2d
  if (normalized.includes('maxpool') || normalized.includes('max_pool')) {
    const numbers = toNumberList(dimensions);
    const kernelSize = numbers[0] ?? 2;
    return {
      initCode: `self.${layerName} = nn.MaxPool2d(${kernelSize})`,
      forwardCode: `x = self.${layerName}(x)`,
    };
  }

  // AvgPool2d
  if (normalized.includes('avgpool') || normalized.includes('avg_pool')) {
    const numbers = toNumberList(dimensions);
    const kernelSize = numbers[0] ?? 2;
    return {
      initCode: `self.${layerName} = nn.AvgPool2d(${kernelSize})`,
      forwardCode: `x = self.${layerName}(x)`,
    };
  }

  // BatchNorm2d
  if (normalized.includes('batchnorm') || normalized.includes('bn')) {
    const numbers = toNumberList(dimensions);
    const numFeatures = numbers[0] ?? 64;
    return {
      initCode: `self.${layerName} = nn.BatchNorm2d(${numFeatures})`,
      forwardCode: `x = self.${layerName}(x)`,
    };
  }

  // Dropout
  if (normalized.includes('dropout')) {
    const numbers = toNumberList(dimensions);
    const p = numbers[0] ?? 0.5;
    return {
      initCode: `self.${layerName} = nn.Dropout(p=${p})`,
      forwardCode: `x = self.${layerName}(x)`,
    };
  }

  // Default: Identity
  return {
    initCode: `self.${layerName} = nn.Identity()`,
    forwardCode: `x = self.${layerName}(x)`,
  };
}

/**
 * Format node code for display in tooltip
 */
export function formatNodeCodePreview(label: string, dimensions: string = ''): string {
  const { initCode, forwardCode } = generateNodeCode(label, dimensions);
  
  if (initCode) {
    return `# __init__\n${initCode}\n\n# forward\n${forwardCode}`;
  }
  
  return `# forward\n${forwardCode}`;
}
