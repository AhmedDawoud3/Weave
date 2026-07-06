import { useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, useUpdateNodeInternals } from 'reactflow';
import { Network, ChevronDown, ChevronUp } from 'lucide-react';
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

export function LayerNode({ id, data, selected, dragging }: NodeProps<NodeData> & { selected?: boolean }) {
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

  // Hover / expansion state
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState<string>(data.label ?? '');
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (dragging) {
      if (enterTimer.current) clearTimeout(enterTimer.current);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
      setIsHovered(false);
      setIsExpanded(false);
    }
  }, [dragging]);

  const onMouseEnter = useCallback(() => {
    if (dragging) return;
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    enterTimer.current = setTimeout(() => setIsHovered(true), 350);
  }, [dragging]);

  const onMouseLeave = useCallback(() => {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    leaveTimer.current = setTimeout(() => {
      if (!isExpanded) setIsHovered(false);
    }, 200);
  }, [isExpanded]);

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

  // Color themes
  let typeColor  = 'text-purple-400/90';
  let borderCls  = selected ? 'border-primary shadow-[0_0_15px_rgba(108,60,225,0.35)]' : 'border-white/10 hover:border-white/20';
  let handleCls  = '!bg-primary';
  let bgCls      = 'bg-[#0f111a]';

  if (isInputNode) {
    typeColor = 'text-emerald-400';
    borderCls = selected ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.25)]' : 'border-emerald-500/20 hover:border-emerald-500/40';
    handleCls = '!bg-emerald-500';
    bgCls     = 'bg-[#0d1411]';
  } else if (isOutputNode) {
    typeColor = 'text-amber-400';
    borderCls = selected ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]' : 'border-amber-500/20 hover:border-amber-500/40';
    handleCls = '!bg-amber-500';
    bgCls     = 'bg-[#14100d]';
  } else if (isBlock) {
    typeColor = 'text-indigo-400';
    borderCls = selected ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'border-indigo-500/30 hover:border-indigo-500/50';
    handleCls = '!bg-indigo-500';
    bgCls     = 'bg-[#11121d]';
  } else {
    if      (['Add','Concat','Multiply'].includes(data.type))                              typeColor = 'text-yellow-400/90';
    else if (['BatchNorm2d','LayerNorm','GroupNorm'].includes(data.type))                  typeColor = 'text-teal-400/90';
    else if (['Linear','Flatten','Reshape','Permute','Dropout','Dropout2d'].includes(data.type)) typeColor = 'text-blue-400/90';
    else if (['ReLU','GELU','Sigmoid','Tanh','Softmax'].includes(data.type))               typeColor = 'text-emerald-400/90';
  }

  if (isError) {
    borderCls = 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.25)]';
    bgCls     = 'bg-[#1a0c0c]';
  }

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
    const inputCls = `nodrag w-full bg-background border rounded-md px-2 py-1 text-[10px] focus:outline-none transition-colors ${
      isInduced 
        ? 'opacity-65 cursor-not-allowed border-primary/30 text-primary font-bold font-mono' 
        : 'border-white/5 text-white focus:border-primary/50'
    }`;

    if (f.type === 'boolean') {
      return (
        <div key={f.key} className="flex items-center justify-between py-1">
          <span className="text-[9px] text-[#64748b] font-bold uppercase">{f.label}</span>
          <button
            type="button"
            className={`nodrag text-[9px] px-2 py-0.5 rounded font-bold border transition-all cursor-pointer ${
              raw !== false ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-neutral-400'
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
        <div key={f.key} className="space-y-0.5 py-1">
          <span className="text-[9px] text-[#64748b] font-bold uppercase">{f.label}</span>
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
      <div key={f.key} className="space-y-0.5 py-1">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-[#64748b] font-bold uppercase">{f.label}</span>
          {isInduced && (
            <span className="text-[7.5px] font-extrabold uppercase tracking-wider text-[#2DD4BF] bg-[#2DD4BF]/10 px-1 py-0.2 rounded border border-[#2DD4BF]/20">
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
  const baseW = isBlock ? 'w-44' : 'w-36';
  const expandedW = 'w-52';
  const cardW = isExpanded ? expandedW : baseW;

  return (
    <div
      className="relative group select-none"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
            className={`w-2 h-2 ${handleCls} border border-[#070709] !z-50 rounded-full`}
          />
        );
      })}

      {/* Delete Badge */}
      <button
        onClick={(e) => { e.stopPropagation(); removeNode(id); }}
        className="absolute -top-2 -right-2 w-4.5 h-4.5 rounded-full bg-[#1c0c0c] border border-red-500/30 hover:bg-red-500 hover:text-white text-red-400 flex items-center justify-center text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity z-50 cursor-pointer shadow-md select-none"
        title="Delete Layer"
      >
        ✕
      </button>

      {/* Expandable Node Content Area */}
      <div className={`backdrop-blur-md border ${bgCls} ${borderCls} ${cardW} rounded-lg shadow-xl overflow-hidden transition-all duration-200`}>
        
        {/* Error Flag */}
        {isError && (
          <div className="absolute right-2 top-1 text-red-500 text-[8px] animate-pulse" title={data.error || 'Layer Error'}>
            ⚠️
          </div>
        )}

        {/* Resting Content Row */}
        <div className="py-2 px-3 text-center flex flex-col items-center justify-center">
          {/* Node Type Header */}
          <div className={`text-[7px] font-black ${typeColor} tracking-wider uppercase mb-0.5`}>
            {data.type}
          </div>

          {/* Node Label (Editable directly on click) */}
          <div className="flex items-center justify-center gap-1 w-full">
            {isBlock && <Network size={8} className="text-indigo-400 shrink-0" />}
            
            {editingLabel ? (
              <div className="flex gap-1 items-center nodrag">
                <input
                  autoFocus
                  className="w-20 bg-background border border-white/10 rounded px-1 text-[9px] text-white focus:outline-none"
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onBlur={commitLabel}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitLabel(); }}
                />
              </div>
            ) : (
              <span
                onClick={(e) => { e.stopPropagation(); setEditingLabel(true); }}
                className="text-[10px] font-bold text-white uppercase truncate max-w-[100px] cursor-pointer hover:underline"
              >
                {data.label}
              </span>
            )}
          </div>

          {/* Output Shape Badge */}
          {shape ? (
            <div className="text-[7.5px] font-mono text-[#2DD4BF] mt-0.5 font-semibold">
              {shape.join('×')}
            </div>
          ) : (
            <div className="text-[7px] text-muted-foreground/40 mt-0.5 font-mono">
              no shape
            </div>
          )}
        </div>

        {/* Expanded Parameters Panel (Visible on Hover/Expand) */}
        {(isHovered || isExpanded) && !isInputNode && !isOutputNode && (
          <div className="border-t border-white/5 px-3 pb-2 pt-1.5 bg-black/10 select-none">
            
            {/* Key stats summary line */}
            {keyParamLine && !isExpanded && (
              <div className="text-[8px] text-neutral-300 font-mono tracking-tight text-center leading-tight py-1 select-none">
                {keyParamLine}
              </div>
            )}

            {/* Complete field configurations */}
            {isExpanded && (
              <div className="space-y-1 mt-1 text-left">
                {fullFields.map(renderField)}
                {fullFields.length === 0 && (
                  <p className="text-[8px] text-neutral-500 italic text-center py-1">No configurations</p>
                )}

                {/* Connections list */}
                {incomingEdges.length > 0 && (
                  <div className="space-y-1 border-t border-white/5 pt-2 mt-2 select-none">
                    <span className="text-[7.5px] text-[#64748b] font-black uppercase tracking-wider block mb-1">Incoming Links</span>
                    <div className="space-y-1">
                      {incomingEdges.map((edge) => {
                        const sourceNode = allNodes.find(n => n.id === edge.source);
                        const handleNum = edge.targetHandle ? edge.targetHandle.split('_')[1] : '0';
                        const handleLabel = targetCount > 1 ? `Port ${Number(handleNum) + 1}` : 'Port';
                        return (
                          <div key={edge.id} className="flex items-center justify-between bg-background border border-white/5 rounded px-1.5 py-0.5 text-[8px] font-mono gap-1">
                            <span className="text-primary text-[7.5px] font-black">{handleLabel}:</span>
                            <span className="text-white/60 truncate max-w-[80px] flex-1">{sourceNode?.data?.label || edge.source}</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeEdge(edge.id); }}
                              className="nodrag w-3.5 h-3.5 rounded bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 flex items-center justify-center transition-colors cursor-pointer text-[7px] font-bold"
                              title="Disconnect"
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

            {/* Expand toggle chevron button */}
            <button
              type="button"
              className="nodrag w-full flex items-center justify-center gap-0.5 text-[8px] text-muted-foreground hover:text-white transition-colors py-1 mt-1 cursor-pointer border-t border-white/5"
              onClick={(e) => { e.stopPropagation(); setIsExpanded(v => !v); if (isExpanded) setIsHovered(true); }}
            >
              {isExpanded ? (
                <><ChevronUp size={10} /><span>Collapse</span></>
              ) : (
                <><ChevronDown size={10} /><span>Edit Params</span></>
              )}
            </button>
          </div>
        )}

        {/* Double-click nested block help text */}
        {isBlock && !isExpanded && (
          <div className="text-[5.5px] text-indigo-400/40 uppercase tracking-wider text-center pb-1 font-bold">
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
          className={`w-2 h-2 ${handleCls} border border-[#070709] !z-50 rounded-full`}
        />
      ))}
    </div>
  );
}