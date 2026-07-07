import { create } from 'zustand';
import { api } from '../services/api';
import { useWeaveStore } from './useWeaveStore';
import {
  TrainingStatus,
  StepMetricsEvent,
  EpochMetricsEvent
} from '../types/training';

interface TrainingState {
  isTraining: boolean;
  trainingStatus: TrainingStatus;
  activeRunId: string | null;
  epochMetrics: EpochMetricsEvent[];
  stepMetrics: StepMetricsEvent[];
  trainingLogs: string[];
  suggestedLoss: string | null;
  suggestedLossAlternatives: string[];
  lrPreview: number[];
  sseConnectionState: 'disconnected' | 'connecting' | 'connected' | 'error';

  // Actions
  startTraining: (config: any) => Promise<void>;
  controlTraining: (action: 'pause' | 'resume' | 'stop') => Promise<void>;
  checkActiveRuns: () => Promise<void>;
  getLossSuggestion: (outputShape: number[], finalActivation: string, taskType: string) => Promise<void>;
  getLRSchedulePreview: (optimizer: string, lr: number, scheduler: string, epochs: number) => Promise<void>;
  resetTrainingState: () => void;

  // Stream Event Dispatchers
  addLog: (log: string) => void;
  addStepMetric: (event: StepMetricsEvent) => void;
  addEpochMetric: (event: EpochMetricsEvent) => void;
  completeTraining: (bestEpoch: number, bestValLoss: number) => void;
  failTraining: (error: string) => void;
  setConnectionState: (state: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  isTraining: false,
  trainingStatus: 'idle',
  activeRunId: null,
  epochMetrics: [],
  stepMetrics: [],
  trainingLogs: [],
  suggestedLoss: null,
  suggestedLossAlternatives: [],
  lrPreview: [],
  sseConnectionState: 'disconnected',

  startTraining: async (config) => {
    set({
      isTraining: true,
      trainingStatus: 'running',
      epochMetrics: [],
      stepMetrics: [],
      trainingLogs: ['Compiling architecture & starting run...']
    });

    const weaveState = useWeaveStore.getState();
    const formattedGraph = weaveState.getFormattedGraph();
    const storeDatasetConfig = weaveState.datasetConfig;

    let pythonDatasetConfig: any = null;

    if (storeDatasetConfig) {
      if (storeDatasetConfig.source === 'predefined') {
        pythonDatasetConfig = {
          source: 'predefined',
          name: storeDatasetConfig.name,
          split: storeDatasetConfig.split || 'train',
          transforms: (storeDatasetConfig.transforms || []).map((t: any) => {
            const { type, ...rest } = t;
            return { type, ...rest };
          }),
          dataloader: {
            batch_size: storeDatasetConfig.dataloader?.batch_size || 32,
            shuffle: storeDatasetConfig.dataloader?.shuffle ?? true,
            num_workers: storeDatasetConfig.dataloader?.num_workers ?? 2,
            pin_memory: storeDatasetConfig.dataloader?.pin_memory ?? true,
            drop_last: storeDatasetConfig.dataloader?.drop_last ?? false
          }
        };
      } else if (storeDatasetConfig.source === 'image_folder') {
        pythonDatasetConfig = {
          source: 'image_folder',
          root: storeDatasetConfig.root || '',
          split_ratio: storeDatasetConfig.split_ratio ?? 0.8,
          transforms: (storeDatasetConfig.transforms || []).map((t: any) => {
            const { type, ...rest } = t;
            return { type, ...rest };
          }),
          dataloader: {
            batch_size: storeDatasetConfig.dataloader?.batch_size || 32,
            shuffle: storeDatasetConfig.dataloader?.shuffle ?? true,
            num_workers: storeDatasetConfig.dataloader?.num_workers ?? 2,
            pin_memory: storeDatasetConfig.dataloader?.pin_memory ?? true,
            drop_last: storeDatasetConfig.dataloader?.drop_last ?? false
          }
        };
      } else if (storeDatasetConfig.source === 'custom') {
        pythonDatasetConfig = {
          source: 'custom',
          modality: storeDatasetConfig.modality || 'image',
          root: storeDatasetConfig.root || '',
          file_path: storeDatasetConfig.file_path || '',
          label_source: storeDatasetConfig.label_source || 'folder',
          label_file: storeDatasetConfig.label_file || '',
          image_column: storeDatasetConfig.image_column || '',
          label_column: storeDatasetConfig.label_column || '',
          file_pattern: storeDatasetConfig.file_pattern || '',
          text_column: storeDatasetConfig.text_column || '',
          vocab_size: storeDatasetConfig.vocab_size || 10000,
          max_length: storeDatasetConfig.max_length || 128,
          target_column: storeDatasetConfig.target_column || '',
          feature_columns: storeDatasetConfig.feature_columns || [],
          sample_rate: storeDatasetConfig.sample_rate || 16000,
          max_duration_sec: storeDatasetConfig.max_duration_sec || 5.0,
          n_mels: storeDatasetConfig.n_mels || 128,
          transforms: (storeDatasetConfig.transforms || []).map((t: any) => {
            const { type, ...rest } = t;
            return { type, ...rest };
          }),
          dataloader: {
            batch_size: storeDatasetConfig.dataloader?.batch_size || 32,
            shuffle: storeDatasetConfig.dataloader?.shuffle ?? true,
            num_workers: storeDatasetConfig.dataloader?.num_workers ?? 2,
            pin_memory: storeDatasetConfig.dataloader?.pin_memory ?? true,
            drop_last: storeDatasetConfig.dataloader?.drop_last ?? false
          }
        };
      }
    } else {
      // Fallback default
      pythonDatasetConfig = {
        source: 'predefined',
        name: 'MNIST',
        split: 'train',
        transforms: [
          { type: 'Resize', size: [28, 28] },
          { type: 'ToTensor' },
          { type: 'Normalize', mean: [0.1307], std: [0.3081] }
        ],
        dataloader: {
          batch_size: 32,
          shuffle: true,
          num_workers: 2,
          pin_memory: true,
          drop_last: false
        }
      };
    }

    const lossFunction = config.loss_config?.loss_type || 'CrossEntropyLoss';
    const optType = config.optimizer_config?.optimizer_type || 'AdamW';
    const lr = config.optimizer_config?.lr ?? 0.001;
    const weightDecay = config.optimizer_config?.weight_decay ?? 0.01;
    const schedType = config.optimizer_config?.scheduler_type || 'None';
    
    let schedulerConfig: any = null;
    if (schedType && schedType !== 'None') {
      const schedParams: any = {};
      const epochs = config.training_settings?.epochs || 5;
      if (schedType === 'CosineAnnealingLR') {
        schedParams.T_max = epochs;
        schedParams.eta_min = 1e-6;
      } else if (schedType === 'StepLR') {
        schedParams.step_size = 5;
        schedParams.gamma = 0.1;
      } else if (schedType === 'ExponentialLR') {
        schedParams.gamma = 0.9;
      } else if (schedType === 'ReduceLROnPlateau') {
        schedParams.mode = 'min';
        schedParams.factor = 0.1;
        schedParams.patience = 3;
      } else if (schedType === 'OneCycleLR') {
        schedParams.max_lr = lr;
        schedParams.total_steps = epochs * 100;
      }
      schedulerConfig = {
        type: schedType,
        params: schedParams
      };
    }

    const pythonConfig = {
      model_graph: formattedGraph,
      dataset_config: pythonDatasetConfig,
      loss: {
        type: lossFunction,
        params: {}
      },
      optimizer: {
        type: optType,
        params: {
          lr: lr,
          weight_decay: weightDecay
        }
      },
      scheduler: schedulerConfig,
      training: {
        epochs: config.training_settings?.epochs || 5,
        device: config.training_settings?.device || 'cpu',
        mixed_precision: false,
        gradient_clip_norm: 1.0,
        gradient_accumulation_steps: 1,
        validation_frequency: 1,
        early_stopping: {
          enabled: false,
          patience: 10,
          monitor: 'val_loss',
          mode: 'min'
        },
        checkpointing: {
          save_best: true,
          save_every_n_epochs: 1,
          monitor: 'val_loss',
          directory: 'data/checkpoints'
        }
      }
    };

    try {
      const startRes = await api.engine.startTraining(pythonConfig);
      const runId = startRes.run_id;
      set({
        activeRunId: runId,
        trainingLogs: [...get().trainingLogs, `Training run ${runId} successfully spawned.`]
      });
    } catch (err: any) {
      set({
        isTraining: false,
        trainingStatus: 'failed',
        trainingLogs: [...get().trainingLogs, `❌ Compilation / Training launch failed: ${err.message}`]
      });
      throw err;
    }
  },

  controlTraining: async (action) => {
    const runId = get().activeRunId;
    if (!runId) return;

    try {
      await api.engine.controlTraining(runId, action);
      if (action === 'stop') {
        set({
          isTraining: false,
          trainingStatus: 'stopped',
          trainingLogs: [...get().trainingLogs, `⏹️ Run stopped by user.`]
        });
      } else if (action === 'pause') {
        set({
          trainingStatus: 'paused',
          trainingLogs: [...get().trainingLogs, `⏸️ Run paused.`]
        });
      } else if (action === 'resume') {
        set({
          trainingStatus: 'running',
          trainingLogs: [...get().trainingLogs, `▶️ Run resumed.`]
        });
      }
    } catch (err) {
      console.error(`Failed to execute training control action ${action}:`, err);
    }
  },

  checkActiveRuns: async () => {
    try {
      const res = await api.engine.getActiveRuns();
      if (res && res.active_runs && res.active_runs.length > 0) {
        const activeRun = res.active_runs[0];
        const runId = activeRun.run_id;

        if (get().activeRunId !== runId) {
          set({
            activeRunId: runId,
            isTraining: true,
            trainingStatus: activeRun.status,
            trainingLogs: [`Reconnected to running background job: ${runId}`]
          });
        }
      }
    } catch (err) {
      console.error('Failed to check active runs:', err);
    }
  },

  getLossSuggestion: async (outputShape, finalActivation, taskType) => {
    try {
      const res = await api.engine.suggestLoss({
        output_shape: outputShape,
        final_activation: finalActivation,
        task_type: taskType
      });
      set({
        suggestedLoss: res.suggested,
        suggestedLossAlternatives: res.alternatives || []
      });
    } catch (err) {
      console.error('Failed to suggest loss:', err);
    }
  },

  getLRSchedulePreview: async (optimizer, lr, scheduler, epochs) => {
    try {
      const res = await api.engine.previewLRSchedule({
        optimizer,
        initial_lr: lr,
        scheduler_type: scheduler,
        epochs,
        scheduler_params: {
          step_size: 5,
          gamma: 0.1,
          t_max: epochs
        }
      });
      set({ lrPreview: res.lr_path || [] });
    } catch (err) {
      console.error('Failed to get learning rate preview path:', err);
    }
  },

  resetTrainingState: () => {
    set({
      isTraining: false,
      trainingStatus: 'idle',
      activeRunId: null,
      epochMetrics: [],
      stepMetrics: [],
      trainingLogs: [],
      suggestedLoss: null,
      suggestedLossAlternatives: [],
      lrPreview: [],
      sseConnectionState: 'disconnected'
    });
  },

  // Event Dispatchers called by the SSE client hook
  addLog: (log) => {
    set((state) => {
      const logs = [...state.trainingLogs, log];
      if (logs.length > 1000) logs.shift();
      return { trainingLogs: logs };
    });
  },

  addStepMetric: (event) => {
    const metrics = event.metrics || {};
    const loss = metrics.train_loss ?? metrics.loss ?? event.loss;
    const lossVal = loss !== undefined && loss !== null ? loss.toFixed(4) : 'N/A';
    set((state) => {
      const nextSteps = [...state.stepMetrics, event];
      if (nextSteps.length > 500) nextSteps.shift();
      const logs = [...state.trainingLogs, `[Step ${event.step}] Loss: ${lossVal}`];
      if (logs.length > 1000) logs.shift();
      return {
        stepMetrics: nextSteps,
        trainingLogs: logs
      };
    });
  },

  addEpochMetric: (event) => {
    const metrics = event.metrics || {};
    const trainLoss = metrics.train_loss ?? metrics.loss ?? event.loss;
    const valLoss = metrics.val_loss;
    const lossStr = valLoss !== undefined && valLoss !== null
      ? `Loss: ${trainLoss?.toFixed(4) || 'N/A'} (Val: ${valLoss.toFixed(4)})`
      : `Loss: ${trainLoss?.toFixed(4) || 'N/A'}`;

    const accuracy = metrics.val_accuracy ?? metrics.train_accuracy ?? metrics.accuracy ?? event.accuracy;
    let displayAcc = accuracy;
    if (displayAcc !== undefined && displayAcc !== null && displayAcc <= 1.0) {
      displayAcc = displayAcc * 100;
    }
    const accStr = displayAcc !== undefined && displayAcc !== null ? `, Acc: ${displayAcc.toFixed(2)}%` : '';

    set((state) => {
      const logs = [
        ...state.trainingLogs,
        `=== Epoch ${event.epoch} Complete === ${lossStr}${accStr}`
      ];
      if (logs.length > 1000) logs.shift();
      return {
        epochMetrics: [...state.epochMetrics, event],
        trainingLogs: logs
      };
    });
  },

  completeTraining: (bestEpoch, bestValLoss) => {
    set((state) => {
      const logs = [
        ...state.trainingLogs,
        `🎉 Training completed successfully! Best Epoch: ${bestEpoch}, Best Val Loss: ${bestValLoss.toFixed(4)}`
      ];
      if (logs.length > 1000) logs.shift();
      return {
        isTraining: false,
        trainingStatus: 'completed',
        trainingLogs: logs
      };
    });
  },

  failTraining: (error) => {
    set((state) => {
      const logs = [...state.trainingLogs, `❌ Training aborted: ${error}`];
      if (logs.length > 1000) logs.shift();
      return {
        isTraining: false,
        trainingStatus: 'failed',
        trainingLogs: logs
      };
    });
  },

  setConnectionState: (state) => {
    set({ sseConnectionState: state });
  }
}));
