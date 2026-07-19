import { LayerType, DatasetConfig } from '../types';

export interface TemplateNode {
  id: string;
  type: LayerType;
  label: string;
  position: { x: number; y: number };
  params: Record<string, any>;
}

export interface TemplateEdge {
  source: string;
  target: string;
  targetHandle?: string;
}

export interface Template {
  name: string;
  description: string;
  category: 'architecture' | 'paper';
  citation?: string;
  paperUrl?: string;
  inputShape: number[];
  nodes: TemplateNode[];
  edges: TemplateEdge[];
  datasetConfig: DatasetConfig;
  lossConfig: { loss_type: string };
  optimizerConfig: { optimizer_type: string; lr: number; scheduler_type: string; epochs: number };
}

export const TEMPLATES: Template[] = [
  {
    name: "Simple Linear Regression",
    description: "A single Linear layer mapping features, useful for simple regression tasks.",
    category: "architecture",
    inputShape: [32, 10],
    datasetConfig: {
      source: 'custom',
      modality: 'tabular',
      file_path: 'data/features.csv',
      feature_columns: ["feat_0", "feat_1", "feat_2", "feat_3", "feat_4", "feat_5", "feat_6", "feat_7", "feat_8", "feat_9"],
      target_column: 'label',
      categorical_columns: [],
      normalize: true,
      transforms: [],
      dataloader: {
        batch_size: 32,
        shuffle: true,
        num_workers: 0,
        pin_memory: false,
        drop_last: false
      }
    },
    lossConfig: { loss_type: 'MSELoss' },
    optimizerConfig: {
      optimizer_type: 'SGD',
      lr: 0.01,
      scheduler_type: 'None',
      epochs: 10
    },
    nodes: [
      { id: "input_node", type: "InputNode", label: "Input Features", position: { x: 250, y: 50 }, params: {} },
      { id: "fc1", type: "Linear", label: "Linear Projection", position: { x: 250, y: 180 }, params: { in_features: 10, out_features: 1, bias: true } },
      { id: "output_node", type: "OutputNode", label: "Predictions", position: { x: 250, y: 310 }, params: {} }
    ],
    edges: [
      { source: "input_node", target: "fc1" },
      { source: "fc1", target: "output_node" }
    ]
  },
  {
    name: "MNIST CNN Classifier",
    description: "Deep convolutional network for digit classification. Combines Conv2d, ReLU, MaxPool2d, Flatten, and Linear layers.",
    category: "architecture",
    inputShape: [32, 1, 28, 28],
    datasetConfig: {
      source: 'predefined',
      name: 'MNIST',
      split: 'train',
      transforms: [
        { type: 'ToTensor' },
        { type: 'Normalize', mean: [0.1307], std: [0.3081] }
      ],
      dataloader: {
        batch_size: 32,
        shuffle: true,
        num_workers: 0,
        pin_memory: false,
        drop_last: false
      }
    },
    lossConfig: { loss_type: 'CrossEntropyLoss' },
    optimizerConfig: {
      optimizer_type: 'AdamW',
      lr: 0.001,
      scheduler_type: 'CosineAnnealingLR',
      epochs: 5
    },
    nodes: [
      { id: "input_node", type: "InputNode", label: "Input Images (1x28x28)", position: { x: 250, y: 50 }, params: {} },
      { id: "conv1", type: "Conv2d", label: "Conv 1", position: { x: 250, y: 150 }, params: { in_channels: 1, out_channels: 8, kernel_size: 3, stride: 1, padding: 1, bias: true } },
      { id: "relu1", type: "ReLU", label: "ReLU 1", position: { x: 250, y: 240 }, params: {} },
      { id: "pool1", type: "MaxPool2d", label: "MaxPool 1", position: { x: 250, y: 330 }, params: { kernel_size: 2, stride: 2, padding: 0 } },
      { id: "conv2", type: "Conv2d", label: "Conv 2", position: { x: 250, y: 420 }, params: { in_channels: 8, out_channels: 16, kernel_size: 3, stride: 1, padding: 1, bias: true } },
      { id: "relu2", type: "ReLU", label: "ReLU 2", position: { x: 250, y: 510 }, params: {} },
      { id: "pool2", type: "MaxPool2d", label: "MaxPool 2", position: { x: 250, y: 600 }, params: { kernel_size: 2, stride: 2, padding: 0 } },
      { id: "flatten", type: "Flatten", label: "Flatten", position: { x: 250, y: 690 }, params: { start_dim: 1, end_dim: -1 } },
      { id: "fc1", type: "Linear", label: "FC Classifier", position: { x: 250, y: 780 }, params: { in_features: 784, out_features: 10, bias: true } },
      { id: "output_node", type: "OutputNode", label: "Output logits (10 classes)", position: { x: 250, y: 880 }, params: {} }
    ],
    edges: [
      { source: "input_node", target: "conv1" },
      { source: "conv1", target: "relu1" },
      { source: "relu1", target: "pool1" },
      { source: "pool1", target: "conv2" },
      { source: "conv2", target: "relu2" },
      { source: "relu2", target: "pool2" },
      { source: "pool2", target: "flatten" },
      { source: "flatten", target: "fc1" },
      { source: "fc1", target: "output_node" }
    ]
  },
  {
    name: "Self-Attention Block",
    description: "Calculates Dot-Product Attention (Q, K, V projection, Softmax attention score weights, and Context mapping).",
    category: "architecture",
    inputShape: [2, 5, 8],
    datasetConfig: {
      source: 'predefined',
      name: 'AG_NEWS_SUBSET',
      split: 'train',
      transforms: [],
      dataloader: {
        batch_size: 2,
        shuffle: true,
        num_workers: 0,
        pin_memory: false,
        drop_last: false
      }
    },
    lossConfig: { loss_type: 'CrossEntropyLoss' },
    optimizerConfig: {
      optimizer_type: 'AdamW',
      lr: 0.0005,
      scheduler_type: 'CosineAnnealingLR',
      epochs: 3
    },
    nodes: [
      { id: "input_node", type: "InputNode", label: "Sequence Input (5x8)", position: { x: 250, y: 50 }, params: {} },
      { id: "attn_block", type: "AttentionManualBlock", label: "Self-Attention Module", position: { x: 250, y: 180 }, params: {} },
      { id: "output_node", type: "OutputNode", label: "Output", position: { x: 250, y: 310 }, params: {} }
    ],
    edges: [
      { source: "input_node", target: "attn_block" },
      { source: "attn_block", target: "output_node" }
    ]
  },
  {
    name: "Custom BatchNorm2d",
    description: "Manual mathematical formulation of 2D Batch Normalization (Mean, Var, Sqrt, Sub, Div, and Channel Scale/Bias).",
    category: "architecture",
    inputShape: [2, 3, 32, 32],
    datasetConfig: {
      source: 'predefined',
      name: 'MNIST',
      split: 'train',
      transforms: [
        { type: 'ToTensor' },
        { type: 'Normalize', mean: [0.1307], std: [0.3081] }
      ],
      dataloader: {
        batch_size: 32,
        shuffle: true,
        num_workers: 0,
        pin_memory: false,
        drop_last: false
      }
    },
    lossConfig: { loss_type: 'CrossEntropyLoss' },
    optimizerConfig: {
      optimizer_type: 'AdamW',
      lr: 0.001,
      scheduler_type: 'CosineAnnealingLR',
      epochs: 5
    },
    nodes: [
      { id: "input_node", type: "InputNode", label: "Input Tensor (3x32x32)", position: { x: 250, y: 50 }, params: {} },
      { id: "bn_block", type: "BatchNorm2dManualBlock", label: "Manual BatchNorm2d Module", position: { x: 250, y: 180 }, params: {} },
      { id: "output_node", type: "OutputNode", label: "Normalized Output", position: { x: 250, y: 310 }, params: {} }
    ],
    edges: [
      { source: "input_node", target: "bn_block" },
      { source: "bn_block", target: "output_node" }
    ]
  },
  {
    name: "Custom Autograd Activation",
    description: "Applies a user-defined activation function using Python custom autograd forward and backward code.",
    category: "architecture",
    inputShape: [2, 5, 8],
    datasetConfig: {
      source: 'predefined',
      name: 'AG_NEWS_SUBSET',
      split: 'train',
      transforms: [],
      dataloader: {
        batch_size: 2,
        shuffle: true,
        num_workers: 0,
        pin_memory: false,
        drop_last: false
      }
    },
    lossConfig: { loss_type: 'CrossEntropyLoss' },
    optimizerConfig: {
      optimizer_type: 'AdamW',
      lr: 0.001,
      scheduler_type: 'CosineAnnealingLR',
      epochs: 5
    },
    nodes: [
      { id: "input_node", type: "InputNode", label: "Input Tensor", position: { x: 250, y: 50 }, params: {} },
      { id: "autograd_block", type: "CustomAutogradManualBlock", label: "Autograd Module", position: { x: 250, y: 180 }, params: {} },
      { id: "output_node", type: "OutputNode", label: "Squared Output", position: { x: 250, y: 310 }, params: {} }
    ],
    edges: [
      { source: "input_node", target: "autograd_block" },
      { source: "autograd_block", target: "output_node" }
    ]
  },
  {
    name: "Deep Residual Learning (ResNet Block)",
    description: "Convolutional network with a skip connection bypass to prevent vanishing gradients during training.",
    category: "paper",
    citation: "He et al. (2015)",
    paperUrl: "https://arxiv.org/abs/1512.03385",
    inputShape: [32, 16, 32, 32],
    datasetConfig: {
      source: 'predefined',
      name: 'CIFAR10',
      split: 'train',
      transforms: [
        { type: 'ToTensor' },
        { type: 'Normalize', mean: [0.4914, 0.4822, 0.4465], std: [0.2023, 0.1994, 0.2010] }
      ],
      dataloader: {
        batch_size: 32,
        shuffle: true,
        num_workers: 0,
        pin_memory: false,
        drop_last: false
      }
    },
    lossConfig: { loss_type: 'CrossEntropyLoss' },
    optimizerConfig: {
      optimizer_type: 'AdamW',
      lr: 0.001,
      scheduler_type: 'CosineAnnealingLR',
      epochs: 5
    },
    nodes: [
      { id: "input_node", type: "InputNode", label: "Input Channels (16)", position: { x: 250, y: 50 }, params: {} },
      { id: "resnet_block", type: "ResidualBlock", label: "ResNet Block Module", position: { x: 250, y: 180 }, params: {} },
      { id: "output_node", type: "OutputNode", label: "Output", position: { x: 250, y: 310 }, params: {} }
    ],
    edges: [
      { source: "input_node", target: "resnet_block" },
      { source: "resnet_block", target: "output_node" }
    ]
  },
  {
    name: "Finding Structure in Time (Elman RNN)",
    description: "Calculates recurrent sequences by slicing the sequence dimension, mapping inputs, adding hidden states, and reshaping outputs.",
    category: "paper",
    citation: "Elman (1990)",
    paperUrl: "https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog1402_1",
    inputShape: [2, 3, 4],
    datasetConfig: {
      source: 'predefined',
      name: 'AG_NEWS_SUBSET',
      split: 'train',
      transforms: [],
      dataloader: {
        batch_size: 2,
        shuffle: true,
        num_workers: 0,
        pin_memory: false,
        drop_last: false
      }
    },
    lossConfig: { loss_type: 'CrossEntropyLoss' },
    optimizerConfig: {
      optimizer_type: 'Adam',
      lr: 0.001,
      scheduler_type: 'CosineAnnealingLR',
      epochs: 5
    },
    nodes: [
      { id: "input_node", type: "InputNode", label: "Seq Input (seq=3, dim=4)", position: { x: 250, y: 50 }, params: {} },
      { id: "rnn_block", type: "RNNManualBlock", label: "RNN Recurrent Module", position: { x: 250, y: 180 }, params: {} },
      { id: "output_node", type: "OutputNode", label: "Output States", position: { x: 250, y: 310 }, params: {} }
    ],
    edges: [
      { source: "input_node", target: "rnn_block" },
      { source: "rnn_block", target: "output_node" }
    ]
  },
  {
    name: "Decoder-Only Transformer (Mini-GPT)",
    description: "Autoregressive decoder-only Transformer language model built from primitive layers: Token Embedding, Positional Encoding, Causal Self-Attention, FeedForward expansion, LayerNorm, and Vocab Linear Projection.",
    category: "architecture",
    inputShape: [2, 16],
    datasetConfig: {
      source: 'predefined',
      name: 'AG_NEWS_SUBSET',
      split: 'train',
      transforms: [],
      dataloader: {
        batch_size: 2,
        shuffle: true,
        num_workers: 0,
        pin_memory: false,
        drop_last: false
      }
    },
    lossConfig: { loss_type: 'CrossEntropyLoss' },
    optimizerConfig: {
      optimizer_type: 'AdamW',
      lr: 0.0005,
      scheduler_type: 'CosineAnnealingLR',
      epochs: 5
    },
    nodes: [
      { id: "input_node", type: "InputNode", label: "Token Sequence Input (2x16)", position: { x: 250, y: 50 }, params: {} },
      { id: "embed", type: "Embedding", label: "Token Embedding", position: { x: 250, y: 140 }, params: { num_embeddings: 10000, embedding_dim: 64 } },
      { id: "pe", type: "PositionalEncoding", label: "Positional Encoding", position: { x: 250, y: 230 }, params: { embed_dim: 64, max_seq_len: 512, pe_type: "sinusoidal" } },
      { id: "attn", type: "SelfAttention", label: "Causal Self-Attention", position: { x: 250, y: 320 }, params: { embed_dim: 64, num_heads: 4, causal: true, dropout: 0.1 } },
      { id: "ff", type: "FeedForward", label: "FeedForward Block", position: { x: 250, y: 410 }, params: { embed_dim: 64, expansion: 4, dropout: 0.1 } },
      { id: "ln", type: "LayerNorm", label: "Layer Normalization", position: { x: 250, y: 500 }, params: { normalized_shape: [64] } },
      { id: "linear", type: "Linear", label: "Vocab Projection", position: { x: 250, y: 590 }, params: { in_features: 64, out_features: 10000 } },
      { id: "softmax", type: "Softmax", label: "Softmax Probabilities", position: { x: 250, y: 680 }, params: { dim: -1 } },
      { id: "output_node", type: "OutputNode", label: "Next Token Logits", position: { x: 250, y: 770 }, params: {} }
    ],
    edges: [
      { source: "input_node", target: "embed" },
      { source: "embed", target: "pe" },
      { source: "pe", target: "attn" },
      { source: "attn", target: "ff" },
      { source: "ff", target: "ln" },
      { source: "ln", target: "linear" },
      { source: "linear", target: "softmax" },
      { source: "softmax", target: "output_node" }
    ]
  },
  {
    name: "Attention Is All You Need (Transformer)",
    description: "Landmark Encoder-Decoder style Transformer architecture using Self-Attention, FeedForward, LayerNorm, and Linear Projection primitives.",
    category: "paper",
    citation: "Vaswani et al. (2017)",
    paperUrl: "https://arxiv.org/abs/1706.03762",
    inputShape: [2, 10],
    datasetConfig: {
      source: 'predefined',
      name: 'AG_NEWS_SUBSET',
      split: 'train',
      transforms: [],
      dataloader: {
        batch_size: 2,
        shuffle: true,
        num_workers: 0,
        pin_memory: false,
        drop_last: false
      }
    },
    lossConfig: { loss_type: 'CrossEntropyLoss' },
    optimizerConfig: {
      optimizer_type: 'Adam',
      lr: 0.0005,
      scheduler_type: 'CosineAnnealingLR',
      epochs: 5
    },
    nodes: [
      { id: "encoder_input", type: "InputNode", label: "Inputs", position: { x: 250, y: 50 }, params: {} },
      { id: "encoder_embedding", type: "Embedding", label: "Input Embedding", position: { x: 250, y: 150 }, params: { num_embeddings: 10000, embedding_dim: 128 } },
      { id: "encoder_pe", type: "PositionalEncoding", label: "Positional Encoding", position: { x: 250, y: 250 }, params: { embed_dim: 128, max_seq_len: 512 } },
      { id: "encoder_attn", type: "SelfAttention", label: "Multi-Head Self-Attention", position: { x: 250, y: 350 }, params: { embed_dim: 128, num_heads: 4, causal: false } },
      { id: "encoder_ff", type: "FeedForward", label: "FeedForward Block", position: { x: 250, y: 450 }, params: { embed_dim: 128, expansion: 4 } },
      { id: "encoder_ln", type: "LayerNorm", label: "LayerNorm", position: { x: 250, y: 550 }, params: { normalized_shape: [128] } },
      { id: "decoder_linear", type: "Linear", label: "Linear Projection", position: { x: 250, y: 650 }, params: { in_features: 128, out_features: 10000 } },
      { id: "decoder_softmax", type: "Softmax", label: "Softmax Classifier", position: { x: 250, y: 750 }, params: { dim: -1 } },
      { id: "decoder_output", type: "OutputNode", label: "Output Probabilities", position: { x: 250, y: 850 }, params: {} }
    ],
    edges: [
      { source: "encoder_input", target: "encoder_embedding" },
      { source: "encoder_embedding", target: "encoder_pe" },
      { source: "encoder_pe", target: "encoder_attn" },
      { source: "encoder_attn", target: "encoder_ff" },
      { source: "encoder_ff", target: "encoder_ln" },
      { source: "encoder_ln", target: "decoder_linear" },
      { source: "decoder_linear", target: "decoder_softmax" },
      { source: "decoder_softmax", target: "decoder_output" }
    ]
  },
  {
    name: "Language Models (GPT-2)",
    description: "Autoregressive decoder-only Transformer architecture using pre-LayerNorm structures and causal self-attention.",
    category: "paper",
    inputShape: [2, 16],
    datasetConfig: {
      source: 'predefined',
      name: 'AG_NEWS_SUBSET',
      split: 'train',
      transforms: [],
      dataloader: {
        batch_size: 2,
        shuffle: true,
        num_workers: 0,
        pin_memory: false,
        drop_last: false
      }
    },
    lossConfig: { loss_type: 'CrossEntropyLoss' },
    optimizerConfig: {
      optimizer_type: 'AdamW',
      lr: 0.0003,
      scheduler_type: 'CosineAnnealingLR',
      epochs: 5
    },
    nodes: [
      { id: "gpt2_input", type: "InputNode", label: "Inputs", position: { x: 250, y: 50 }, params: {} },
      { id: "gpt2_embed", type: "Embedding", label: "Input Embedding", position: { x: 250, y: 150 }, params: { num_embeddings: 10000, embedding_dim: 128 } },
      { id: "gpt2_pe", type: "PositionalEncoding", label: "Positional Encoding", position: { x: 250, y: 250 }, params: { embed_dim: 128, max_seq_len: 1024 } },
      { id: "gpt2_attn", type: "SelfAttention", label: "Causal Self-Attention", position: { x: 250, y: 350 }, params: { embed_dim: 128, num_heads: 4, causal: true } },
      { id: "gpt2_ff", type: "FeedForward", label: "FeedForward Expansion", position: { x: 250, y: 450 }, params: { embed_dim: 128, expansion: 4 } },
      { id: "gpt2_ln", type: "LayerNorm", label: "LayerNorm", position: { x: 250, y: 550 }, params: { normalized_shape: [128] } },
      { id: "gpt2_linear", type: "Linear", label: "Prediction projection", position: { x: 250, y: 650 }, params: { in_features: 128, out_features: 10000 } },
      { id: "gpt2_softmax", type: "Softmax", label: "Softmax Classifier", position: { x: 250, y: 740 }, params: { dim: -1 } },
      { id: "gpt2_output", type: "OutputNode", label: "Predictions", position: { x: 250, y: 830 }, params: {} }
    ],
    edges: [
      { source: "gpt2_input", target: "gpt2_embed" },
      { source: "gpt2_embed", target: "gpt2_pe" },
      { source: "gpt2_pe", target: "gpt2_attn" },
      { source: "gpt2_attn", target: "gpt2_ff" },
      { source: "gpt2_ff", target: "gpt2_ln" },
      { source: "gpt2_ln", target: "gpt2_linear" },
      { source: "gpt2_linear", target: "gpt2_softmax" },
      { source: "gpt2_softmax", target: "gpt2_output" }
    ]
  }
];
