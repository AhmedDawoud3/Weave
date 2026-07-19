import { useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node, useUpdateNodeInternals, useConnection } from '@xyflow/react';
import { Network, ChevronDown, ChevronUp, Trash2, ShieldAlert, ExternalLink } from 'lucide-react';
import type { NodeData } from '../types';
import { useWeaveStore, getInducedParam } from '../store/useWeaveStore';

interface KeyParam { label: string; key: string; format?: (v: any) => string }

const KEY_PARAMS: Partial<Record<string, KeyParam[]>> = {
  Conv2d:           [{ label: 'In→Out', key: '_channels', format: (p) => `${p.in_channels}→${p.out_channels}` }, { label: 'K', key: 'kernel_size' }, { label: 'S', key: 'stride' }],
  ConvTranspose2d:  [{ label: 'In→Out', key: '_channels', format: (p) => `${p.in_channels}→${p.out_channels}` }, { label: 'K', key: 'kernel_size' }, { label: 'S', key: 'stride' }],
  MaxPool2d:        [{ label: 'K', key: 'kernel_size' }, { label: 'S', key: 'stride' }],
  AvgPool2d:        [{ label: 'K', key: 'kernel_size' }, { label: 'S', key: 'stride' }],
  AdaptiveAvgPool2d:[{ label: 'Out', key: 'output_size', format: (p) => JSON.stringify(p.output_size) }],
  // Sequence (1D)
  Conv1d:           [{ label: 'In→Out', key: '_channels', format: (p) => `${p.in_channels}→${p.out_channels}` }, { label: 'K', key: 'kernel_size' }, { label: 'S', key: 'stride' }],
  MaxPool1d:        [{ label: 'K', key: 'kernel_size' }, { label: 'S', key: 'stride' }],
  BatchNorm1d:      [{ label: 'Ch', key: 'num_features' }],
  FlattenConsecutive:[{ label: 'n', key: 'n' }],
  Linear:           [{ label: 'In→Out', key: '_feats', format: (p) => `${p.in_features}→${p.out_features}` }],
  Embedding:        [{ label: 'Vocab', key: 'num_embeddings' }, { label: 'Dim', key: 'embedding_dim' }],
  BatchNorm2d:      [{ label: 'Ch', key: 'num_features' }],
  LayerNorm:        [{ label: 'Shape', key: 'normalized_shape', format: (p) => JSON.stringify(p.normalized_shape) }],
  GroupNorm:        [{ label: 'G', key: 'num_groups' }, { label: 'Ch', key: 'num_channels' }],
  Dropout:          [{ label: 'p', key: 'p' }],
  Dropout2d:        [{ label: 'p', key: 'p' }],
  Softmax:          [{ label: 'dim', key: 'dim' }],
  Concat:           [{ label: 'dim', key: 'dim' }],
  Flatten:          [{ label: 'start', key: 'start_dim' }, { label: 'end', key: 'end_dim' }],
  Reshape:          [{ label: 'shape', key: 'target_shape', format: (p) => (p.target_shape || []).join(',') }],
  Permute:          [{ label: 'dims', key: 'dims', format: (p) => (p.dims || []).join(',') }],
  Mean:             [{ label: 'dim', key: 'dim', format: (p) => (p.dim || []).join(',') }],
  Var:              [{ label: 'dim', key: 'dim', format: (p) => (p.dim || []).join(',') }],
  Sqrt:             [{ label: 'eps', key: 'eps' }],
  Scale:            [{ label: 'value', key: 'value' }],
  ChannelScaleBias: [{ label: 'features', key: 'num_features' }],
  Slice:            [{ label: 'dim', key: 'dim' }, { label: 'index', key: 'index' }],
  // Transformer Primitives
  SelfAttention:    [{ label: 'Dim', key: 'embed_dim' }, { label: 'Heads', key: 'num_heads' }],
  PositionalEncoding:[{ label: 'Dim', key: 'embed_dim' }, { label: 'Type', key: 'pe_type' }],
  FeedForward:      [{ label: 'Dim', key: 'embed_dim' }, { label: 'Exp', key: 'expansion' }],
  // New activations
  LeakyReLU:        [{ label: 'slope', key: 'negative_slope' }],
  ELU:              [{ label: 'alpha', key: 'alpha' }],
  PReLU:            [{ label: 'num_params', key: 'num_parameters' }],
};

interface FieldDef {
  label: string;
  key: string;
  type: 'number' | 'text' | 'boolean' | 'json';
  step?: number; min?: number; max?: number;
  placeholder?: string;
}

const FULL_FIELDS: Partial<Record<string, FieldDef[]>> = {
  Conv2d:           [{ label: 'In Channels',  key: 'in_channels',  type: 'number' }, { label: 'Out Channels', key: 'out_channels', type: 'number' }, { label: 'Kernel',       key: 'kernel_size',  type: 'number' }, { label: 'Stride',       key: 'stride',       type: 'number' }, { label: 'Padding',      key: 'padding',      type: 'number' }, { label: 'Bias',         key: 'bias',         type: 'boolean' }],
  ConvTranspose2d:  [{ label: 'In Channels',  key: 'in_channels',  type: 'number' }, { label: 'Out Channels', key: 'out_channels', type: 'number' }, { label: 'Kernel',       key: 'kernel_size',  type: 'number' }, { label: 'Stride',       key: 'stride',       type: 'number' }, { label: 'Padding',      key: 'padding',      type: 'number' }, { label: 'Out Padding',  key: 'output_padding', type: 'number' }, { label: 'Bias',         key: 'bias',         type: 'boolean' }],
  MaxPool2d:        [{ label: 'Kernel',       key: 'kernel_size',  type: 'number' }, { label: 'Stride',       key: 'stride',       type: 'number' }, { label: 'Padding',      key: 'padding',      type: 'number' }],
  AvgPool2d:        [{ label: 'Kernel',       key: 'kernel_size',  type: 'number' }, { label: 'Stride',       key: 'stride',       type: 'number' }, { label: 'Padding',      key: 'padding',      type: 'number' }],
  AdaptiveAvgPool2d:[{ label: 'Output Size',  key: 'output_size',  type: 'json',  placeholder: '1 or [7,7]' }],
  // Sequence (1D)
  Conv1d:           [{ label: 'In Channels',  key: 'in_channels',  type: 'number' }, { label: 'Out Channels', key: 'out_channels', type: 'number' }, { label: 'Kernel',       key: 'kernel_size',  type: 'number' }, { label: 'Stride',       key: 'stride',       type: 'number' }, { label: 'Padding',      key: 'padding',      type: 'number' }, { label: 'Bias',         key: 'bias',         type: 'boolean' }],
  MaxPool1d:        [{ label: 'Kernel',       key: 'kernel_size',  type: 'number' }, { label: 'Stride',       key: 'stride',       type: 'number' }, { label: 'Padding',      key: 'padding',      type: 'number' }],
  BatchNorm1d:      [{ label: 'Num Features', key: 'num_features', type: 'number' }],
  FlattenConsecutive:[{ label: 'Merge Factor (n)', key: 'n', type: 'number', min: 2 }],
  Linear:           [{ label: 'In Features',  key: 'in_features',  type: 'number' }, { label: 'Out Features', key: 'out_features', type: 'number' }, { label: 'Bias',         key: 'bias',         type: 'boolean' }],
  Embedding:        [{ label: 'Num Embeddings', key: 'num_embeddings', type: 'number' }, { label: 'Embedding Dim', key: 'embedding_dim', type: 'number' }],
  BatchNorm2d:      [{ label: 'Num Features', key: 'num_features', type: 'number' }],
  LayerNorm:        [{ label: 'Normalized Shape', key: 'normalized_shape', type: 'json', placeholder: '64 or [64,14,14]' }],
  GroupNorm:        [{ label: 'Num Groups',   key: 'num_groups',   type: 'number' }, { label: 'Num Channels', key: 'num_channels', type: 'number' }],
  Dropout:          [{ label: 'Drop Rate (p)', key: 'p', type: 'number', step: 0.05, min: 0, max: 1 }],
  Dropout2d:        [{ label: 'Drop Rate (p)', key: 'p', type: 'number', step: 0.05, min: 0, max: 1 }],
  Softmax:          [{ label: 'Dim', key: 'dim', type: 'number' }],
  Concat:           [{ label: 'Dim', key: 'dim', type: 'number' }],
  Flatten:          [{ label: 'Start Dim', key: 'start_dim', type: 'number' }, { label: 'End Dim', key: 'end_dim', type: 'number' }],
  Reshape:          [{ label: 'Shape', key: 'target_shape', type: 'json', placeholder: '-1, 64' }],
  Permute:          [{ label: 'Dims', key: 'dims', type: 'json', placeholder: '0, 2, 3, 1' }],
  Slice:            [{ label: 'Dim', key: 'dim', type: 'number' }, { label: 'Index', key: 'index', type: 'number' }],
  // Transformer Primitives
  SelfAttention:    [{ label: 'Embed Dim', key: 'embed_dim', type: 'number' }, { label: 'Num Heads', key: 'num_heads', type: 'number', min: 1 }, { label: 'Dropout', key: 'dropout', type: 'number', step: 0.05, min: 0, max: 1 }, { label: 'Causal', key: 'causal', type: 'boolean' }],
  PositionalEncoding:[{ label: 'Embed Dim', key: 'embed_dim', type: 'number' }, { label: 'Max Seq Len', key: 'max_seq_len', type: 'number' }, { label: 'PE Type (sinusoidal/learned)', key: 'pe_type', type: 'text' }],
  FeedForward:      [{ label: 'Embed Dim', key: 'embed_dim', type: 'number' }, { label: 'Expansion', key: 'expansion', type: 'number', min: 1 }, { label: 'Dropout', key: 'dropout', type: 'number', step: 0.05, min: 0, max: 1 }],
  // New activations
  LeakyReLU:        [{ label: 'Negative Slope', key: 'negative_slope', type: 'number', step: 0.01 }],
  ELU:              [{ label: 'Alpha', key: 'alpha', type: 'number', step: 0.1, min: 0 }],
  PReLU:            [{ label: 'Num Parameters', key: 'num_parameters', type: 'number', min: 1 }, { label: 'Initial Value', key: 'init', type: 'number', step: 0.05 }],
};

const getNodeTheme = (type: string, isBlock: boolean, isInput: boolean, isOutput: boolean, isError: boolean, selected: boolean) => {
  if (isError) {
    return {
      topBar: 'bg-red-500',
      text: 'text-red-400',
      border: selected ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-red-500/30 hover:border-red-500/50',
      badge: 'bg-red-500/10 text-red-400 border-red-500/20',
      handle: '!bg-red-500',
      icon: 'text-red-400',
    };
  }
  if (isInput) {
    return {
      topBar: 'bg-emerald-500',
      text: 'text-emerald-400',
      border: selected ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-emerald-500/20 hover:border-emerald-500/40',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      handle: '!bg-emerald-500',
      icon: 'text-emerald-400',
    };
  }
  if (isOutput) {
    return {
      topBar: 'bg-amber-500',
      text: 'text-amber-400',
      border: selected ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'border-amber-500/20 hover:border-amber-500/40',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      handle: '!bg-amber-500',
      icon: 'text-amber-400',
    };
  }
  if (isBlock) {
    return {
      topBar: 'bg-indigo-500',
      text: 'text-indigo-400',
      border: selected ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.35)]' : 'border-indigo-500/30 hover:border-indigo-500/50',
      badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      handle: '!bg-indigo-500',
      icon: 'text-indigo-400',
    };
  }
  
  let color = 'blue';
  if (['Add','Concat','Multiply'].includes(type)) color = 'yellow';
  else if (['BatchNorm2d','LayerNorm','GroupNorm','BatchNorm1d'].includes(type)) color = 'teal';
  else if (['ReLU','GELU','Sigmoid','Tanh','Softmax','LeakyReLU','SiLU','ELU','PReLU'].includes(type)) color = 'emerald';
  else if (['Conv2d','ConvTranspose2d','MaxPool2d','AvgPool2d','AdaptiveAvgPool2d','Conv1d','MaxPool1d','FlattenConsecutive'].includes(type)) color = 'violet';
  else if (['SelfAttention','PositionalEncoding','CausalMask','FeedForward'].includes(type)) color = 'indigo';

  const colorMap: Record<string, any> = {
    blue: {
      topBar: 'bg-weave-blue',
      text: 'text-weave-blue',
      border: selected ? 'border-weave-blue shadow-[0_0_15px_rgba(26,188,254,0.3)]' : 'border-border hover:border-weave-blue/40',
      badge: 'bg-weave-blue/10 text-weave-blue border-weave-blue/20',
      handle: '!bg-weave-blue',
      icon: 'text-weave-blue',
    },
    violet: {
      topBar: 'bg-weave-violet',
      text: 'text-weave-violet',
      border: selected ? 'border-weave-violet shadow-[0_0_15px_rgba(108,60,225,0.3)]' : 'border-border hover:border-weave-violet/40',
      badge: 'bg-weave-violet/10 text-weave-violet border-weave-violet/20',
      handle: '!bg-weave-violet',
      icon: 'text-weave-violet',
    },
    yellow: {
      topBar: 'bg-yellow-500',
      text: 'text-yellow-400',
      border: selected ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-border hover:border-yellow-500/40',
      badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      handle: '!bg-yellow-500',
      icon: 'text-yellow-400',
    },
    teal: {
      topBar: 'bg-weave-teal',
      text: 'text-weave-teal',
      border: selected ? 'border-weave-teal shadow-[0_0_15px_rgba(45,212,191,0.3)]' : 'border-border hover:border-weave-teal/40',
      badge: 'bg-weave-teal/10 text-weave-teal border-weave-teal/20',
      handle: '!bg-weave-teal',
      icon: 'text-weave-teal',
    },
    emerald: {
      topBar: 'bg-emerald-500',
      text: 'text-emerald-400',
      border: selected ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-border hover:border-emerald-500/40',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      handle: '!bg-emerald-500',
      icon: 'text-emerald-400',
    },
    fuchsia: {
      topBar: 'bg-fuchsia-500',
      text: 'text-fuchsia-400',
      border: selected ? 'border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.3)]' : 'border-border hover:border-fuchsia-500/40',
      badge: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
      handle: '!bg-fuchsia-500',
      icon: 'text-fuchsia-400',
    },
    indigo: {
      topBar: 'bg-indigo-500',
      text: 'text-indigo-400',
      border: selected ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.35)]' : 'border-indigo-500/30 hover:border-indigo-500/50',
      badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      handle: '!bg-indigo-500',
      icon: 'text-indigo-400',
    }
  };

  return colorMap[color];
};

function WeightInitSection({ params, onUpdate }: { params: any; onUpdate: (patch: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const scheme = params.init_scheme ?? 'auto';
  const gain = params.init_gain ?? '';
  const fanMode = params.init_fan_mode ?? 'fan_in';

  return (
    <div className="space-y-1.5 border-t border-border/40 pt-2 mt-2">
      <button
        type="button"
        className="nodrag w-full flex items-center justify-between text-[11px] text-muted-foreground hover:text-foreground font-medium cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Weight initialization</span>
        {isOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>

      {isOpen && (
        <div className="space-y-2 pt-1 pb-1">
          {/* Scheme Dropdown */}
          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground font-medium block">Scheme</span>
            <select
              className="nodrag w-full bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
              value={scheme}
              onChange={(e) => onUpdate({ init_scheme: e.target.value })}
            >
              <option value="auto">Auto (Smart Default)</option>
              <option value="xavier_uniform">Xavier Uniform</option>
              <option value="xavier_normal">Xavier Normal</option>
              <option value="kaiming_uniform">Kaiming Uniform</option>
              <option value="kaiming_normal">Kaiming Normal</option>
              <option value="zeros">Zeros</option>
              <option value="ones">Ones</option>
              <option value="normal">Normal (Custom Std)</option>
              <option value="uniform">Uniform (Custom Range)</option>
            </select>
          </div>

          {scheme !== 'auto' && (
            <div className="grid grid-cols-2 gap-2">
              {/* Gain / Std Dev */}
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium block">Gain / Std</span>
                <input
                  type="number"
                  step="0.01"
                  className="nodrag w-full bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground focus:outline-none focus:border-primary/50"
                  placeholder="1.0"
                  value={gain}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    onUpdate({ init_gain: val });
                  }}
                />
              </div>

              {/* Fan Mode if Kaiming */}
              {(scheme === 'kaiming_uniform' || scheme === 'kaiming_normal') && (
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground font-medium block">Fan Mode</span>
                  <select
                    className="nodrag w-full bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
                    value={fanMode}
                    onChange={(e) => onUpdate({ init_fan_mode: e.target.value })}
                  >
                    <option value="fan_in">Fan In</option>
                    <option value="fan_out">Fan Out</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export function LayerNode({ id, data, selected, dragging }: NodeProps<Node<NodeData>> & { selected?: boolean }) {
  const shape = data.outputShape;
  const isError = !!data.error;

  const updateNodeParams = useWeaveStore(state => state.updateNodeParams);
  const updateNodeLabel  = useWeaveStore(state => state.updateNodeLabel);
  const removeNode       = useWeaveStore(state => state.removeNode);
  const removeEdge       = useWeaveStore(state => state.removeEdge);
  const activeSubGraphs  = useWeaveStore(state => state.activeSubGraphs);
  const edges            = useWeaveStore(state => state.edges);
  const allNodes         = useWeaveStore(state => state.nodes);
  const ensureSubgraphExists = useWeaveStore(state => state.ensureSubgraphExists);
  const enterSubGraph        = useWeaveStore(state => state.enterSubGraph);

  const updateNodeInternals = useUpdateNodeInternals();

  const incomingEdges = edges.filter(e => e.target === id);
  const incomingEdgesCount = incomingEdges.length;

  const isMultiInput = ['Add', 'Concat', 'Multiply', 'MatMul', 'Sub', 'Div'].includes(data.type);
  const isBlock = ['Block', 'ResidualBlock', 'TransformerEncoder', 'MultiHeadAttention', 'ConvBNReLU', 'BottleneckBlock', 'BatchNorm2dManualBlock', 'AttentionManualBlock', 'RNNManualBlock', 'CustomAutogradManualBlock', 'Module', 'Stack'].includes(data.type);
  const isInputNode  = data.type === 'InputNode' || data.type === 'InputPort';
  const isOutputNode = data.type === 'OutputNode' || data.type === 'OutputPort';

  const isOutputConnected = isOutputNode
    ? incomingEdgesCount > 0
    : edges.some(e => e.source === id);

  const connection = useConnection();
  const isConnecting = connection?.inProgress ?? false;

  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState<string>(data.label ?? '');

  const nodeRef = useRef<HTMLDivElement>(null);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDoubleClick = async (e: React.MouseEvent) => {
    if (isBlock) {
      e.stopPropagation();
      const subGraphId = await ensureSubgraphExists(id);
      if (subGraphId) {
        await enterSubGraph(subGraphId);
      }
    }
  };

  const clearHoverTimers = () => {
    if (enterTimerRef.current) { clearTimeout(enterTimerRef.current); enterTimerRef.current = null; }
    if (leaveTimerRef.current) { clearTimeout(leaveTimerRef.current); leaveTimerRef.current = null; }
  };

  useEffect(() => {
    return () => clearHoverTimers();
  }, []);

  useEffect(() => {
    if (dragging || isConnecting) {
      clearHoverTimers();
      setIsHovered(false);
      if (dragging) setIsExpanded(false);
    }
  }, [dragging, isConnecting]);

  const handleMouseEnter = () => {
    if (dragging || isConnecting) return;
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (!isHovered && !enterTimerRef.current) {
      enterTimerRef.current = setTimeout(() => {
        setIsHovered(true);
        enterTimerRef.current = null;
      }, 300);
    }
  };

  const handleMouseLeave = () => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    if (isHovered && !leaveTimerRef.current) {
      leaveTimerRef.current = setTimeout(() => {
        setIsHovered(false);
        leaveTimerRef.current = null;
      }, 200);
    }
  };

  useEffect(() => {
    if (!nodeRef.current) return;
    const wrapper = nodeRef.current.closest('.react-flow__node');
    if (wrapper) {
      if (dragging) {
        (wrapper as HTMLElement).style.zIndex = '';
      } else if (isHovered || isExpanded) {
        (wrapper as HTMLElement).style.zIndex = '1000';
      } else {
        (wrapper as HTMLElement).style.zIndex = '';
      }
    }
  }, [isHovered, isExpanded, dragging]);

  const commitLabel = () => {
    if (labelDraft.trim()) updateNodeLabel(id, labelDraft.trim());
    setEditingLabel(false);
  };

  const handleParamChange = (key: string, value: any) => {
    updateNodeParams(id, { [key]: value });
  };

  // Determine handle counts
  let targetCount = 1;
  let sourceCount = 1;
  if (isInputNode)  { targetCount = 0; sourceCount = 1; }
  else if (isOutputNode) { targetCount = 1; sourceCount = 0; }
  else if (isMultiInput) { targetCount = Math.max(2, incomingEdgesCount + 1); sourceCount = 1; }
  else if (isBlock) {
    const sub = activeSubGraphs.find(s => s.id === data.params?.subgraph_id);
    if (sub) {
      try {
        const parsed = JSON.parse(sub.graphJson);
        const n = parsed.nodes || [];
        targetCount = n.filter((x: any) => x.data?.type === 'InputNode').length || 1;
        sourceCount = n.filter((x: any) => x.data?.type === 'OutputNode').length || 1;
      } catch { /* keep defaults */ }
    }
  }

  // Calculate visual sorting of input handles to prevent crossed lines
  const handleSourceX = Array.from({ length: targetCount }).map((_, i) => {
    const targetHandleId = `input_${i}`;
    const edge = incomingEdges.find(e => e.targetHandle === targetHandleId || (targetCount === 1 && !e.targetHandle));
    if (edge) {
      const sourceNode = allNodes.find(n => n.id === edge.source);
      if (sourceNode) {
        return { index: i, x: sourceNode.position.x };
      }
    }
    return { index: i, x: i * 10000 };
  });

  const sortedHandles = [...handleSourceX].sort((a, b) => a.x - b.x);
  const visualPositionMap = new Map<number, number>();
  sortedHandles.forEach((h, rank) => {
    visualPositionMap.set(h.index, rank);
  });

  const rankKey = Array.from({ length: targetCount })
    .map((_, i) => visualPositionMap.get(i) ?? i)
    .join(',');

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, targetCount, rankKey, updateNodeInternals]);

  // Fetch colors based on themes
  const theme = getNodeTheme(data.type, isBlock, isInputNode, isOutputNode, isError, !!selected);

  // Key parameter compact summary
  const keyParamDefs = KEY_PARAMS[data.type] || [];
  const keyParamLine = keyParamDefs.map(kp =>
    kp.format ? kp.format(data.params) : `${kp.label}=${data.params?.[kp.key] ?? '–'}`
  ).join('  ');

  // Induced parameter lookup
  const getInducedValue = (paramKey: string): number | null => {
    if (incomingEdges.length !== 1) return null;
    const incomingNode = allNodes.find(n => n.id === incomingEdges[0].source);
    const incomingShape = incomingNode?.data?.outputShape;
    const induced = getInducedParam(data.type, incomingShape);
    if (induced && induced.key === paramKey) {
      return induced.value;
    }
    return null;
  };

  const renderField = (f: FieldDef) => {
    const inducedVal = getInducedValue(f.key);
    const isInduced = inducedVal !== null;
    const raw = isInduced ? inducedVal : data.params?.[f.key];
    const inputCls = `nodrag w-full bg-background border rounded-lg px-2 py-1 text-xs focus:outline-none transition-colors ${
      isInduced 
        ? 'opacity-65 cursor-not-allowed border-primary/30 text-primary font-medium font-mono' 
        : 'border-border text-foreground focus:border-primary/50'
    }`;

    if (f.type === 'boolean') {
      return (
        <div key={f.key} className="flex items-center justify-between py-1 bg-white/[0.01] px-1.5 rounded-md">
          <span className="text-[11px] text-muted-foreground font-medium">{f.label}</span>
          <button
            type="button"
            className={`nodrag text-[10px] px-2.5 py-0.5 rounded font-bold border transition-all cursor-pointer ${
              raw !== false ? 'bg-primary/20 border-primary/45 text-primary shadow-[0_0_8px_rgba(108,60,225,0.15)]' : 'bg-foreground/5 border-border text-neutral-400 hover:bg-foreground/10'
            }`}
            onClick={(e) => { e.stopPropagation(); handleParamChange(f.key, raw !== false ? false : true); }}
          >
            {raw !== false ? 'true' : 'false'}
          </button>
        </div>
      );
    }

    if (f.type === 'json') {
      const display = Array.isArray(raw) ? raw.join(', ') : (raw ?? '');
      return (
        <div key={f.key} className="space-y-1 py-1">
          <span className="text-[11px] text-muted-foreground font-medium">{f.label}</span>
          <input
            className={inputCls}
            defaultValue={display}
            placeholder={f.placeholder}
            onBlur={(e) => {
              const val = e.target.value;
              if (val.includes(',')) {
                const parts = val.replace(/[\[\]\s]/g, '').split(',').map(Number).filter(n => !isNaN(n));
                handleParamChange(f.key, parts);
              } else if (!isNaN(Number(val)) && val.trim() !== '') {
                handleParamChange(f.key, Number(val));
              }
            }}
          />
        </div>
      );
    }

    return (
      <div key={f.key} className="space-y-1 py-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-medium">{f.label}</span>
          {isInduced && (
            <span className="text-[10px] font-medium uppercase tracking-wide text-weave-teal bg-weave-teal/10 px-1.5 py-0.5 rounded border border-weave-teal/20">
              Induced
            </span>
          )}
        </div>
        <input
          type="number"
          className={inputCls}
          step={f.step}
          min={f.min}
          max={f.max}
          disabled={isInduced}
          value={raw ?? 0}
          onChange={(e) => {
            if (!isInduced) handleParamChange(f.key, Number(e.target.value));
          }}
        />
      </div>
    );
  };

  const fullFields = FULL_FIELDS[data.type] || [];
  const baseW = isBlock ? 'w-[160px]' : 'w-[140px]';
  const hoveredW = isBlock ? 'w-[190px]' : 'w-[170px]';
  const expandedW = 'w-[220px]';
  const cardW = isExpanded ? expandedW : isHovered ? hoveredW : baseW;

  return (
    <div
      ref={nodeRef}
      className="relative select-none group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
    >
      {/* Target Handles (Inputs) */}
      {Array.from({ length: targetCount }).map((_, i) => {
        const rank = visualPositionMap.get(i) ?? i;
        const leftPercent = ((rank + 1) * 100) / (targetCount + 1);
        return (
          <Handle
            key={`target-${i}`}
            type="target"
            position={Position.Top}
            id={`input_${i}`}
            style={targetCount > 1 ? { left: `${leftPercent}%` } : undefined}
            className={`!w-2.5 !h-2.5 ${theme.handle} border-2 border-background !z-50 rounded-full hover:scale-125 transition-transform`}
          />
        );
      })}

      {/* Node Container Card */}
      <div
        onDoubleClick={handleDoubleClick}
        className={`bg-card border ${theme.border} ${cardW} rounded-lg shadow-lg overflow-hidden transition-all duration-200 relative pt-1`}
      >
        
        {/* Colorful top strip */}
        <div className={`h-1.5 w-full absolute top-0 left-0 ${theme.topBar}`} />

        {/* Open Module Subgraph Button (Visible on Hover for Block nodes) */}
        {isBlock && (
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              const subGraphId = await ensureSubgraphExists(id);
              if (subGraphId) enterSubGraph(subGraphId);
            }}
            className="absolute top-1.5 left-1.5 p-0.5 text-indigo-400 hover:text-white hover:bg-indigo-500/80 rounded transition-all opacity-0 group-hover:opacity-100 z-30 cursor-pointer select-none border border-indigo-500/20 bg-indigo-500/10"
            title="Open Module Subgraph"
          >
            <ExternalLink size={10} />
          </button>
        )}

        {/* Delete Button (Visible on Hover) */}
        <button
          onClick={(e) => { e.stopPropagation(); removeNode(id); }}
          className="absolute top-1.5 right-1.5 p-0.5 text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100 z-30 cursor-pointer select-none"
          title="Delete Layer"
        >
          <Trash2 size={11} />
        </button>

        {/* Node Body */}
        <div className="py-2 px-2.5 flex flex-col items-center justify-center text-center">
          
          {/* Node Type Tag */}
          <span className={`text-[11px] font-medium tracking-wide ${theme.text} uppercase`}>
            {data.type}
          </span>

          {/* Node Label (Inline Click-to-Edit) */}
          <div className="flex items-center justify-center gap-1.5 w-full">
            {isBlock && <Network size={10} className="text-indigo-400 shrink-0" />}
            
            {editingLabel ? (
              <div className="flex gap-1 items-center nodrag w-full">
                <input
                  autoFocus
                  className="w-full bg-background border border-border rounded px-1.5 py-0.5 text-xs text-foreground text-center focus:outline-none focus:border-primary/50"
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onBlur={commitLabel}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitLabel(); }}
                />
              </div>
            ) : (
              <span
                onClick={(e) => {
                  if (!isBlock) {
                    e.stopPropagation();
                    setEditingLabel(true);
                  }
                }}
                className={`text-[11px] font-medium text-foreground truncate cursor-pointer hover:underline ${
                  isHovered || isExpanded ? 'max-w-[150px]' : 'max-w-[120px]'
                }`}
              >
                {data.label || data.type}
              </span>
            )}
          </div>

          {/* Output Shape Badge — visible when not connected */}
          {!isOutputConnected && (
            shape ? (
              <div className="text-[8px] font-mono text-weave-teal font-semibold mt-1 bg-weave-teal/5 px-1 py-0 border border-weave-teal/10 rounded">
                {shape.join('×')}
              </div>
            ) : (
              <div className="text-[8px] text-muted-foreground/30 mt-1 font-mono select-none">
                no dimensions
              </div>
            )
          )}

          {/* Error Message Flag */}
          {isError && (
            <div className="flex items-center gap-1 mt-2 text-[11px] text-red-400 font-medium bg-red-500/10 border border-red-500/25 py-0.5 px-2 rounded-full max-w-full">
              <ShieldAlert size={11} className="shrink-0" />
              <span className="truncate" title={data.error || 'Configuration error'}>{data.error}</span>
            </div>
          )}
        </div>

        {/* Configurations & Connections Drawer — visible on hover or expanded */}
        {!isInputNode && !isOutputNode && (isHovered || isExpanded) && (
          <div className="border-t border-border bg-foreground/[0.15] select-none">
            
            {/* Short compact parameter summary */}
            {keyParamLine && !isExpanded && (
              <div className="text-[8px] text-muted-foreground/80 font-mono tracking-tight text-center leading-tight py-1 select-none border-b border-border/5">
                {keyParamLine}
              </div>
            )}

              {isExpanded && (
              <div className="p-3.5 space-y-1.5 text-left border-b border-border/5">
                {fullFields.map(renderField)}
                {fullFields.length === 0 && (
                  <p className="text-[10px] text-muted-foreground italic text-center py-2">No configuration inputs</p>
                )}

                {/* Explicit Open Subgraph Button when Expanded */}
                {isBlock && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const subGraphId = await ensureSubgraphExists(id);
                      if (subGraphId) enterSubGraph(subGraphId);
                    }}
                    className="nodrag w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-500 hover:text-white text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer shadow-sm mt-2"
                  >
                    <Network size={12} />
                    <span>Open Module Canvas</span>
                    <ExternalLink size={10} className="ml-auto opacity-70" />
                  </button>
                )}

                {/* Weight Initialization — shown for trainable weight layers */}
                {['Conv2d','Conv1d','ConvTranspose2d','Linear','Embedding'].includes(data.type) && (
                  <WeightInitSection params={data.params} onUpdate={(patch) => updateNodeParams(id, { ...data.params, ...patch })} />
                )}
                {incomingEdges.length > 0 && (
                  <div className="space-y-1.5 border-t border-border pt-3 mt-3 select-none">
                    <span className="text-[11px] text-muted-foreground font-medium block mb-1">Connections</span>
                    <div className="space-y-1.5">
                      {incomingEdges.map((edge) => {
                        const sourceNode = allNodes.find(n => n.id === edge.source);
                        const handleNum = edge.targetHandle ? edge.targetHandle.split('_')[1] : '0';
                        const handleLabel = targetCount > 1 ? `Port ${Number(handleNum) + 1}` : 'Port';
                        return (
                          <div key={edge.id} className="flex items-center justify-between bg-background border border-border rounded-lg px-2 py-1 text-[10px] font-mono gap-1.5">
                            <span className="text-primary font-semibold">{handleLabel}:</span>
                            <span className="text-foreground/70 truncate flex-1">{sourceNode?.data?.label || edge.source}</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeEdge(edge.id); }}
                              className="nodrag p-1 rounded bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 flex items-center justify-center transition-colors cursor-pointer text-[10px] font-medium"
                              title="Disconnect Link"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Toggle Drawer Chevron Button */}
            <button
              type="button"
              className="nodrag w-full flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer focus:outline-none"
              onClick={(e) => { e.stopPropagation(); setIsExpanded(v => !v); }}
            >
              {isExpanded ? (
                <><ChevronUp size={12} /><span>Collapse</span></>
              ) : (
                <><ChevronDown size={12} /><span>Edit params</span></>
              )}
            </button>
          </div>
        )}

        {/* Double-click nested block help tag */}
        {isBlock && !isExpanded && (
          <div className="text-[10px] text-indigo-400/40 text-center pb-1.5 font-medium">
            Double-click to enter
          </div>
        )}
      </div>

      {/* Source Handles (Outputs) */}
      {Array.from({ length: sourceCount }).map((_, i) => (
        <Handle
          key={`source-${i}`}
          type="source"
          position={Position.Bottom}
          id={`output_${i}`}
          style={sourceCount > 1 ? { left: `${((i + 1) * 100) / (sourceCount + 1)}%` } : undefined}
          className={`!w-2.5 !h-2.5 ${theme.handle} border-2 border-background !z-50 rounded-full hover:scale-125 transition-transform`}
        />
      ))}

      {/* Floating Hover Inspector Tooltip */}
      {isHovered && !isExpanded && (
        <div className="absolute z-[9999] bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 rounded-lg bg-popover text-[11px] text-foreground pointer-events-none min-w-[150px] shadow-xl border border-border">
          <p className={`font-semibold ${theme.text} border-b border-border pb-1 mb-1.5`}>{data.type}</p>
          <div className="space-y-1 font-mono text-[11px]">
            {shape ? (
              <p className="flex justify-between gap-4"><span className="text-muted-foreground">Dim:</span> <span className="text-weave-teal font-medium">{shape.join(' × ')}</span></p>
            ) : (
              <p className="text-muted-foreground italic">No dimension data</p>
            )}
            {keyParamLine && (
              <p className="text-muted-foreground border-t border-border pt-1.5 mt-1.5 leading-relaxed">{keyParamLine}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}