import { create } from 'zustand';

// Tensor shape represented as array of dimensions
// e.g., [1, 28, 28] for MNIST, [3, 32, 32] for CIFAR
export type TensorShape = number[];

// Layer parameters that affect shape calculation
export interface LayerParams {
  // Linear layer
  inFeatures?: number;
  outFeatures?: number;
  // Conv layers
  inChannels?: number;
  outChannels?: number;
  kernelSize?: number | [number, number];
  stride?: number | [number, number];
  padding?: number | [number, number];
  // Pooling layers
  poolSize?: number | [number, number];
  // Embedding
  numEmbeddings?: number;
  embeddingDim?: number;
  // Recurrent
  hiddenSize?: number;
  numLayers?: number;
  // BatchNorm
  numFeatures?: number;
}

// Shape information for a single node
export interface NodeShapeInfo {
  nodeId: string;
  inputShape: TensorShape | null;
  outputShape: TensorShape | null;
  error: string | null;
  params: LayerParams;
}

// Edge validation result
export interface EdgeValidation {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceShape: TensorShape | null;
  targetExpectedShape: TensorShape | null;
  isValid: boolean;
  error: string | null;
}

// Download status for a dataset
export interface DatasetDownloadStatus {
  dataset: string;
  isDownloaded: boolean;
  isDownloading: boolean;
  downloadProgress: string | null;
  error: string | null;
}

interface ShapeState {
  // Dataset input shape (from backend)
  datasetInputShape: TensorShape | null;
  datasetNumClasses: number | null;
  
  // Shape info per node
  nodeShapes: Map<string, NodeShapeInfo>;
  
  // Edge validation results
  edgeValidations: Map<string, EdgeValidation>;
  
  // Loading state for shape detection
  isLoadingShape: boolean;
  shapeError: string | null;
  
  // Dataset download status
  downloadStatus: DatasetDownloadStatus | null;
  isCheckingDownloadStatus: boolean;
}

interface ShapeActions {
  // Dataset shape
  setDatasetShape: (inputShape: TensorShape, numClasses: number) => void;
  fetchDatasetShape: (dataset: string, customPath?: string) => Promise<void>;
  
  // Node shape management
  setNodeShape: (nodeId: string, info: Partial<NodeShapeInfo>) => void;
  getNodeShape: (nodeId: string) => NodeShapeInfo | undefined;
  clearNodeShapes: () => void;
  
  // Edge validation
  setEdgeValidation: (edgeId: string, validation: EdgeValidation) => void;
  getEdgeValidation: (edgeId: string) => EdgeValidation | undefined;
  clearEdgeValidations: () => void;
  
  // Bulk updates (for shape propagation)
  updateAllShapes: (shapes: Map<string, NodeShapeInfo>) => void;
  updateAllEdgeValidations: (validations: Map<string, EdgeValidation>) => void;
  
  // Dataset download status
  checkDatasetStatus: (dataset: string) => Promise<void>;
  downloadDataset: (dataset: string) => Promise<void>;
  clearDownloadStatus: () => void;
  
  // Reset
  reset: () => void;
}

type ShapeStore = ShapeState & ShapeActions;

// Get runner base URL from environment or default to localhost
const getRunnerBaseUrl = (): string => {
  return import.meta.env.VITE_RUNNER_URL || 'http://localhost:8000';
};

const initialState: ShapeState = {
  datasetInputShape: null,
  datasetNumClasses: null,
  nodeShapes: new Map(),
  edgeValidations: new Map(),
  isLoadingShape: false,
  shapeError: null,
  downloadStatus: null,
  isCheckingDownloadStatus: false,
};

export const useShapeStore = create<ShapeStore>((set, get) => ({
  ...initialState,

  setDatasetShape: (inputShape, numClasses) => {
    set({
      datasetInputShape: inputShape,
      datasetNumClasses: numClasses,
      shapeError: null,
    });
  },

  fetchDatasetShape: async (dataset, customPath) => {
    set({ isLoadingShape: true, shapeError: null });
    
    try {
      const runnerBaseUrl = getRunnerBaseUrl();
      const response = await fetch(`${runnerBaseUrl}/shape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dataset, 
          custom_path: customPath || null 
        }),
      });

      if (!response.ok) {
        throw new Error(`Shape detection failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        set({ 
          isLoadingShape: false, 
          shapeError: data.error,
          // Use fallback shapes for known datasets
          datasetInputShape: getKnownDatasetShape(dataset),
          datasetNumClasses: getKnownDatasetClasses(dataset),
        });
      } else {
        set({
          datasetInputShape: data.input_shape,
          datasetNumClasses: data.num_classes,
          isLoadingShape: false,
          shapeError: null,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch shape';
      set({ 
        isLoadingShape: false, 
        shapeError: message,
        // Use fallback shapes for known datasets
        datasetInputShape: getKnownDatasetShape(dataset),
        datasetNumClasses: getKnownDatasetClasses(dataset),
      });
    }
  },

  setNodeShape: (nodeId, info) => {
    const current = get().nodeShapes.get(nodeId) || {
      nodeId,
      inputShape: null,
      outputShape: null,
      error: null,
      params: {},
    };
    
    const updated = new Map(get().nodeShapes);
    updated.set(nodeId, { ...current, ...info });
    set({ nodeShapes: updated });
  },

  getNodeShape: (nodeId) => {
    return get().nodeShapes.get(nodeId);
  },

  clearNodeShapes: () => {
    set({ nodeShapes: new Map() });
  },

  setEdgeValidation: (edgeId, validation) => {
    const updated = new Map(get().edgeValidations);
    updated.set(edgeId, validation);
    set({ edgeValidations: updated });
  },

  getEdgeValidation: (edgeId) => {
    return get().edgeValidations.get(edgeId);
  },

  clearEdgeValidations: () => {
    set({ edgeValidations: new Map() });
  },

  updateAllShapes: (shapes) => {
    set({ nodeShapes: shapes });
  },

  updateAllEdgeValidations: (validations) => {
    set({ edgeValidations: validations });
  },

  checkDatasetStatus: async (dataset) => {
    set({ isCheckingDownloadStatus: true });
    
    try {
      const runnerBaseUrl = getRunnerBaseUrl();
      const response = await fetch(`${runnerBaseUrl}/dataset/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset }),
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const data = await response.json();
      
      set({
        downloadStatus: {
          dataset,
          isDownloaded: data.downloaded,
          isDownloading: false,
          downloadProgress: null,
          error: data.message || null,
        },
        isCheckingDownloadStatus: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check status';
      set({
        downloadStatus: {
          dataset,
          isDownloaded: false,
          isDownloading: false,
          downloadProgress: null,
          error: message,
        },
        isCheckingDownloadStatus: false,
      });
    }
  },

  downloadDataset: async (dataset) => {
    set({
      downloadStatus: {
        dataset,
        isDownloaded: false,
        isDownloading: true,
        downloadProgress: 'Starting download...',
        error: null,
      },
    });

    try {
      const runnerBaseUrl = getRunnerBaseUrl();
      const response = await fetch(`${runnerBaseUrl}/dataset/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset }),
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      // Check if it's a streaming response or JSON
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        // Already downloaded or error
        const data = await response.json();
        set({
          downloadStatus: {
            dataset,
            isDownloaded: data.success || data.type === 'complete',
            isDownloading: false,
            downloadProgress: null,
            error: data.type === 'error' ? data.message : null,
          },
        });
        return;
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          
          // Parse JSON from stdout lines
          const cleanLine = line.replace(/^\[(stdout|stderr)\]\s*/, '').trim();
          try {
            const parsed = JSON.parse(cleanLine);
            
            if (parsed.type === 'progress') {
              set((state) => ({
                downloadStatus: {
                  ...state.downloadStatus!,
                  downloadProgress: parsed.message,
                },
              }));
            } else if (parsed.type === 'complete') {
              set({
                downloadStatus: {
                  dataset,
                  isDownloaded: true,
                  isDownloading: false,
                  downloadProgress: null,
                  error: null,
                },
              });
            } else if (parsed.type === 'error') {
              set({
                downloadStatus: {
                  dataset,
                  isDownloaded: false,
                  isDownloading: false,
                  downloadProgress: null,
                  error: parsed.message,
                },
              });
            }
          } catch {
            // Not JSON, might be download progress from torchvision
            if (cleanLine.includes('%') || cleanLine.includes('Downloading')) {
              set((state) => ({
                downloadStatus: {
                  ...state.downloadStatus!,
                  downloadProgress: cleanLine.slice(0, 100), // Truncate long lines
                },
              }));
            }
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed';
      set({
        downloadStatus: {
          dataset,
          isDownloaded: false,
          isDownloading: false,
          downloadProgress: null,
          error: message,
        },
      });
    }
  },

  clearDownloadStatus: () => {
    set({ downloadStatus: null });
  },

  reset: () => {
    set(initialState);
  },
}));

// Fallback shape data for known datasets
function getKnownDatasetShape(dataset: string): TensorShape | null {
  const shapes: Record<string, TensorShape> = {
    'MNIST': [1, 28, 28],
    'FashionMNIST': [1, 28, 28],
    'CIFAR-10': [3, 32, 32],
    'CIFAR-100': [3, 32, 32],
    'ImageNet': [3, 224, 224],
  };
  return shapes[dataset] || null;
}

function getKnownDatasetClasses(dataset: string): number | null {
  const classes: Record<string, number> = {
    'MNIST': 10,
    'FashionMNIST': 10,
    'CIFAR-10': 10,
    'CIFAR-100': 100,
    'ImageNet': 1000,
  };
  return classes[dataset] || null;
}

// Helper to format shape for display
export function formatShape(shape: TensorShape | null): string {
  if (!shape) return '?';
  return `[${shape.join(', ')}]`;
}

// Helper to get flat size from shape
export function getFlatSize(shape: TensorShape): number {
  return shape.reduce((acc, dim) => acc * dim, 1);
}

// Helper to check if shapes are compatible for connection
export function areShapesCompatible(
  outputShape: TensorShape | null,
  inputShape: TensorShape | null
): boolean {
  if (!outputShape || !inputShape) return true; // Unknown shapes are assumed compatible
  
  // For now, just check if the total elements match or if dimensions match
  // This is a simplified check - real validation depends on layer types
  const outputSize = getFlatSize(outputShape);
  const inputSize = getFlatSize(inputShape);
  
  return outputSize === inputSize || 
         JSON.stringify(outputShape) === JSON.stringify(inputShape);
}
