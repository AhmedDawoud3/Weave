import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { ArrowLeftCircle } from 'lucide-react';

export type ModuleOutputNodeData = {
  label: string;
  portIndex: number;
};

export type ModuleOutputNodeType = Node<ModuleOutputNodeData, 'moduleOutput'>;

function ModuleOutputNode({ data, selected }: NodeProps<ModuleOutputNodeType>) {
  return (
    <div
      className={`
        min-w-[120px] rounded-xl border-2 border-red-500/60 bg-red-500/10 px-4 py-3 shadow-lg
        ${selected ? 'ring-2 ring-red-400/60 ring-offset-2 ring-offset-slate-900' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-red-400 !border-2 !border-red-700"
      />

      <div className="flex items-center gap-2">
        <ArrowLeftCircle className="w-4 h-4 text-red-400" />
        <div className="text-sm font-semibold text-red-100">{data.label}</div>
      </div>
      <div className="mt-1 text-xs text-red-300/60">Module Output</div>
    </div>
  );
}

export default memo(ModuleOutputNode);
