import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { ArrowRightCircle } from 'lucide-react';

export type ModuleInputNodeData = {
  label: string;
  portIndex: number;
};

export type ModuleInputNodeType = Node<ModuleInputNodeData, 'moduleInput'>;

function ModuleInputNode({ data, selected }: NodeProps<ModuleInputNodeType>) {
  return (
    <div
      className={`
        min-w-[120px] rounded-xl border-2 border-green-500/60 bg-green-500/10 px-4 py-3 shadow-lg
        ${selected ? 'ring-2 ring-green-400/60 ring-offset-2 ring-offset-slate-900' : ''}
      `}
    >
      <div className="flex items-center gap-2">
        <ArrowRightCircle className="w-4 h-4 text-green-400" />
        <div className="text-sm font-semibold text-green-100">{data.label}</div>
      </div>
      <div className="mt-1 text-xs text-green-300/60">Module Input</div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-green-700"
      />
    </div>
  );
}

export default memo(ModuleInputNode);
