import type { TensorShape, LayerParams, NodeShapeInfo, EdgeValidation } from '../store/shapeStore';

// Layer type as defined in ModelCanvas
export type NNLayerType =
  | 'Input'
  | 'Output'
  | 'Linear'
  | 'Conv2d'
  | 'Conv1d'
  | 'ConvTranspose2d'
  | 'MaxPool2d'
  | 'AvgPool2d'
  | 'BatchNorm1d'
  | 'BatchNorm2d'
  | 'LayerNorm'
  | 'Dropout'
  | 'Flatten'
  | 'ReLU'
  | 'LeakyReLU'
  | 'Sigmoid'
  | 'Tanh'
  | 'Softmax'
  | 'LSTM'
  | 'GRU'
  | 'Embedding'
  | 'CustomModule';

// Node structure for inference
export interface ShapeNode {
  id: string;
  type: string;
  data: {
    label: string;
    type: NNLayerType;
    params?: LayerParams;
    inputShape?: TensorShape;
    outputShape?: TensorShape;
    [key: string]: unknown;
  };
}

export interface ShapeEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

// Helper to convert tuple-like param to array
function toTuple(value: number | [number, number] | undefined, defaultVal: number): [number, number] {
  if (value === undefined) return [defaultVal, defaultVal];
  if (Array.isArray(value)) return value;
  return [value, value];
}

// Calculate output shape for Conv2d
function calcConv2dOutput(
  inputShape: TensorShape,
  params: LayerParams
): { shape: TensorShape; error: string | null } {
  // Input should be [C, H, W] or [B, C, H, W]
  if (inputShape.length < 3) {
    return { shape: [], error: `Conv2d requires at least 3D input, got ${inputShape.length}D` };
  }

  const [kH, kW] = toTuple(params.kernelSize, 3);
  const [sH, sW] = toTuple(params.stride, 1);
  const [pH, pW] = toTuple(params.padding, 0);
  const outChannels = params.outChannels ?? 32;

  // Get H, W from input (last two dimensions)
  const H = inputShape[inputShape.length - 2];
  const W = inputShape[inputShape.length - 1];

  // Formula: output_size = floor((input_size + 2*padding - kernel_size) / stride) + 1
  const H_out = Math.floor((H + 2 * pH - kH) / sH) + 1;
  const W_out = Math.floor((W + 2 * pW - kW) / sW) + 1;

  if (H_out <= 0 || W_out <= 0) {
    return { 
      shape: [], 
      error: `Invalid Conv2d parameters: output size would be ${H_out}x${W_out}` 
    };
  }

  // Preserve batch dimension if present
  if (inputShape.length === 4) {
    return { shape: [inputShape[0], outChannels, H_out, W_out], error: null };
  }
  return { shape: [outChannels, H_out, W_out], error: null };
}

// Calculate output shape for Conv1d
function calcConv1dOutput(
  inputShape: TensorShape,
  params: LayerParams
): { shape: TensorShape; error: string | null } {
  // Input should be [C, L] or [B, C, L]
  if (inputShape.length < 2) {
    return { shape: [], error: `Conv1d requires at least 2D input, got ${inputShape.length}D` };
  }

  const kernel = typeof params.kernelSize === 'number' ? params.kernelSize : (params.kernelSize?.[0] ?? 3);
  const stride = typeof params.stride === 'number' ? params.stride : (params.stride?.[0] ?? 1);
  const padding = typeof params.padding === 'number' ? params.padding : (params.padding?.[0] ?? 0);
  const outChannels = params.outChannels ?? 32;

  const L = inputShape[inputShape.length - 1];
  const L_out = Math.floor((L + 2 * padding - kernel) / stride) + 1;

  if (L_out <= 0) {
    return { shape: [], error: `Invalid Conv1d parameters: output length would be ${L_out}` };
  }

  if (inputShape.length === 3) {
    return { shape: [inputShape[0], outChannels, L_out], error: null };
  }
  return { shape: [outChannels, L_out], error: null };
}

// Calculate output shape for pooling layers
function calcPool2dOutput(
  inputShape: TensorShape,
  params: LayerParams
): { shape: TensorShape; error: string | null } {
  if (inputShape.length < 3) {
    return { shape: [], error: `Pool2d requires at least 3D input, got ${inputShape.length}D` };
  }

  const [kH, kW] = toTuple(params.poolSize ?? params.kernelSize, 2);
  const [sH, sW] = toTuple(params.stride, kH); // Default stride = kernel size for pooling
  const [pH, pW] = toTuple(params.padding, 0);

  const C = inputShape[inputShape.length - 3];
  const H = inputShape[inputShape.length - 2];
  const W = inputShape[inputShape.length - 1];

  const H_out = Math.floor((H + 2 * pH - kH) / sH) + 1;
  const W_out = Math.floor((W + 2 * pW - kW) / sW) + 1;

  if (H_out <= 0 || W_out <= 0) {
    return { shape: [], error: `Invalid Pool2d parameters: output size would be ${H_out}x${W_out}` };
  }

  if (inputShape.length === 4) {
    return { shape: [inputShape[0], C, H_out, W_out], error: null };
  }
  return { shape: [C, H_out, W_out], error: null };
}

// Calculate output shape for Linear layer
function calcLinearOutput(
  inputShape: TensorShape,
  params: LayerParams
): { shape: TensorShape; error: string | null } {
  const outFeatures = params.outFeatures ?? 10;
  const inFeatures = params.inFeatures;

  // Get the last dimension of input
  const inputLastDim = inputShape[inputShape.length - 1];

  // Validate input size if inFeatures is specified
  if (inFeatures !== undefined && inputLastDim !== inFeatures) {
    return { 
      shape: [], 
      error: `Linear layer expects ${inFeatures} input features, but got ${inputLastDim}` 
    };
  }

  // Output shape: replace last dimension with outFeatures
  const outputShape = [...inputShape.slice(0, -1), outFeatures];
  return { shape: outputShape, error: null };
}

// Calculate output shape for Flatten
function calcFlattenOutput(
  inputShape: TensorShape
): { shape: TensorShape; error: string | null } {
  if (inputShape.length === 0) {
    return { shape: [], error: 'Cannot flatten empty shape' };
  }

  // Flatten all dimensions except batch (if present)
  // Assume first dim is batch if length > 1
  if (inputShape.length === 1) {
    return { shape: inputShape, error: null };
  }

  // Keep batch dimension, flatten the rest
  const batchSize = inputShape[0];
  const flatSize = inputShape.slice(1).reduce((a, b) => a * b, 1);
  
  return { shape: [batchSize, flatSize], error: null };
}

// Calculate output shape for Embedding
function calcEmbeddingOutput(
  inputShape: TensorShape,
  params: LayerParams
): { shape: TensorShape; error: string | null } {
  const embeddingDim = params.embeddingDim ?? 128;
  
  // Embedding adds a dimension at the end
  return { shape: [...inputShape, embeddingDim], error: null };
}

// Calculate output shape for LSTM/GRU
function calcRecurrentOutput(
  inputShape: TensorShape,
  params: LayerParams,
  layerType: 'LSTM' | 'GRU'
): { shape: TensorShape; error: string | null } {
  const hiddenSize = params.hiddenSize ?? 128;
  
  // Input: [batch, seq_len, input_size] or [seq_len, input_size]
  // Output: [batch, seq_len, hidden_size * num_directions]
  if (inputShape.length < 2) {
    return { shape: [], error: `${layerType} requires at least 2D input` };
  }

  const outputShape = [...inputShape.slice(0, -1), hiddenSize];
  return { shape: outputShape, error: null };
}

// Calculate output shape for BatchNorm
function calcBatchNormOutput(
  inputShape: TensorShape,
  params: LayerParams,
  layerType: 'BatchNorm1d' | 'BatchNorm2d'
): { shape: TensorShape; error: string | null } {
  // BatchNorm doesn't change shape, but we validate the channel dimension
  const numFeatures = params.numFeatures;
  
  if (numFeatures !== undefined) {
    const channelDim = layerType === 'BatchNorm2d' ? inputShape[inputShape.length - 3] : inputShape[inputShape.length - 1];
    if (channelDim !== numFeatures) {
      return { 
        shape: inputShape, 
        error: `${layerType} expects ${numFeatures} features, got ${channelDim}` 
      };
    }
  }

  return { shape: inputShape, error: null };
}

/**
 * Calculate output shape for a given layer type and input shape
 */
export function calculateOutputShape(
  layerType: NNLayerType,
  inputShape: TensorShape,
  params: LayerParams = {}
): { shape: TensorShape; error: string | null } {
  switch (layerType) {
    case 'Input':
      // Input node just passes through
      return { shape: inputShape, error: null };

    case 'Output':
      // Output node just validates input
      return { shape: inputShape, error: null };

    case 'Linear':
      return calcLinearOutput(inputShape, params);

    case 'Conv2d':
      return calcConv2dOutput(inputShape, params);

    case 'Conv1d':
      return calcConv1dOutput(inputShape, params);

    case 'ConvTranspose2d':
      // ConvTranspose2d is the inverse of Conv2d
      // For simplicity, we'll estimate the output
      const [kH, kW] = toTuple(params.kernelSize, 3);
      const [sH, sW] = toTuple(params.stride, 1);
      const [pH, pW] = toTuple(params.padding, 0);
      const outCh = params.outChannels ?? 32;
      
      if (inputShape.length < 3) {
        return { shape: [], error: 'ConvTranspose2d requires at least 3D input' };
      }
      
      const H_in = inputShape[inputShape.length - 2];
      const W_in = inputShape[inputShape.length - 1];
      const H_out_t = (H_in - 1) * sH - 2 * pH + kH;
      const W_out_t = (W_in - 1) * sW - 2 * pW + kW;
      
      if (inputShape.length === 4) {
        return { shape: [inputShape[0], outCh, H_out_t, W_out_t], error: null };
      }
      return { shape: [outCh, H_out_t, W_out_t], error: null };

    case 'MaxPool2d':
    case 'AvgPool2d':
      return calcPool2dOutput(inputShape, params);

    case 'BatchNorm1d':
      return calcBatchNormOutput(inputShape, params, 'BatchNorm1d');

    case 'BatchNorm2d':
      return calcBatchNormOutput(inputShape, params, 'BatchNorm2d');

    case 'LayerNorm':
      // LayerNorm doesn't change shape
      return { shape: inputShape, error: null };

    case 'Dropout':
      // Dropout doesn't change shape
      return { shape: inputShape, error: null };

    case 'Flatten':
      return calcFlattenOutput(inputShape);

    case 'ReLU':
    case 'LeakyReLU':
    case 'Sigmoid':
    case 'Tanh':
    case 'Softmax':
      // Activation functions don't change shape
      return { shape: inputShape, error: null };

    case 'LSTM':
      return calcRecurrentOutput(inputShape, params, 'LSTM');

    case 'GRU':
      return calcRecurrentOutput(inputShape, params, 'GRU');

    case 'Embedding':
      return calcEmbeddingOutput(inputShape, params);

    case 'CustomModule':
      // Custom modules need explicit shape specification
      // For now, pass through the input shape
      return { shape: inputShape, error: null };

    default:
      return { shape: inputShape, error: `Unknown layer type: ${layerType}` };
  }
}

/**
 * Infer the input size for a Linear layer based on the previous layer's output
 */
export function inferLinearInputSize(outputShape: TensorShape): number {
  if (outputShape.length === 0) return 128; // Default
  
  // For flattened input, use the last dimension
  // For multi-dimensional, it's the product of all dims except batch
  if (outputShape.length === 1) {
    return outputShape[0];
  }
  
  // Last dimension is the feature dimension
  return outputShape[outputShape.length - 1];
}

/**
 * Topologically sort nodes based on edges
 */
export function topologicalSort(nodes: ShapeNode[], edges: ShapeEdge[]): ShapeNode[] {
  if (nodes.length === 0) return [];

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // Initialize
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  // Build graph
  for (const edge of edges) {
    if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
      adjacency.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
  }

  // Find nodes with no incoming edges
  const queue: ShapeNode[] = [];
  for (const node of nodes) {
    if ((inDegree.get(node.id) ?? 0) === 0) {
      queue.push(node);
    }
  }

  const sorted: ShapeNode[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const nextId of adjacency.get(current.id) ?? []) {
      const newDegree = (inDegree.get(nextId) ?? 1) - 1;
      inDegree.set(nextId, newDegree);
      if (newDegree === 0) {
        const nextNode = nodeMap.get(nextId);
        if (nextNode) queue.push(nextNode);
      }
    }
  }

  return sorted;
}

/**
 * Propagate shapes through the network graph
 */
export function propagateShapes(
  nodes: ShapeNode[],
  edges: ShapeEdge[],
  inputShape: TensorShape
): {
  nodeShapes: Map<string, NodeShapeInfo>;
  edgeValidations: Map<string, EdgeValidation>;
} {
  const nodeShapes = new Map<string, NodeShapeInfo>();
  const edgeValidations = new Map<string, EdgeValidation>();

  // Build edge lookup: target -> source edges
  const incomingEdges = new Map<string, ShapeEdge[]>();
  for (const edge of edges) {
    const existing = incomingEdges.get(edge.target) ?? [];
    existing.push(edge);
    incomingEdges.set(edge.target, existing);
  }

  // Sort nodes topologically
  const sortedNodes = topologicalSort(nodes, edges);

  // Initialize input node shape
  for (const node of sortedNodes) {
    const layerType = node.data.type || (node.data.label as NNLayerType);
    const params = node.data.params || {};

    // Determine input shape for this node
    let nodeInputShape: TensorShape | null = null;
    const incoming = incomingEdges.get(node.id) ?? [];

    if (layerType === 'Input' || node.data.isIO) {
      // Input node uses the dataset input shape
      nodeInputShape = inputShape;
    } else if (incoming.length > 0) {
      // Get shape from first incoming edge's source
      const sourceId = incoming[0].source;
      const sourceShape = nodeShapes.get(sourceId);
      nodeInputShape = sourceShape?.outputShape ?? null;
    }

    // Calculate output shape
    let outputShape: TensorShape | null = null;
    let error: string | null = null;

    if (nodeInputShape) {
      const result = calculateOutputShape(layerType, nodeInputShape, params);
      outputShape = result.shape.length > 0 ? result.shape : null;
      error = result.error;
    } else if (layerType !== 'Input') {
      error = 'No input connected';
    }

    // Store node shape info
    nodeShapes.set(node.id, {
      nodeId: node.id,
      inputShape: nodeInputShape,
      outputShape,
      error,
      params,
    });

    // Validate incoming edges
    for (const edge of incoming) {
      const sourceShape = nodeShapes.get(edge.source);
      const sourceOutputShape = sourceShape?.outputShape ?? null;

      // Check if shapes are compatible
      let isValid = true;
      let edgeError: string | null = null;

      if (sourceOutputShape && nodeInputShape) {
        // For Linear layers, check that input size matches
        if (layerType === 'Linear' && params.inFeatures) {
          const sourceLastDim = sourceOutputShape[sourceOutputShape.length - 1];
          if (sourceLastDim !== params.inFeatures) {
            isValid = false;
            edgeError = `Shape mismatch: ${sourceLastDim} → ${params.inFeatures}`;
          }
        }
      }

      edgeValidations.set(edge.id, {
        edgeId: edge.id,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        sourceShape: sourceOutputShape,
        targetExpectedShape: nodeInputShape,
        isValid,
        error: edgeError,
      });
    }
  }

  return { nodeShapes, edgeValidations };
}

/**
 * Auto-fill Linear layer parameters based on input shape
 */
export function autoFillLinearParams(
  inputShape: TensorShape | null,
  currentParams: LayerParams,
  numClasses: number | null
): LayerParams {
  if (!inputShape) return currentParams;

  const inFeatures = inferLinearInputSize(inputShape);
  
  // If this is likely an output layer (outFeatures matches num_classes or is small)
  // keep the outFeatures, otherwise set a reasonable default
  const outFeatures = currentParams.outFeatures ?? numClasses ?? 10;

  return {
    ...currentParams,
    inFeatures,
    outFeatures,
  };
}
