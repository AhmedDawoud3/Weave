export type LayerType =
  | 'InputNode'
  | 'OutputNode'
  | 'Conv2d'
  | 'ConvTranspose2d'
  | 'MaxPool2d'
  | 'AvgPool2d'
  | 'AdaptiveAvgPool2d'
  // Sequence (1D)
  | 'Conv1d'
  | 'MaxPool1d'
  | 'BatchNorm1d'
  | 'FlattenConsecutive'
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
  // New activations
  | 'LeakyReLU'
  | 'SiLU'
  | 'ELU'
  | 'PReLU'
  | 'Flatten'
  | 'Reshape'
  | 'Permute'
  | 'Dropout'
  | 'Dropout2d'
  | 'Add'
  | 'Concat'
  | 'Multiply'
  | 'Sub'
  | 'Div'
  | 'Sqrt'
  | 'Mean'
  | 'Var'
  | 'MatMul'
  | 'Scale'
  | 'ChannelScaleBias'
  | 'Slice'
  | 'CustomAutograd'
  // Transformer Primitives
  | 'SelfAttention'
  | 'PositionalEncoding'
  | 'CausalMask'
  | 'FeedForward'
  // Template blocks
  | 'ResidualBlock'
  | 'TransformerEncoder'
  | 'MultiHeadAttention'
  | 'ConvBNReLU'
  | 'BottleneckBlock'
  | 'BatchNorm2dManualBlock'
  | 'AttentionManualBlock'
  | 'RNNManualBlock'
  | 'CustomAutogradManualBlock'
  | 'InputPort'
  | 'OutputPort'
  | 'Stack'
  | 'Module'
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

  // Softmax & Concat & Mean/Var
  dim?: number | number[];

  // Weight init
  init_scheme?: string;
  init_gain?: number | null;
  init_fan_mode?: string;

  // Sequence (1D)
  n?: number;  // FlattenConsecutive

  // Transformer
  embed_dim?: number;
  num_heads?: number;
  causal?: boolean;
  pe_type?: string;
  max_seq_len?: number;
  expansion?: number;

  // Activations
  negative_slope?: number;
  alpha?: number;
  num_parameters?: number;
  init?: number;
}
