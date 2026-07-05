export interface TransformConfig {
  type: string;
  [key: string]: any;
}

export interface DataLoaderConfig {
  batch_size: number;
  shuffle: boolean;
  num_workers: number;
  pin_memory: boolean;
  drop_last: boolean;
}

export interface PredefinedDatasetConfig {
  source: 'predefined';
  name: string;
  split: string;
  transforms: TransformConfig[];
  dataloader: DataLoaderConfig;
}

export interface ImageFolderDatasetConfig {
  source: 'image_folder';
  root: string;
  split_ratio: number;
  transforms: TransformConfig[];
  dataloader: DataLoaderConfig;
}

export interface CustomDatasetConfig {
  source: 'custom';
  modality: 'image' | 'text' | 'tabular' | 'audio';
  
  // image + audio data root
  root?: string;
  label_source?: string; // "csv" or "folder"

  // image specific
  label_file?: string;
  image_column?: string;
  label_column?: string;
  file_pattern?: string;

  // text + tabular data path
  file_path?: string;

  // text specific
  text_column?: string;
  tokenizer?: string;
  vocab_size?: number;
  max_length?: number;
  lowercase?: boolean;
  remove_punctuation?: boolean;

  // tabular specific
  feature_columns?: string[];
  target_column?: string;
  categorical_columns?: string[];
  normalize?: boolean;

  // audio specific
  sample_rate?: number;
  max_duration_sec?: number;
  feature_extraction?: string;
  n_mels?: number;

  // common
  transforms: TransformConfig[];
  dataloader: DataLoaderConfig;
}

export type DatasetConfig =
  | PredefinedDatasetConfig
  | ImageFolderDatasetConfig
  | CustomDatasetConfig;

export interface DatasetCatalogEntry {
  name: string;
  description: string;
  tags: string[];
  modality: string;
  shape: number[] | null;
  num_classes: number | null;
}

export interface DatasetCatalogResponse {
  datasets: DatasetCatalogEntry[];
}

export interface TransformCatalogEntry {
  name: string;
  params: Record<string, any>;
  category: string;
  description: string;
}

export interface TransformCatalogResponse {
  transforms: TransformCatalogEntry[];
}

export interface DatasetShapeInferenceResponse {
  status: 'success' | 'error';
  per_sample_shape: number[] | null;
  batch_shape: number[] | null;
  num_classes: number[] | null;
  message?: string;
}

export interface DatasetValidateResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
