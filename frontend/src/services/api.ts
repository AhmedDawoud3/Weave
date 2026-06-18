import { config } from '../config';

const getHeaders = () => {
  const token = localStorage.getItem('weave_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
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
      return handleResponse(res);
    },
    register: async (dto: any) => {
      const res = await fetch(`${apiBaseUrl}/api/Auth/register`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(dto),
      });
      return handleResponse(res);
    },
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

    exportPyTorch: async (graphDto: any) => {
      const url = `${engineBaseUrl}/export/pytorch`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ graph: graphDto }),
      });
      return handleResponse(res);
    },

    exportONNX: async (graphDto: any, inputShape: number[]) => {
      const url = `${engineBaseUrl}/export/onnx`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ graph: graphDto, input_shape: inputShape }),
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
    }
  }
};
