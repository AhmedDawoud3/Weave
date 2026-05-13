import { create } from 'zustand';

export interface Checkpoint {
  path: string;
  epoch: number;
  loss: number;
  accuracy?: number;
  timestamp: number;
}

export interface LossDataPoint {
  epoch: number;
  trainLoss: number;
  valLoss?: number;
}

export interface AccuracyDataPoint {
  epoch: number;
  trainAcc: number;
  valAcc?: number;
}

interface TrainingState {
  // Training status
  isRunning: boolean;
  isPaused: boolean;
  error: string | null;
  
  // Progress tracking
  currentEpoch: number;
  totalEpochs: number;
  currentBatch: number;
  totalBatches: number;
  
  // Metrics
  trainLoss: number;
  valLoss: number;
  trainAccuracy: number;
  valAccuracy: number;
  
  // Time tracking
  startTime: number | null;
  epochStartTime: number | null;
  timePerEpoch: number;
  eta: string;
  
  // History for charts
  lossHistory: LossDataPoint[];
  accuracyHistory: AccuracyDataPoint[];
  
  // Checkpoints
  checkpoints: Checkpoint[];
  
  // Terminal output
  terminalOutput: string;
  
  // Generated code
  generatedCode: string;
}

interface TrainingActions {
  // Control actions
  startTraining: (totalEpochs: number) => void;
  stopTraining: () => void;
  resetTraining: () => void;
  setError: (error: string | null) => void;
  
  // Progress updates
  updateBatchProgress: (data: {
    epoch: number;
    batch: number;
    totalBatches: number;
    loss: number;
  }) => void;
  
  updateEpochComplete: (data: {
    epoch: number;
    trainLoss: number;
    trainAcc: number;
    valLoss?: number;
    valAcc?: number;
    time: number;
  }) => void;
  
  // Checkpoint management
  addCheckpoint: (checkpoint: Checkpoint) => void;
  
  // Terminal output
  appendOutput: (text: string) => void;
  clearOutput: () => void;
  
  // Generated code
  setGeneratedCode: (code: string) => void;
}

type TrainingStore = TrainingState & TrainingActions;

const initialState: TrainingState = {
  isRunning: false,
  isPaused: false,
  error: null,
  currentEpoch: 0,
  totalEpochs: 0,
  currentBatch: 0,
  totalBatches: 0,
  trainLoss: 0,
  valLoss: 0,
  trainAccuracy: 0,
  valAccuracy: 0,
  startTime: null,
  epochStartTime: null,
  timePerEpoch: 0,
  eta: '--',
  lossHistory: [],
  accuracyHistory: [],
  checkpoints: [],
  terminalOutput: '',
  generatedCode: '',
};

const formatETA = (seconds: number): string => {
  if (!isFinite(seconds) || seconds <= 0) return '--';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

export const useTrainingStore = create<TrainingStore>((set, get) => ({
  ...initialState,

  startTraining: (totalEpochs) => {
    set({
      ...initialState,
      isRunning: true,
      totalEpochs,
      startTime: Date.now(),
      epochStartTime: Date.now(),
    });
  },

  stopTraining: () => {
    set({ isRunning: false });
  },

  resetTraining: () => {
    set(initialState);
  },

  setError: (error) => {
    set({ error, isRunning: false });
  },

  updateBatchProgress: (data) => {
    const state = get();
    const batchProgress = data.batch / data.totalBatches;
    const epochProgress = (data.epoch - 1 + batchProgress) / state.totalEpochs;
    
    // Calculate ETA based on progress
    const elapsed = state.startTime ? (Date.now() - state.startTime) / 1000 : 0;
    const estimatedTotal = epochProgress > 0 ? elapsed / epochProgress : 0;
    const remaining = estimatedTotal - elapsed;
    
    set({
      currentEpoch: data.epoch,
      currentBatch: data.batch,
      totalBatches: data.totalBatches,
      trainLoss: data.loss,
      eta: formatETA(remaining),
    });
  },

  updateEpochComplete: (data) => {
    const state = get();
    
    // Add to history
    const newLossPoint: LossDataPoint = {
      epoch: data.epoch,
      trainLoss: data.trainLoss,
      valLoss: data.valLoss,
    };
    
    const newAccPoint: AccuracyDataPoint = {
      epoch: data.epoch,
      trainAcc: data.trainAcc,
      valAcc: data.valAcc,
    };
    
    // Calculate remaining epochs and ETA
    const remainingEpochs = state.totalEpochs - data.epoch;
    const etaSeconds = remainingEpochs * data.time;
    
    set({
      currentEpoch: data.epoch,
      trainLoss: data.trainLoss,
      valLoss: data.valLoss ?? 0,
      trainAccuracy: data.trainAcc,
      valAccuracy: data.valAcc ?? 0,
      timePerEpoch: data.time,
      eta: formatETA(etaSeconds),
      lossHistory: [...state.lossHistory, newLossPoint],
      accuracyHistory: [...state.accuracyHistory, newAccPoint],
      epochStartTime: Date.now(),
      // Check if training is complete
      isRunning: data.epoch < state.totalEpochs,
    });
  },

  addCheckpoint: (checkpoint) => {
    set((state) => ({
      checkpoints: [...state.checkpoints, checkpoint],
    }));
  },

  appendOutput: (text) => {
    set((state) => ({
      terminalOutput: state.terminalOutput + text,
    }));
  },

  clearOutput: () => {
    set({ terminalOutput: '' });
  },

  setGeneratedCode: (code) => {
    set({ generatedCode: code });
  },
}));

// Helper function to parse JSON lines from training output
export const parseTrainingOutput = (line: string): {
  type: 'batch' | 'epoch' | 'checkpoint' | 'info' | 'error' | 'unknown';
  data: Record<string, unknown>;
} => {
  // Remove [stdout] or [stderr] prefix if present
  const cleanLine = line.replace(/^\[(stdout|stderr)\]\s*/, '').trim();
  
  // Try to parse as JSON
  try {
    const parsed = JSON.parse(cleanLine);
    if (parsed && typeof parsed === 'object' && 'type' in parsed) {
      return { type: parsed.type, data: parsed };
    }
  } catch {
    // Not JSON, treat as plain text
  }
  
  return { type: 'unknown', data: { raw: line } };
};
