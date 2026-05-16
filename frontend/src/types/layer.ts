export type LayerType =
  | 'CONV2D'
  | 'CONVTRANSPOSE2D'
  | 'MAXPOOL2D'
  | 'AVGPOOL2D'
  | 'ADAPTIVEAVGPOOL2D'
  | 'LINEAR'
  | 'EMBEDDING'
  | 'BATCHNORM2D'
  | 'LAYERNORM'
  | 'GROUPNORM'
  | 'RELU'
  | 'GELU'
  | 'SIGMOID'
  | 'TANH'
  | 'SOFTMAX'
  | 'FLATTEN'
  | 'RESHAPE'
  | 'PERMUTE'
  | 'DROPOUT'
  | 'DROPOUT2D'
  | 'ADD'
  | 'CONCAT'
  | 'MULTIPLY';

export interface LayerParams {
  units?: number;
  activation?: string;
  kernel_size?: number;
  filters?: number;
  rate?: number;
}
