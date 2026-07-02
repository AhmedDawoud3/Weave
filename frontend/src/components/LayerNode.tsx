import { useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, useUpdateNodeInternals } from 'reactflow';
import { Network, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import type { NodeData } from '../types';
import { useWeaveStore } from '../store/useWeaveStore';

// ─── per-layer key parameter config ───────────────────────────────────────────
// Each entry defines what shows as the compact "key stat" on hover (before dropdown).
// label: display label, key: param key, format: optional value formatter
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

// ─── full editable field config ───────────────────────────────────────────────
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
  Mean:             [{ label: 'Dim', key: 'dim', type: 'json', placeholder: '0, 2, 3' }, { label: 'Keepdim', key: 'keepdim', type: 'boolean' }],
  Var:              [{ label: 'Dim', key: 'dim', type: 'json', placeholder: '0, 2, 3' }, { label: 'Keepdim', key: 'keepdim', type: 'boolean' }, { label: 'Unbiased', key: 'unbiased', type: 'boolean' }],
  Sqrt:             [{ label: 'Eps', key: 'eps', type: 'number' }],
  Scale:            [{ label: 'Value', key: 'value', type: 'number' }],
  ChannelScaleBias: [{ label: 'Num Features', key: 'num_features', type: 'number' }],
  Slice:            [{ label: 'Dim', key: 'dim', type: 'number' }, { label: 'Index', key: 'index', type: 'number' }],
  CustomAutograd:   [{ label: 'Forward Code', key: 'forward_code', type: 'text' }, { label: 'Backward Code', key: 'backward_code', type: 'text' }],
};

// ─── Component ────────────────────────────────────────────────────────────────
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

  // ── hover / dropdown state ─────────────────────────────────────────────────
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState<string>(data.label ?? '');
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Collapse and cancel timers immediately when dragging starts
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
    // Cancel any pending collapse
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    // Only expand after the user deliberately pauses — 400ms delay prevents
    // accidental expansion when quickly moving across the node to grab a handle
    enterTimer.current = setTimeout(() => setIsHovered(true), 400);
  }, [dragging]);

  const onMouseLeave = useCallback(() => {
    // Cancel pending expand immediately on leave
    if (enterTimer.current) clearTimeout(enterTimer.current);
    // Collapse after a short grace period (lets user move into the expanded panel)
    leaveTimer.current = setTimeout(() => {
      if (!isExpanded) setIsHovered(false);
    }, 200);
  }, [isExpanded]);

  const commitLabel = () => {
    if (labelDraft.trim()) updateNodeLabel(id, labelDraft.trim() as string);
    setEditingLabel(false);
  };

  const handleParamChange = (key: string, value: any) => {
    updateNodeParams(id, { [key]: value });
  };

  // ── handle counts for blocks ───────────────────────────────────────────────
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

  // ── colour themes ──────────────────────────────────────────────────────────
  let typeColor  = 'text-purple-400/90';
  let border     = selected ? 'border-primary shadow-[0_0_15px_rgba(64,211,182,0.35)]' : 'border-primary/20 hover:border-primary/50';
  let handleCls  = '!bg-primary';
  let bgCls      = 'bg-[#0e0e12]/85';

  if (isInputNode) {
    typeColor = 'text-emerald-400';
    border    = selected ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-emerald-500/30 hover:border-emerald-500/60';
    handleCls = '!bg-emerald-500';
  } else if (isOutputNode) {
    typeColor = 'text-amber-400';
    border    = selected ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]'  : 'border-amber-500/30 hover:border-amber-500/60';
    handleCls = '!bg-amber-500';
  } else if (isBlock) {
    typeColor = 'text-indigo-400';
    border    = selected
      ? 'border-indigo-500 ring-2 ring-indigo-500/40 ring-offset-2 ring-offset-[#070709] shadow-[0_0_20px_rgba(99,102,241,0.5)]'
      : 'border-indigo-500/50 ring-1 ring-indigo-500/20 ring-offset-2 ring-offset-[#070709] hover:border-indigo-400 hover:shadow-[0_0_18px_rgba(99,102,241,0.4)]';
    handleCls = '!bg-indigo-500';
    bgCls     = 'bg-[#12112a]/90';
  } else {
    if      (['Add','Concat','Multiply'].includes(data.type))                              typeColor = 'text-yellow-400/90';
    else if (['BatchNorm2d','LayerNorm','GroupNorm'].includes(data.type))                  typeColor = 'text-teal-400/90';
    else if (['Linear','Flatten','Reshape','Permute','Dropout','Dropout2d'].includes(data.type)) typeColor = 'text-blue-400/90';
    else if (['ReLU','GELU','Sigmoid','Tanh','Softmax'].includes(data.type))               typeColor = 'text-emerald-400/90';
  }

  if (isError) {
    border = isBlock
      ? 'border-red-500 ring-2 ring-red-500/30 ring-offset-2 ring-offset-[#070709] shadow-[0_0_15px_rgba(239,68,68,0.3)]'
      : 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.25)]';
  }

  const cardBase = `${bgCls} backdrop-blur-md border ${border} transition-all duration-200 rounded-lg shadow-xl`;

  // ── key params for hover summary ───────────────────────────────────────────
  const keyParamDefs = KEY_PARAMS[data.type] || [];
  const keyParamLine = keyParamDefs.map(kp =>
    kp.format ? kp.format(data.params) : `${kp.label}=${data.params?.[kp.key] ?? '–'}`
  ).join('  ');

  // ── full field renderer (inside expanded dropdown) ─────────────────────────
  const renderField = (f: FieldDef) => {
    const raw = data.params?.[f.key];
    const inputCls = 'nodrag w-full bg-[#070709] border border-primary/15 rounded-md px-2 py-0.5 text-[10px] text-white focus:outline-none focus:border-primary/50 transition-colors';

    if (f.type === 'boolean') {
      return (
        <div key={f.key} className="flex items-center justify-between">
          <span className="text-[9px] text-neutral-400 font-medium">{f.label}</span>
          <button
            className={`nodrag text-[9px] px-2 py-0.5 rounded font-bold border transition-all ${
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
        <div key={f.key} className="space-y-0.5">
          <span className="text-[9px] text-neutral-400 font-medium">{f.label}</span>
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
      <div key={f.key} className="space-y-0.5">
        <span className="text-[9px] text-neutral-400 font-medium">{f.label}</span>
        <input
          type="number"
          className={inputCls}
          step={f.step}
          min={f.min}
          max={f.max}
          defaultValue={raw ?? 0}
          onBlur={(e) => handleParamChange(f.key, Number(e.target.value))}
        />
      </div>
    );
  };

  const fullFields = FULL_FIELDS[data.type] || [];

  // ── Calculate dynamic visual sorting of input handles to prevent crossed lines ──
  const handleSourceX = Array.from({ length: targetCount }).map((_, i) => {
    const targetHandleId = `input_${i}`;
    const edge = incomingEdges.find(e => e.targetHandle === targetHandleId || (targetCount === 1 && !e.targetHandle));
    if (edge) {
      const sourceNode = allNodes.find(n => n.id === edge.source);
      if (sourceNode) {
        return { index: i, x: sourceNode.position.x };
      }
    }
    return { index: i, x: i * 10000 }; // Default to index order if not connected
  });

  const sortedHandles = [...handleSourceX].sort((a, b) => a.x - b.x);
  const visualPositionMap = new Map<number, number>();
  sortedHandles.forEach((h, rank) => {
    visualPositionMap.set(h.index, rank);
  });

  const rankKey = Array.from({ length: targetCount })
    .map((_, i) => visualPositionMap.get(i) ?? i)
    .join(',');

  // Force React Flow to recalculate handle offsets and redraw edges when handles move or scale
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, targetCount, rankKey, updateNodeInternals]);

  const baseW = isBlock ? 'min-w-[152px] max-w-[178px]' : 'min-w-[110px] max-w-[135px]';
  const expandedW = 'min-w-[190px] max-w-[210px]';
  const cardW = isExpanded ? expandedW : baseW;

  return (
    <div
      className="relative group"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* ── Target handles top ── */}
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
            className={`w-2.5 h-2.5 ${handleCls} border border-[#070709] !z-50 rounded-full`}
          />
        );
      })}

      {/* ── Delete × badge (top-right, appears on hover) ── */}
      <button
        className="nodrag absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#1a0a0a] border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center text-[9px] font-black shadow-md scale-0 group-hover:scale-100 transition-all duration-150 z-[70] cursor-pointer leading-none"
        title="Remove layer"
        onClick={(e) => { e.stopPropagation(); removeNode(id); }}
      >
        ✕
      </button>

      {/* ── Card ── */}
      <div className={`${cardBase} ${cardW} transition-all duration-200 overflow-hidden`}>

        {/* Error pulse */}
        {isError && (
          <div className="absolute right-1.5 top-1 text-red-500 animate-pulse z-10 text-[9px]" title={data.error || 'Error'}>⚠</div>
        )}

        {/* ── Collapsed / resting state ── */}
        <div className={`py-1.5 px-3 text-center ${isBlock ? '' : ''}`}>
          {/* Type chip */}
          <div className={`text-[7px] font-black ${typeColor} tracking-wider uppercase mb-0.5`}>
            {data.type}
          </div>

          {/* Label row — icon for blocks */}
          <div className="flex items-center justify-center gap-1">
            {isBlock && <Network size={9} className="text-indigo-400 shrink-0" strokeWidth={2.5} />}
            <span className="text-[10px] font-bold text-white uppercase line-clamp-1 truncate">
              {data.label}
            </span>
          </div>

          {/* Shape badge (always visible once compiled) */}
          {shape && (
            <div className={`mt-0.5 text-[7.5px] font-bold tracking-tight ${isBlock ? 'text-indigo-300' : 'text-[#40d3b6]'}`}>
              [{shape.join(', ')}]
            </div>
          )}
        </div>

        {/* ── Hover expansion: key params + chevron ── */}
        {(isHovered || isExpanded) && !isInputNode && !isOutputNode && (
          <div className="border-t border-white/[0.05] px-3 pb-1.5 pt-1.5">
            {/* Key params line */}
            {keyParamLine && (
              <div className="text-[8.5px] text-neutral-300 font-mono tracking-tight text-center leading-tight mb-1.5">
                {keyParamLine}
              </div>
            )}

            {/* Expanded full fields */}
            {isExpanded && (
              <div className="space-y-2 mb-2">
                {/* Rename label */}
                <div className="space-y-0.5">
                  <span className="text-[9px] text-neutral-400 font-medium">Name</span>
                  {editingLabel ? (
                    <div className="flex gap-1 items-center">
                      <input
                        autoFocus
                        className="nodrag flex-1 bg-[#070709] border border-primary/30 rounded-md px-2 py-0.5 text-[10px] text-white focus:outline-none"
                        value={labelDraft}
                        onChange={(e) => setLabelDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitLabel(); if (e.key === 'Escape') { setLabelDraft(data.label ?? ''); setEditingLabel(false); } }}
                      />
                      <button onClick={commitLabel} className="nodrag text-emerald-400 hover:text-emerald-300"><Check size={10} /></button>
                      <button onClick={() => { setLabelDraft(data.label ?? ''); setEditingLabel(false); }} className="nodrag text-red-400 hover:text-red-300"><X size={10} /></button>
                    </div>
                  ) : (
                    <button
                      className="nodrag w-full text-left bg-[#070709] border border-white/10 rounded-md px-2 py-0.5 text-[10px] text-white/80 hover:border-primary/30 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setEditingLabel(true); }}
                    >
                      {data.label}
                    </button>
                  )}
                </div>

                {/* All params */}
                {fullFields.map(renderField)}

                {fullFields.length === 0 && (
                  <p className="text-[8px] text-neutral-500 italic text-center">No configurable parameters</p>
                )}

                {/* Incoming Connections Section */}
                {incomingEdges.length > 0 && (
                  <div className="space-y-1 border-t border-white/[0.05] pt-2 mt-2 text-left">
                    <span className="text-[7.5px] text-neutral-400 font-extrabold uppercase tracking-wider block mb-1">Incoming Connections</span>
                    <div className="space-y-1">
                      {incomingEdges.map((edge) => {
                        const sourceNode = allNodes.find(n => n.id === edge.source);
                        const handleNum = edge.targetHandle ? edge.targetHandle.split('_')[1] : '0';
                        const handleLabel = targetCount > 1 ? `Input ${Number(handleNum) + 1}` : 'Input';
                        return (
                          <div key={edge.id} className="flex items-center justify-between bg-black/45 rounded px-2 py-1 text-[9px] border border-white/[0.03]">
                            <div className="flex flex-col min-w-0">
                              <span className="text-primary/75 text-[6.5px] font-black uppercase font-mono leading-none mb-0.5">{handleLabel}</span>
                              <span className="text-white font-bold truncate max-w-[110px] leading-tight">{sourceNode?.data?.label || edge.source}</span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeEdge(edge.id); }}
                              className="nodrag w-4 h-4 rounded bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-[8px] font-bold shrink-0 ml-1"
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

            {/* Chevron toggle */}
            <button
              className="nodrag w-full flex items-center justify-center gap-0.5 text-[8px] text-neutral-500 hover:text-primary transition-colors py-0.5"
              onClick={(e) => { e.stopPropagation(); setIsExpanded(v => !v); if (isExpanded) setIsHovered(true); }}
            >
              {isExpanded ? (
                <><ChevronUp size={10} strokeWidth={2.5} /><span>collapse</span></>
              ) : (
                <><ChevronDown size={10} strokeWidth={2.5} /><span>all params</span></>
              )}
            </button>
          </div>
        )}

        {/* Block hint */}
        {isBlock && !isExpanded && (
          <div className="text-[7px] text-indigo-400/50 text-center pb-1.5 italic">
            double-click to enter
          </div>
        )}
      </div>

      {/* ── Source handles bottom ── */}
      {Array.from({ length: sourceCount }).map((_, i) => (
        <Handle
          key={`source-${i}`}
          type="source"
          position={Position.Bottom}
          id={`output_${i}`}
          style={sourceCount > 1 ? { left: `${((i + 1) * 100) / (sourceCount + 1)}%` } : undefined}
          className={`w-2.5 h-2.5 ${handleCls} border border-[#070709] !z-50 rounded-full`}
        />
      ))}
    </div>
  );
}