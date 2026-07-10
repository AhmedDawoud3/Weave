import { useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node, useUpdateNodeInternals } from '@xyflow/react';
import { Network, ChevronDown, ChevronUp, Trash2, ShieldAlert } from 'lucide-react';
import type { NodeData } from '../types';
import { useWeaveStore, getInducedParam } from '../store/useWeaveStore';

interface KeyParam { label: string; key: string; format?: (v: any) => string }

const KEY_PARAMS: Partial<Record<string, KeyParam[]>> = {
  Conv2d:           [{ label: 'In→Out', key: '_channels', format: (p) => `${p.in_channels}→${p.out_channels}` }, { label: 'K', key: 'kernel_size' }, { label: 'S', key: 'stride' }],
  ConvTranspose2d:  [{ label: 'In→Out', key: '_channels', format: (p) => `${p.in_channels}→${p.out_channels}` }, { label: 'K', key: 'kernel_size' }, { label: 'S', key: 'stride' }],
  MaxPool2d:        [{ label: 'K', key: 'kernel_size' }, { label: 'S', key: 'stride' }],
  AvgPool2d:        [{ label: 'K', key: 'kernel_size' }, { label: 'S', key: 'stride' }],
  AdaptiveAvgPool2d:[{ label: 'Out', key: 'output_size', format: (p) => JSON.stringify(p.output_size) }],
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
  else if (['BatchNorm2d','LayerNorm','GroupNorm'].includes(type)) color = 'teal';
  else if (['ReLU','GELU','Sigmoid','Tanh','Softmax'].includes(type)) color = 'emerald';

  const colorMap: Record<string, any> = {
    blue: {
      topBar: 'bg-weave-blue',
      text: 'text-weave-blue',
      border: selected ? 'border-weave-blue shadow-[0_0_15px_rgba(26,188,254,0.3)]' : 'border-border hover:border-weave-blue/40',
      badge: 'bg-weave-blue/10 text-weave-blue border-weave-blue/20',
      handle: '!bg-weave-blue',
      icon: 'text-weave-blue',
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
    }
  };

  return colorMap[color];
};

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

  const updateNodeInternals = useUpdateNodeInternals();

  const incomingEdges = edges.filter(e => e.target === id);
  const incomingEdgesCount = incomingEdges.length;

  const isMultiInput = ['Add', 'Concat', 'Multiply'].includes(data.type);
  const isBlock = ['Block', 'ResidualBlock', 'TransformerEncoder', 'MultiHeadAttention', 'ConvBNReLU', 'BottleneckBlock', 'BatchNorm2dManualBlock', 'AttentionManualBlock', 'RNNManualBlock', 'CustomAutogradManualBlock'].includes(data.type);
  const isInputNode  = data.type === 'InputNode';
  const isOutputNode = data.type === 'OutputNode';

  const isOutputConnected = isOutputNode
    ? incomingEdgesCount > 0
    : edges.some(e => e.source === id);

  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState<string>(data.label ?? '');

  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dragging) {
      setIsHovered(false);
      setIsExpanded(false);
    }
  }, [dragging]);

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
        ? 'opacity-65 cursor-not-allowed border-primary/30 text-primary font-bold font-mono' 
        : 'border-border text-white focus:border-primary/50'
    }`;

    if (f.type === 'boolean') {
      return (
        <div key={f.key} className="flex items-center justify-between py-1 bg-white/[0.01] px-1.5 rounded-md">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{f.label}</span>
          <button
            type="button"
            className={`nodrag text-[10px] px-2.5 py-0.5 rounded font-bold border transition-all cursor-pointer ${
              raw !== false ? 'bg-primary/20 border-primary/45 text-primary shadow-[0_0_8px_rgba(108,60,225,0.15)]' : 'bg-white/5 border-border text-neutral-400 hover:bg-white/10'
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
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{f.label}</span>
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
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{f.label}</span>
          {isInduced && (
            <span className="text-[8px] font-extrabold uppercase tracking-wider text-weave-teal bg-weave-teal/10 px-1 py-0.5 rounded border border-weave-teal/20">
              🔒 Induced
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
  const baseW = isBlock ? 'w-[100px]' : 'w-[80px]';
  const hoveredW = isBlock ? 'w-[130px]' : 'w-[110px]';
  const expandedW = 'w-[190px]';
  const cardW = isExpanded ? expandedW : isHovered ? hoveredW : baseW;

  return (
    <div
      ref={nodeRef}
      className="relative select-none group"
      onMouseEnter={() => { if (!dragging) setIsHovered(true); }}
      onMouseLeave={() => { setIsHovered(false); setIsExpanded(false); }}
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
      <div className={`bg-card/90 backdrop-blur-md border ${theme.border} ${cardW} rounded-lg shadow-xl overflow-hidden transition-all duration-200 relative pt-1`}>
        
        {/* Colorful top strip */}
        <div className={`h-1.5 w-full absolute top-0 left-0 ${theme.topBar}`} />

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
          <span className={`text-[8.5px] font-extrabold tracking-wider ${theme.text} uppercase`}>
            {data.type}
          </span>

          {/* Node Label (Inline Click-to-Edit) */}
          <div className="flex items-center justify-center gap-1.5 w-full">
            {isBlock && <Network size={10} className="text-indigo-400 shrink-0" />}
            
            {editingLabel ? (
              <div className="flex gap-1 items-center nodrag w-full">
                <input
                  autoFocus
                  className="w-full bg-background border border-border rounded px-1.5 py-0.5 text-xs text-white text-center focus:outline-none focus:border-primary/50"
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onBlur={commitLabel}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitLabel(); }}
                />
              </div>
            ) : (
              <span
                onClick={(e) => { e.stopPropagation(); setEditingLabel(true); }}
                className={`text-[10px] font-bold text-white uppercase truncate cursor-pointer hover:underline ${
                  isHovered || isExpanded ? 'max-w-[100px]' : 'max-w-[60px]'
                }`}
              >
                {data.label || data.type}
              </span>
            )}
          </div>

          {/* Output Shape Badge — visible on hover or expanded */}
          {(isHovered || isExpanded) && !isOutputConnected && (
            shape ? (
              <div className="text-[8px] font-mono text-weave-teal font-semibold mt-1 bg-weave-teal/5 px-1 py-0 border border-weave-teal/10 rounded">
                {shape.join(' × ')}
              </div>
            ) : (
              <div className="text-[8px] text-muted-foreground/30 mt-1 font-mono select-none">
                no dimensions
              </div>
            )
          )}

          {/* Error Message Flag */}
          {isError && (
            <div className="flex items-center gap-1 mt-2 text-[10px] text-red-400 font-bold bg-red-500/10 border border-red-500/25 py-0.5 px-2 rounded-full animate-pulse max-w-full">
              <ShieldAlert size={11} className="shrink-0" />
              <span className="truncate" title={data.error || 'Configuration error'}>{data.error}</span>
            </div>
          )}
        </div>

        {/* Configurations & Connections Drawer — visible on hover or expanded */}
        {!isInputNode && !isOutputNode && (isHovered || isExpanded) && (
          <div className="border-t border-border bg-black/15 select-none">
            
            {/* Short compact parameter summary */}
            {keyParamLine && !isExpanded && (
              <div className="text-[8px] text-muted-foreground/80 font-mono tracking-tight text-center leading-tight py-1 select-none border-b border-border/5">
                {keyParamLine}
              </div>
            )}

            {/* Complete parameters editing block */}
            {isExpanded && (
              <div className="p-3.5 space-y-1.5 text-left border-b border-border/5">
                {fullFields.map(renderField)}
                {fullFields.length === 0 && (
                  <p className="text-[10px] text-muted-foreground italic text-center py-2">No configuration inputs</p>
                )}

                {/* Internal Connections list */}
                {incomingEdges.length > 0 && (
                  <div className="space-y-1.5 border-t border-border pt-3 mt-3 select-none">
                    <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wider block mb-1">Incoming Links</span>
                    <div className="space-y-1.5">
                      {incomingEdges.map((edge) => {
                        const sourceNode = allNodes.find(n => n.id === edge.source);
                        const handleNum = edge.targetHandle ? edge.targetHandle.split('_')[1] : '0';
                        const handleLabel = targetCount > 1 ? `Port ${Number(handleNum) + 1}` : 'Port';
                        return (
                          <div key={edge.id} className="flex items-center justify-between bg-background border border-border rounded-lg px-2 py-1 text-[10px] font-mono gap-1.5">
                            <span className="text-primary font-black">{handleLabel}:</span>
                            <span className="text-white/60 truncate flex-1">{sourceNode?.data?.label || edge.source}</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeEdge(edge.id); }}
                              className="nodrag p-1 rounded bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 flex items-center justify-center transition-colors cursor-pointer text-[8px] font-bold"
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
              className="nodrag w-full flex items-center justify-center gap-1 text-[8.5px] text-muted-foreground hover:text-white transition-colors py-1 cursor-pointer focus:outline-none"
              onClick={(e) => { e.stopPropagation(); setIsExpanded(v => !v); }}
            >
              {isExpanded ? (
                <><ChevronUp size={12} /><span>COLLAPSE</span></>
              ) : (
                <><ChevronDown size={12} /><span>EDIT PARAMETERS</span></>
              )}
            </button>
          </div>
        )}

        {/* Double-click nested block help tag */}
        {isBlock && !isExpanded && (
          <div className="text-[6px] text-indigo-400/40 uppercase tracking-widest text-center pb-1.5 font-black">
            2× Click Inside
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
    </div>
  );
}