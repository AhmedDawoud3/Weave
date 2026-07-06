export type TrainingStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped';

export interface SetupStatusEvent {
  type: 'setup_status';
  run_id: string;
  status: string;
  message: string;
}

export interface StepMetricsEvent {
  type: 'step_metrics';
  run_id: string;
  epoch: number;
  step: number;
  metrics: {
    train_loss?: number;
    loss?: number;
    learning_rate?: number;
    [key: string]: any;
  };
  loss?: number; // fallback
}

export interface EpochMetricsEvent {
  type: 'epoch_metrics';
  run_id: string;
  epoch: number;
  metrics: {
    train_loss?: number;
    val_loss?: number;
    train_accuracy?: number;
    val_accuracy?: number;
    accuracy?: number;
    loss?: number;
    [key: string]: any;
  };
  loss?: number; // fallback
  accuracy?: number; // fallback
}

export interface TrainingCompleteEvent {
  type: 'training_complete';
  run_id: string;
  best_epoch: number;
  best_val_loss: number;
}

export interface TrainingFailedEvent {
  type: 'training_failed';
  run_id: string;
  error: string;
}

export type TrainingSSEEvent =
  | SetupStatusEvent
  | StepMetricsEvent
  | EpochMetricsEvent
  | TrainingCompleteEvent
  | TrainingFailedEvent;

export interface TrainingRunConfig {
  model_graph: {
    nodes: any[];
    edges: any[];
  };
  dataset_config: any;
  loss: {
    type: string;
    params: Record<string, any>;
  };
  optimizer: {
    type: string;
    params: {
      lr: number;
      weight_decay: number;
      [key: string]: any;
    };
  };
  scheduler: {
    type: string;
    params: Record<string, any>;
  } | null;
  training: {
    epochs: number;
    device: string;
    mixed_precision: boolean;
    gradient_clip_norm: number;
    gradient_accumulation_steps: number;
    validation_frequency: number;
    early_stopping: {
      enabled: boolean;
      patience: number;
      monitor: string;
      mode: 'min' | 'max';
    };
    checkpointing: {
      save_best: boolean;
      save_every_n_epochs: number;
      monitor: string;
      directory: string;
    };
  };
}
