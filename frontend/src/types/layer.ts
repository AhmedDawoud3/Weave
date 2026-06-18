export type LayerType =
  | 'InputNode'
  | 'OutputNode'
  | 'Conv2d'
  | 'ConvTranspose2d'
  | 'MaxPool2d'
  | 'AvgPool2d'
  | 'AdaptiveAvgPool2d'
  | 'Linear'
  | 'Embedding'
  | 'BatchNorm2d'
  | 'LayerNorm'
  | 'GroupNorm'
  | 'ReLU'
  | 'GELU'
  | 'Sigmoid'
  | 'Tanh'
  | 'Softmax'
  | 'Flatten'
  | 'Reshape'
  | 'Permute'
  | 'Dropout'
  | 'Dropout2d'
  | 'Add'
  | 'Concat'
  | 'Multiply'
  // Template blocks
  | 'ResidualBlock'
  | 'TransformerEncoder'
  | 'MultiHeadAttention'
  | 'ConvBNReLU'
  | 'BottleneckBlock'
  | 'Block';

export interface LayerParams {
  [key: string]: any;
  in_channels?: number;
  out_channels?: number;
  kernel_size?: number;
  stride?: number;
  padding?: number;
  bias?: boolean;
  
  // Linear
  in_features?: number;
  out_features?: number;
  
  // Normalization
  num_features?: number;
  normalized_shape?: number | number[];
  num_groups?: number;
  num_channels?: number;

  // Embedding
  num_embeddings?: number;
  embedding_dim?: number;

  // Dropout
  p?: number;

  // Softmax & Concat
  dim?: number;
}
