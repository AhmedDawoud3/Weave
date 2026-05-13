import { memo, useCallback, type ChangeEvent } from 'react';
import { Handle, Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';

export type LayerNodeData = {
  label: string;
  dimensions: string;
};

export type LayerNodeType = Node<LayerNodeData, 'layerNode'>;

function LayerNode({ id, data, selected }: NodeProps<LayerNodeType>) {
  const { setNodes } = useReactFlow();

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/46cb2336-c027-4752-a0ab-d812af647802',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LayerNode.tsx:render',message:'LayerNode rendered in module editor',data:{nodeId:id,label:data.label,dimensions:data.dimensions,hasDimensionsField:'dimensions' in data},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4-H5'})}).catch(()=>{});
  // #endregion

  const handleDimensionsChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, dimensions: value } } : node
        )
      );
    },
    [id, setNodes]
  );

  return (
    <div
      className={`
        min-w-[180px] rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 shadow-lg
        ${selected ? 'ring-2 ring-blue-400/60 ring-offset-2 ring-offset-slate-900' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-700"
      />

      <div className="text-sm font-semibold text-white">{data.label}</div>
      <input
        className="nodrag mt-2 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
        value={data.dimensions}
        onChange={handleDimensionsChange}
        placeholder="in: 784, out: 128"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-700"
      />
    </div>
  );
}

export default memo(LayerNode);
