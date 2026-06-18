export interface Project {
  id: string; // Guid
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  subGraphCount: number;
  networkStateCount: number;
}

export interface SubGraph {
  id: string; // Guid
  name: string;
  graphJson: string; // Serialized React Flow nodes and edges state
  createdAt: string;
  updatedAt: string;
}

export interface NetworkState {
  id: string; // Guid
  runId: string; // Unique string from Python engine
  status: 'running' | 'paused' | 'completed' | 'failed' | 'stopped';
  bestMetrics?: string; // Serialized JSON
  metricsHistory?: string; // Serialized JSON
  createdAt: string;
  updatedAt: string;
  projectId: string;
}

export interface AuthResponse {
  succeeded: boolean;
  token?: string;
  errors?: string[];
}
