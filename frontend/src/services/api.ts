import { config } from '../config';

const getHeaders = () => {
  const token = localStorage.getItem('weave_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (res: Response, options?: { skipAuthRedirect?: boolean }) => {
  if (!res.ok) {
    if (res.status === 401 && !options?.skipAuthRedirect) {
      localStorage.removeItem('weave_token');
      window.location.href = '/';
      throw new Error('Session expired. Please log in again.');
    }
    const errorText = await res.text();
    let errorJson;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      // Not JSON
    }
    throw new Error(errorJson?.message || errorJson?.errors?.[0] || errorText || `HTTP ${res.status}`);
  }
  return res.json();
};

// Toggle flag to route training/metrics directly to FastAPI engine
const useDirectEngine = import.meta.env.VITE_USE_DIRECT_ENGINE !== 'false';
const engineBaseUrl = import.meta.env.VITE_ENGINE_URL || 'http://localhost:8000';
const apiBaseUrl = config.apiBaseUrl;

export const api = {
  auth: {
    login: async (dto: any) => {
      const res = await fetch(`${apiBaseUrl}/api/Auth/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(dto),
      });
      return handleResponse(res, { skipAuthRedirect: true });
    },
    register: async (dto: any) => {
      const res = await fetch(`${apiBaseUrl}/api/Auth/register`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(dto),
      });
      return handleResponse(res, { skipAuthRedirect: true });
    },
    externalLogin: async (dto: { provider: string; idToken: string }) => {
      const res = await fetch(`${apiBaseUrl}/api/Auth/external-login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(dto),
      });
      return handleResponse(res, { skipAuthRedirect: true });
    },
  },

  public: {
    getPricing: async () => {
      const res = await fetch(`${apiBaseUrl}/api/pricing`, { method: 'GET', headers: getHeaders() });
      return handleResponse(res);
    },
    getGallery: async () => {
      const res = await fetch(`${apiBaseUrl}/api/Public/gallery`, { method: 'GET', headers: getHeaders() });
      return handleResponse(res);
    }
  },

  admin: {
    getStats: async () => {
      const res = await fetch(`${apiBaseUrl}/api/Admin/stats`, { method: 'GET', headers: getHeaders() });
      return handleResponse(res);
    },
    getUsers: async () => {
      const res = await fetch(`${apiBaseUrl}/api/Admin/users`, { method: 'GET', headers: getHeaders() });
      return handleResponse(res);
    },
    setUserRole: async (userId: string, isAdmin: boolean) => {
      const res = await fetch(`${apiBaseUrl}/api/Admin/users/${userId}/role`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ isAdmin }),
      });
      return handleResponse(res);
    },
    toggleSuspension: async (userId: string, suspend: boolean) => {
      const res = await fetch(`${apiBaseUrl}/api/Admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ suspend }),
      });
      return handleResponse(res);
    },
    deleteUser: async (userId: string) => {
      const res = await fetch(`${apiBaseUrl}/api/Admin/users/${userId}`, { method: 'DELETE', headers: getHeaders() });
      if (res.status === 204) return true;
      return handleResponse(res);
    },
    getProjects: async () => {
      const res = await fetch(`${apiBaseUrl}/api/Admin/projects`, { method: 'GET', headers: getHeaders() });
      return handleResponse(res);
    },
    getPricingPlans: async () => {
      const res = await fetch(`${apiBaseUrl}/api/admin/pricing`, { method: 'GET', headers: getHeaders() });
      return handleResponse(res);
    },
    createPricingPlan: async (dto: any) => {
      const res = await fetch(`${apiBaseUrl}/api/admin/pricing`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(dto),
      });
      return handleResponse(res);
    },
    getGalleryItems: async () => {
      const res = await fetch(`${apiBaseUrl}/api/Admin/gallery`, { method: 'GET', headers: getHeaders() });
      return handleResponse(res);
    },
    createGalleryItem: async (dto: any) => {
      const res = await fetch(`${apiBaseUrl}/api/Admin/gallery`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(dto),
      });
      return handleResponse(res);
    },
    updateGalleryItem: async (id: string, dto: any) => {
      const res = await fetch(`${apiBaseUrl}/api/Admin/gallery/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(dto),
      });
      return handleResponse(res);
    },
    deleteGalleryItem: async (id: string) => {
      const res = await fetch(`${apiBaseUrl}/api/Admin/gallery/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.status === 204) return true;
      return handleResponse(res);
    },
    updatePricingPlan: async (id: string, dto: any) => {
      const res = await fetch(`${apiBaseUrl}/api/admin/pricing/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(dto),
      });
      return handleResponse(res);
    },
    deletePricingPlan: async (id: string) => {
      const res = await fetch(`${apiBaseUrl}/api/admin/pricing/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (res.status === 204) return true;
      return handleResponse(res);
    },
    reorderPricingPlans: async (planIds: string[]) => {
      const res = await fetch(`${apiBaseUrl}/api/admin/pricing/reorder`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ planIds }),
      });
      return handleResponse(res);
    }
  },

  projects: {
    list: async () => {
      const res = await fetch(`${apiBaseUrl}/api/Projects`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    get: async (id: string) => {
      const res = await fetch(`${apiBaseUrl}/api/Projects/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    create: async (dto: any) => {
      const res = await fetch(`${apiBaseUrl}/api/Projects`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(dto),
      });
      return handleResponse(res);
    },
    delete: async (id: string) => {
      const res = await fetch(`${apiBaseUrl}/api/Projects/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.status === 204) return true;
      return handleResponse(res);
    },
    createSubGraph: async (projectId: string, dto: any) => {
      const res = await fetch(`${apiBaseUrl}/api/Projects/${projectId}/subgraphs`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(dto),
      });
      return handleResponse(res);
    },
    updateSubGraph: async (projectId: string, subGraphId: string, dto: any) => {
      const res = await fetch(`${apiBaseUrl}/api/Projects/${projectId}/subgraphs/${subGraphId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(dto),
      });
      return handleResponse(res);
    },
  },

  engine: {
    validatePipeline: async (dto: any) => {
      // Map to .NET wrapper if not direct
      const url = useDirectEngine 
        ? `${engineBaseUrl}/validate_pipeline`
        : `${apiBaseUrl}/api/Engine/validate-pipeline`;
      
      const requestBody = useDirectEngine ? dto : dto; // DTO formats are identical
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(requestBody),
      });
      
      const raw = await handleResponse(res);
      // Envelope check: .NET wraps it in { status, data, message }
      return raw.data ? raw.data : raw;
    },

    inferLayerShape: async (dto: any) => {
      const url = useDirectEngine 
        ? `${engineBaseUrl}/infer/layer`
        : `${apiBaseUrl}/api/Engine/infer/layer`;

      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(dto),
      });
      const raw = await handleResponse(res);
      return raw.data ? raw.data : raw;
    },

    inferDatasetShape: async (dto: any) => {
      const url = useDirectEngine 
        ? `${engineBaseUrl}/infer/dataset`
        : `${apiBaseUrl}/api/Engine/infer/dataset`;

      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(dto),
      });
      const raw = await handleResponse(res);
      return raw.data ? raw.data : raw;
    },

    getDatasetsCatalog: async () => {
      const url = `${engineBaseUrl}/datasets/catalog`;
      const res = await fetch(url, { method: 'GET', headers: getHeaders() });
      return handleResponse(res);
    },

    getTransformsCatalog: async () => {
      const url = `${engineBaseUrl}/transforms/catalog`;
      const res = await fetch(url, { method: 'GET', headers: getHeaders() });
      return handleResponse(res);
    },

    validateDataset: async (dto: any) => {
      const url = `${engineBaseUrl}/datasets/validate`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(dto),
      });
      return handleResponse(res);
    },


    suggestLoss: async (dto: any) => {
      // Direct only for now
      const url = `${engineBaseUrl}/loss/suggest`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(dto),
      });
      return handleResponse(res);
    },

    previewLRSchedule: async (dto: any) => {
      // Direct only for now
      const url = `${engineBaseUrl}/optimizer/preview_lr_schedule`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(dto),
      });
      return handleResponse(res);
    },

    startTraining: async (config: any) => {
      // Direct only for now
      const url = `${engineBaseUrl}/training/start`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(config),
      });
      return handleResponse(res);
    },

    controlTraining: async (runId: string, action: 'pause' | 'resume' | 'stop') => {
      // Direct only for now
      const url = `${engineBaseUrl}/training/control/${runId}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ action }),
      });
      return handleResponse(res);
    },

    getTrainingStatus: async (runId: string) => {
      // Direct only for now
      const url = `${engineBaseUrl}/training/status/${runId}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    getActiveRuns: async () => {
      const url = `${engineBaseUrl}/training/active`;
      const res = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    exportPyTorch: async (
      graphDto: any,
      inputShape: number[] = [1, 10],
      checkpointPath: string = "data/checkpoints/best.pt",
      outputPath: string = "data/exports/model.pt",
      datasetConfig?: any,
      loss?: any,
      optimizer?: any,
      training?: any
    ) => {
      const url = `${engineBaseUrl}/export/pytorch`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          graph: graphDto,
          input_shape: inputShape,
          checkpoint_path: checkpointPath,
          output_path: outputPath,
          dataset_config: datasetConfig,
          loss: loss,
          optimizer: optimizer,
          training: training,
        }),
      });
      return handleResponse(res);
    },

    exportONNX: async (
      graphDto: any,
      inputShape: number[],
      checkpointPath: string = "data/checkpoints/best.pt",
      outputPath: string = "data/exports/model.onnx"
    ) => {
      const url = `${engineBaseUrl}/export/onnx`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          graph: graphDto,
          input_shape: inputShape,
          checkpoint_path: checkpointPath,
          output_path: outputPath,
        }),
      });
      return handleResponse(res);
    },

    exportTorchScript: async (
      graphDto: any,
      inputShape: number[],
      checkpointPath: string = "data/checkpoints/best.pt",
      outputPath: string = "data/exports/model.ts"
    ) => {
      const url = `${engineBaseUrl}/export/torchscript`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          graph: graphDto,
          input_shape: inputShape,
          checkpoint_path: checkpointPath,
          output_path: outputPath,
        }),
      });
      return handleResponse(res);
    },

    scanDataset: async (path: string, modality?: string) => {
      const url = `${engineBaseUrl}/datasets/scan`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ path, modality: modality || null }),
      });
      return handleResponse(res);
    },

    previewDataset: async (datasetConfig: any, numSamples: number = 5) => {
      const url = `${engineBaseUrl}/datasets/preview`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ dataset_config: datasetConfig, num_samples: numSamples }),
      });
      return handleResponse(res);
    },

    predictInference: async (graphDto: any, inputData: number[][]) => {
      const url = `${engineBaseUrl}/inference/predict`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          graph: graphDto,
          checkpoint_path: "data/checkpoints/best.pt",
          input: inputData
        }),
      });
      return handleResponse(res);
    },

    compareExperiments: async (runIds: string[], metrics: string[]) => {
      const url = `${engineBaseUrl}/experiments/compare`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ run_ids: runIds, metrics }),
      });
      return handleResponse(res);
    },

    suggestMetrics: async (taskType: string, numClasses: number) => {
      const url = `${engineBaseUrl}/metrics/suggest`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ task_type: taskType, num_classes: numClasses }),
      });
      return handleResponse(res);
    },


    streamTraining: (runId: string, onEvent: (data: any) => void, onError: (err: any) => void) => {
      const url = `${engineBaseUrl}/training/stream/${runId}`;
      const eventSource = new EventSource(url);
      
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          onEvent(parsed);
        } catch (e) {
          console.error("Failed to parse SSE metrics:", e);
        }
      };

      eventSource.addEventListener('step_metrics', (event: any) => {
        try {
          const parsed = JSON.parse(event.data);
          onEvent({ type: 'step_metrics', ...parsed });
        } catch (e) {
          console.error("Failed to parse SSE step metrics:", e);
        }
      });

      eventSource.addEventListener('epoch_metrics', (event: any) => {
        try {
          const parsed = JSON.parse(event.data);
          onEvent({ type: 'epoch_metrics', ...parsed });
        } catch (e) {
          console.error("Failed to parse SSE epoch metrics:", e);
        }
      });

      eventSource.addEventListener('setup_status', (event: any) => {
        try {
          const parsed = JSON.parse(event.data);
          onEvent({ type: 'setup_status', ...parsed });
        } catch (e) {
          console.error("Failed to parse SSE setup status:", e);
        }
      });

      eventSource.addEventListener('training_complete', (event: any) => {
        try {
          const parsed = JSON.parse(event.data);
          onEvent({ type: 'training_complete', ...parsed });
        } catch (e) {
          console.error("Failed to parse SSE complete metrics:", e);
        }
      });

      eventSource.onerror = (err) => {
        onError(err);
      };

      return () => {
        eventSource.close();
      };
    },

    getDatasetStatus: async (name: string) => {
      const url = `${engineBaseUrl}/datasets/status/${name}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    streamDatasetDownload: (name: string, onEvent: (data: any) => void, onError: (err: any) => void) => {
      const url = `${engineBaseUrl}/datasets/download/${name}`;
      const eventSource = new EventSource(url);

      eventSource.addEventListener('download_progress', (event: any) => {
        try {
          const parsed = JSON.parse(event.data);
          onEvent(parsed);
          if (parsed.status === 'completed' || parsed.status === 'failed') {
            eventSource.close();
          }
        } catch (e) {
          console.error("Failed to parse SSE download progress:", e);
        }
      });

      eventSource.onerror = (err) => {
        if (eventSource.readyState === 2) {
          return; // Already closed cleanly by client
        }
        onError(err);
      };

      return () => {
        eventSource.close();
      };
    }
  }
};
