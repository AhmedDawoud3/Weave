import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

export type ActivationNodeData = {
  label: string;
};

export type ActivationNodeType = Node<ActivationNodeData, 'activationNode'>;

function ActivationNode({ data, selected }: NodeProps<ActivationNodeType>) {
  return (
    <div
      className={`
        min-w-[140px] rounded-xl border border-amber-500/60 bg-amber-500/10 px-4 py-3 shadow-lg
        ${selected ? 'ring-2 ring-amber-400/60 ring-offset-2 ring-offset-slate-900' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-amber-700"
      />

      <div className="text-sm font-semibold text-amber-100">{data.label}</div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-amber-700"
      />
    </div>
  );
}

export default memo(ActivationNode);
