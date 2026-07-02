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
  inputShape: number[];
  nodes: TemplateNode[];
  edges: TemplateEdge[];
}

export const TEMPLATES: Template[] = [
  {
    name: "Simple Linear Regression",
    description: "A single Linear layer mapping features, useful for simple regression tasks.",
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
    name: "Residual Block (ResNet style)",
    description: "Convolutional network with a skip connection bypass to prevent vanishing gradients during training.",
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
    name: "Self-Attention Block",
    description: "Calculates Dot-Product Attention (Q, K, V projection, Softmax attention score weights, and Context mapping).",
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
      { source: "x_norm", target: "scale_bias" },
      { source: "scale_bias", target: "output_node" }
    ]
  },
  {
    name: "Simple Recurrent Network (RNN)",
    description: "Calculates recurrent sequences by slicing the sequence dimension, mapping inputs, adding hidden states, and reshaping outputs.",
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
    name: "Custom Autograd Activation",
    description: "Applies a user-defined activation function using Python custom autograd forward and backward code.",
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
  }
];
