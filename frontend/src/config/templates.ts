import { LayerType } from '../types';

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
}

export const TEMPLATES: Template[] = [
  {
    name: "Simple Linear Regression",
    description: "A single Linear layer mapping features, useful for simple regression tasks.",
    category: "architecture",
    inputShape: [32, 10],
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
    nodes: [
      { id: "input_node", type: "InputNode", label: "Sequence Input (5x8)", position: { x: 250, y: 50 }, params: {} },
      { id: "q_proj", type: "Linear", label: "Query Proj", position: { x: 100, y: 150 }, params: { in_features: 8, out_features: 8 } },
      { id: "k_proj", type: "Linear", label: "Key Proj", position: { x: 250, y: 150 }, params: { in_features: 8, out_features: 8 } },
      { id: "v_proj", type: "Linear", label: "Value Proj", position: { x: 400, y: 150 }, params: { in_features: 8, out_features: 8 } },
      { id: "k_trans", type: "Permute", label: "Key Transpose", position: { x: 250, y: 250 }, params: { dims: [0, 2, 1] } },
      { id: "scores", type: "MatMul", label: "QK^T Scores", position: { x: 175, y: 350 }, params: {} },
      { id: "scaled_scores", type: "Scale", label: "Scale Scores", position: { x: 175, y: 440 }, params: { value: 0.35355339 } },
      { id: "attn_weights", type: "Softmax", label: "Attention Weights", position: { x: 175, y: 530 }, params: { dim: -1 } },
      { id: "context", type: "MatMul", label: "Weights * V", position: { x: 300, y: 640 }, params: {} },
      { id: "out_proj", type: "Linear", label: "Output Projection", position: { x: 300, y: 740 }, params: { in_features: 8, out_features: 8 } },
      { id: "output_node", type: "OutputNode", label: "Output", position: { x: 300, y: 840 }, params: {} }
    ],
    edges: [
      { source: "input_node", target: "q_proj" },
      { source: "input_node", target: "k_proj" },
      { source: "input_node", target: "v_proj" },
      { source: "k_proj", target: "k_trans" },
      { source: "q_proj", target: "scores", targetHandle: "input_0" },
      { source: "k_trans", target: "scores", targetHandle: "input_1" },
      { source: "scores", target: "scaled_scores" },
      { source: "scaled_scores", target: "attn_weights" },
      { source: "attn_weights", target: "context", targetHandle: "input_0" },
      { source: "v_proj", target: "context", targetHandle: "input_1" },
      { source: "context", target: "out_proj" },
      { source: "out_proj", target: "output_node" }
    ]
  },
  {
    name: "Custom BatchNorm2d",
    description: "Manual mathematical formulation of 2D Batch Normalization (Mean, Var, Sqrt, Sub, Div, and Channel Scale/Bias).",
    category: "architecture",
    inputShape: [2, 3, 32, 32],
    nodes: [
      { id: "input_node", type: "InputNode", label: "Input Tensor (3x32x32)", position: { x: 250, y: 50 }, params: {} },
      { id: "mean", type: "Mean", label: "Calculate Mean", position: { x: 100, y: 150 }, params: { dim: [0, 2, 3], keepdim: true } },
      { id: "x_sub", type: "Sub", label: "Centering (x - Mean)", position: { x: 250, y: 255 }, params: {} },
      { id: "var", type: "Var", label: "Calculate Variance", position: { x: 400, y: 150 }, params: { dim: [0, 2, 3], keepdim: true, unbiased: false } },
      { id: "std", type: "Sqrt", label: "Std Dev (Sqrt(Var + eps))", position: { x: 400, y: 255 }, params: { eps: 1e-5 } },
      { id: "x_norm", type: "Div", label: "Scaling (Center / Std)", position: { x: 250, y: 360 }, params: {} },
      { id: "scale_bias", type: "ChannelScaleBias", label: "Learnable scale & bias", position: { x: 250, y: 465 }, params: { num_features: 3 } },
      { id: "output_node", type: "OutputNode", label: "Normalized Output", position: { x: 250, y: 570 }, params: {} }
    ],
    edges: [
      { source: "input_node", target: "mean" },
      { source: "input_node", target: "x_sub", targetHandle: "input_0" },
      { source: "mean", target: "x_sub", targetHandle: "input_1" },
      { source: "input_node", target: "var" },
      { source: "var", target: "std" },
      { source: "x_sub", target: "x_norm", targetHandle: "input_0" },
      { source: "std", target: "x_norm", targetHandle: "input_1" },
      { source: "x_norm", target: "div" },
      { source: "scale_bias", target: "output_node" }
    ]
  },
  {
    name: "Custom Autograd Activation",
    description: "Applies a user-defined activation function using Python custom autograd forward and backward code.",
    category: "architecture",
    inputShape: [2, 5, 8],
    nodes: [
      { id: "input_node", type: "InputNode", label: "Input Tensor", position: { x: 250, y: 50 }, params: {} },
      { 
        id: "custom_act", 
        type: "CustomAutograd", 
        label: "Square Activation", 
        position: { x: 250, y: 160 }, 
        params: { 
          forward_code: "def forward(x):\n    return x * x", 
          backward_code: "def backward(x, y, grad_output):\n    return grad_output * 2.0 * x" 
        } 
      },
      { id: "output_node", type: "OutputNode", label: "Squared Output", position: { x: 250, y: 270 }, params: {} }
    ],
    edges: [
      { source: "input_node", target: "custom_act" },
      { source: "custom_act", target: "output_node" }
    ]
  },
  {
    name: "Deep Residual Learning (ResNet Block)",
    description: "Convolutional network with a skip connection bypass to prevent vanishing gradients during training.",
    category: "paper",
    citation: "He et al. (2015)",
    paperUrl: "https://arxiv.org/abs/1512.03385",
    inputShape: [32, 16, 32, 32],
    nodes: [
      { id: "input_node", type: "InputNode", label: "Input Channels (16)", position: { x: 250, y: 50 }, params: {} },
      { id: "conv1", type: "Conv2d", label: "Conv 1", position: { x: 150, y: 160 }, params: { in_channels: 16, out_channels: 16, kernel_size: 3, stride: 1, padding: 1, bias: true } },
      { id: "bn1", type: "BatchNorm2d", label: "BN 1", position: { x: 150, y: 260 }, params: { num_features: 16 } },
      { id: "relu1", type: "ReLU", label: "ReLU 1", position: { x: 150, y: 360 }, params: {} },
      { id: "conv2", type: "Conv2d", label: "Conv 2", position: { x: 150, y: 460 }, params: { in_channels: 16, out_channels: 16, kernel_size: 3, stride: 1, padding: 1, bias: true } },
      { id: "add1", type: "Add", label: "Skip Add", position: { x: 250, y: 580 }, params: {} },
      { id: "relu2", type: "ReLU", label: "ReLU 2", position: { x: 250, y: 670 }, params: {} },
      { id: "output_node", type: "OutputNode", label: "Output", position: { x: 250, y: 770 }, params: {} }
    ],
    edges: [
      { source: "input_node", target: "conv1" },
      { source: "conv1", target: "bn1" },
      { source: "bn1", target: "relu1" },
      { source: "relu1", target: "conv2" },
      { source: "conv2", target: "add1", targetHandle: "input_0" },
      { source: "input_node", target: "add1", targetHandle: "input_1" },
      { source: "add1", target: "relu2" },
      { source: "relu2", target: "output_node" }
    ]
  },
  {
    name: "Finding Structure in Time (Elman RNN)",
    description: "Calculates recurrent sequences by slicing the sequence dimension, mapping inputs, adding hidden states, and reshaping outputs.",
    category: "paper",
    citation: "Elman (1990)",
    paperUrl: "https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog1402_1",
    inputShape: [2, 3, 4],
    nodes: [
      { id: "input_node", type: "InputNode", label: "Seq Input (seq=3, dim=4)", position: { x: 300, y: 50 }, params: {} },
      { id: "slice_0", type: "Slice", label: "Slice seq[0]", position: { x: 100, y: 150 }, params: { dim: 1, index: 0 } },
      { id: "slice_1", type: "Slice", label: "Slice seq[1]", position: { x: 300, y: 150 }, params: { dim: 1, index: 1 } },
      { id: "slice_2", type: "Slice", label: "Slice seq[2]", position: { x: 500, y: 150 }, params: { dim: 1, index: 2 } },
      { id: "i2h_0", type: "Linear", label: "Input-to-Hidden 0", position: { x: 100, y: 250 }, params: { in_features: 4, out_features: 6 } },
      { id: "h0", type: "Tanh", label: "Hidden 0", position: { x: 100, y: 350 }, params: {} },
      { id: "i2h_1", type: "Linear", label: "Input-to-Hidden 1", position: { x: 300, y: 250 }, params: { in_features: 4, out_features: 6 } },
      { id: "h2h_1", type: "Linear", label: "Hidden-to-Hidden 1", position: { x: 200, y: 350 }, params: { in_features: 6, out_features: 6 } },
      { id: "add_1", type: "Add", label: "Accumulate 1", position: { x: 300, y: 450 }, params: {} },
      { id: "h1", type: "Tanh", label: "Hidden 1", position: { x: 300, y: 530 }, params: {} },
      { id: "i2h_2", type: "Linear", label: "Input-to-Hidden 2", position: { x: 500, y: 250 }, params: { in_features: 4, out_features: 6 } },
      { id: "h2h_2", type: "Linear", label: "Hidden-to-Hidden 2", position: { x: 400, y: 530 }, params: { in_features: 6, out_features: 6 } },
      { id: "add_2", type: "Add", label: "Accumulate 2", position: { x: 500, y: 630 }, params: {} },
      { id: "h2", type: "Tanh", label: "Hidden 2", position: { x: 500, y: 710 }, params: {} },
      { id: "concat_h", type: "Concat", label: "Concat Hidden States", position: { x: 300, y: 810 }, params: { dim: 1 } },
      { id: "reshape_out", type: "Reshape", label: "Reshape to sequence", position: { x: 300, y: 900 }, params: { target_shape: [-1, 3, 6] } },
      { id: "output_node", type: "OutputNode", label: "Output States", position: { x: 300, y: 990 }, params: {} }
    ],
    edges: [
      { source: "input_node", target: "slice_0" },
      { source: "input_node", target: "slice_1" },
      { source: "input_node", target: "slice_2" },
      { source: "slice_0", target: "i2h_0" },
      { source: "i2h_0", target: "h0" },
      { source: "slice_1", target: "i2h_1" },
      { source: "h0", target: "h2h_1" },
      { source: "i2h_1", target: "add_1", targetHandle: "input_0" },
      { source: "h2h_1", target: "add_1", targetHandle: "input_1" },
      { source: "add_1", target: "h1" },
      { source: "slice_2", target: "i2h_2" },
      { source: "h1", target: "h2h_2" },
      { source: "i2h_2", target: "add_2", targetHandle: "input_0" },
      { source: "h2h_2", target: "add_2", targetHandle: "input_1" },
      { source: "add_2", target: "h2" },
      { source: "h0", target: "concat_h", targetHandle: "input_0" },
      { source: "h1", target: "concat_h", targetHandle: "input_1" },
      { source: "h2", target: "concat_h", targetHandle: "input_2" },
      { source: "concat_h", target: "reshape_out" },
      { source: "reshape_out", target: "output_node" }
    ]
  },
  {
    name: "Attention Is All You Need (Transformer)",
    description: "The complete landmark Encoder-Decoder architecture from Vaswani et al., featuring self-attention and visual cross-attention flow routing.",
    category: "paper",
    citation: "Vaswani et al. (2017)",
    paperUrl: "https://arxiv.org/abs/1706.03762",
    inputShape: [2, 10, 512],
    nodes: [
      // --- Encoder Tower ---
      { id: "encoder_input", type: "InputNode", label: "Inputs", position: { x: 150, y: 50 }, params: {} },
      { id: "encoder_embedding", type: "Embedding", label: "Input Embedding", position: { x: 150, y: 150 }, params: { num_embeddings: 32000, embedding_dim: 512 } },
      { id: "encoder_pe", type: "PositionalEncoding", label: "Positional Encoding", position: { x: 150, y: 250 }, params: { embed_dim: 512, max_seq_len: 512 } },
      { id: "encoder_attn", type: "SelfAttention", label: "Multi-Head Attention", position: { x: 150, y: 350 }, params: { embed_dim: 512, num_heads: 8, causal: false } },
      { id: "encoder_add_norm1", type: "Add", label: "Residual Add 1", position: { x: 150, y: 450 }, params: {} },
      { id: "encoder_ln1", type: "LayerNorm", label: "LayerNorm 1", position: { x: 150, y: 530 }, params: { normalized_shape: 512 } },
      { id: "encoder_ffn", type: "FeedForward", label: "Feed Forward", position: { x: 150, y: 620 }, params: { embed_dim: 512, expansion: 4 } },
      { id: "encoder_add_norm2", type: "Add", label: "Residual Add 2", position: { x: 150, y: 720 }, params: {} },
      { id: "encoder_ln2", type: "LayerNorm", label: "LayerNorm 2", position: { x: 150, y: 800 }, params: { normalized_shape: 512 } },

      // --- Decoder Tower ---
      { id: "decoder_input", type: "InputNode", label: "Outputs (shifted right)", position: { x: 550, y: 50 }, params: {} },
      { id: "decoder_embedding", type: "Embedding", label: "Output Embedding", position: { x: 550, y: 150 }, params: { num_embeddings: 32000, embedding_dim: 512 } },
      { id: "decoder_pe", type: "PositionalEncoding", label: "Positional Encoding", position: { x: 550, y: 250 }, params: { embed_dim: 512, max_seq_len: 512 } },
      { id: "decoder_masked_attn", type: "SelfAttention", label: "Masked Multi-Head Attention", position: { x: 550, y: 350 }, params: { embed_dim: 512, num_heads: 8, causal: true } },
      { id: "decoder_add1", type: "Add", label: "Residual Add 1", position: { x: 550, y: 450 }, params: {} },
      { id: "decoder_norm1", type: "LayerNorm", label: "LayerNorm 1", position: { x: 550, y: 530 }, params: { normalized_shape: 512 } },

      // --- Decomposed Cross-Attention Block ---
      { id: "decoder_q_proj", type: "Linear", label: "Query Proj", position: { x: 500, y: 630 }, params: { in_features: 512, out_features: 512 } },
      { id: "decoder_k_proj", type: "Linear", label: "Key Proj", position: { x: 350, y: 630 }, params: { in_features: 512, out_features: 512 } },
      { id: "decoder_v_proj", type: "Linear", label: "Value Proj", position: { x: 650, y: 630 }, params: { in_features: 512, out_features: 512 } },
      { id: "decoder_k_trans", type: "Permute", label: "Key Transpose", position: { x: 350, y: 720 }, params: { dims: [0, 2, 1] } },
      { id: "decoder_scores", type: "MatMul", label: "QK^T Scores", position: { x: 425, y: 810 }, params: {} },
      { id: "decoder_scaled_scores", type: "Scale", label: "Scale Scores", position: { x: 425, y: 890 }, params: { value: 0.04419417 } },
      { id: "decoder_attn_weights", type: "Softmax", label: "Attention Weights", position: { x: 425, y: 970 }, params: { dim: -1 } },
      { id: "decoder_context", type: "MatMul", label: "Weights * V", position: { x: 550, y: 1070 }, params: {} },
      { id: "decoder_out_proj", type: "Linear", label: "Output Projection", position: { x: 550, y: 1160 }, params: { in_features: 512, out_features: 512 } },

      // --- Decoder Block Output ---
      { id: "decoder_add2", type: "Add", label: "Residual Add 2", position: { x: 550, y: 1250 }, params: {} },
      { id: "decoder_norm2", type: "LayerNorm", label: "LayerNorm 2", position: { x: 550, y: 1330 }, params: { normalized_shape: 512 } },
      { id: "decoder_ff", type: "FeedForward", label: "Feed Forward", position: { x: 550, y: 1420 }, params: { embed_dim: 512, expansion: 4 } },
      { id: "decoder_add3", type: "Add", label: "Residual Add 3", position: { x: 550, y: 1515 }, params: {} },
      { id: "decoder_norm3", type: "LayerNorm", label: "LayerNorm 3", position: { x: 550, y: 1595 }, params: { normalized_shape: 512 } },
      { id: "decoder_linear", type: "Linear", label: "Linear Projection", position: { x: 550, y: 1680 }, params: { in_features: 512, out_features: 32000 } },
      { id: "decoder_softmax", type: "Softmax", label: "Softmax Classifier", position: { x: 550, y: 1770 }, params: { dim: -1 } },
      { id: "decoder_output", type: "OutputNode", label: "Output Probabilities", position: { x: 550, y: 1860 }, params: {} }
    ],
    edges: [
      // Encoder Flow
      { source: "encoder_input", target: "encoder_embedding" },
      { source: "encoder_embedding", target: "encoder_pe" },
      { source: "encoder_pe", target: "encoder_attn" },
      { source: "encoder_attn", target: "encoder_add_norm1", targetHandle: "input_0" },
      { source: "encoder_pe", target: "encoder_add_norm1", targetHandle: "input_1" },
      { source: "encoder_add_norm1", target: "encoder_ln1" },
      { source: "encoder_ln1", target: "encoder_ffn" },
      { source: "encoder_ffn", target: "encoder_add_norm2", targetHandle: "input_0" },
      { source: "encoder_ln1", target: "encoder_add_norm2", targetHandle: "input_1" },
      { source: "encoder_add_norm2", target: "encoder_ln2" },

      // Decoder Flow
      { source: "decoder_input", target: "decoder_embedding" },
      { source: "decoder_embedding", target: "decoder_pe" },
      { source: "decoder_pe", target: "decoder_masked_attn" },
      { source: "decoder_masked_attn", target: "decoder_add1", targetHandle: "input_0" },
      { source: "decoder_pe", target: "decoder_add1", targetHandle: "input_1" },
      { source: "decoder_add1", target: "decoder_norm1" },

      // Decomposed Cross Attention Connections
      { source: "decoder_norm1", target: "decoder_q_proj" },
      { source: "encoder_ln2", target: "decoder_k_proj" }, // Crossover Key
      { source: "encoder_ln2", target: "decoder_v_proj" }, // Crossover Value
      { source: "decoder_k_proj", target: "decoder_k_trans" },
      { source: "decoder_q_proj", target: "decoder_scores", targetHandle: "input_0" },
      { source: "decoder_k_trans", target: "decoder_scores", targetHandle: "input_1" },
      { source: "decoder_scores", target: "decoder_scaled_scores" },
      { source: "decoder_scaled_scores", target: "decoder_attn_weights" },
      { source: "decoder_attn_weights", target: "decoder_context", targetHandle: "input_0" },
      { source: "decoder_v_proj", target: "decoder_context", targetHandle: "input_1" },
      { source: "decoder_context", target: "decoder_out_proj" },
      { source: "decoder_out_proj", target: "decoder_add2", targetHandle: "input_0" },
      { source: "decoder_norm1", target: "decoder_add2", targetHandle: "input_1" },
      { source: "decoder_add2", target: "decoder_norm2" },

      // Decoder Block 2 & Output
      { source: "decoder_norm2", target: "decoder_ff" },
      { source: "decoder_ff", target: "decoder_add3", targetHandle: "input_0" },
      { source: "decoder_norm2", target: "decoder_add3", targetHandle: "input_1" },
      { source: "decoder_add3", target: "decoder_norm3" },
      { source: "decoder_norm3", target: "decoder_linear" },
      { source: "decoder_linear", target: "decoder_softmax" },
      { source: "decoder_softmax", target: "decoder_output" }
    ]
  },
  {
    name: "Language Models (GPT-2)",
    description: "Autoregressive decoder-only Transformer architecture from OpenAI. Uses pre-LayerNorm structures and causal attention masks.",
    category: "paper",
    citation: "Radford et al. (2019)",
    paperUrl: "https://openai.com/research/better-language-models",
    inputShape: [2, 10, 768],
    nodes: [
      { id: "gpt2_input", type: "InputNode", label: "Inputs", position: { x: 250, y: 50 }, params: {} },
      { id: "gpt2_embed", type: "Embedding", label: "Input Embedding", position: { x: 250, y: 150 }, params: { num_embeddings: 50257, embedding_dim: 768 } },
      { id: "gpt2_pe", type: "PositionalEncoding", label: "Positional Encoding", position: { x: 250, y: 250 }, params: { embed_dim: 768, max_seq_len: 1024 } },
      { id: "gpt2_attn", type: "SelfAttention", label: "Causal Attention", position: { x: 250, y: 350 }, params: { embed_dim: 768, num_heads: 12, causal: true } },
      { id: "gpt2_add_norm1", type: "Add", label: "Residual Add 1", position: { x: 250, y: 450 }, params: {} },
      { id: "gpt2_ln1", type: "LayerNorm", label: "LayerNorm 1", position: { x: 250, y: 530 }, params: { normalized_shape: 768 } },
      { id: "gpt2_ffn", type: "FeedForward", label: "Feed Forward", position: { x: 250, y: 625 }, params: { embed_dim: 768, expansion: 4 } },
      { id: "gpt2_add_norm2", type: "Add", label: "Residual Add 2", position: { x: 250, y: 720 }, params: {} },
      { id: "gpt2_ln2", type: "LayerNorm", label: "LayerNorm 2", position: { x: 250, y: 800 }, params: { normalized_shape: 768 } },
      { id: "gpt2_linear", type: "Linear", label: "Prediction projection", position: { x: 250, y: 890 }, params: { in_features: 768, out_features: 50257 } },
      { id: "gpt2_softmax", type: "Softmax", label: "Softmax Classifier", position: { x: 250, y: 980 }, params: { dim: -1 } },
      { id: "gpt2_output", type: "OutputNode", label: "Predictions", position: { x: 250, y: 1070 }, params: {} }
    ],
    edges: [
      { source: "gpt2_input", target: "gpt2_embed" },
      { source: "gpt2_embed", target: "gpt2_pe" },
      { source: "gpt2_pe", target: "gpt2_attn" },
      { source: "gpt2_attn", target: "gpt2_add_norm1", targetHandle: "input_0" },
      { source: "gpt2_pe", target: "gpt2_add_norm1", targetHandle: "input_1" },
      { source: "gpt2_add_norm1", target: "gpt2_ln1" },
      { source: "gpt2_ln1", target: "gpt2_ffn" },
      { source: "gpt2_ffn", target: "gpt2_add_norm2", targetHandle: "input_0" },
      { source: "gpt2_ln1", target: "gpt2_add_norm2", targetHandle: "input_1" },
      { source: "gpt2_add_norm2", target: "gpt2_ln2" },
      { source: "gpt2_ln2", target: "gpt2_linear" },
      { source: "gpt2_linear", target: "gpt2_softmax" },
      { source: "gpt2_softmax", target: "gpt2_output" }
    ]
  }
];
