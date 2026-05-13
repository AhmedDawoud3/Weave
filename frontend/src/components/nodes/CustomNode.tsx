import { memo, useCallback, type MouseEvent } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Layers, ArrowRight, ArrowLeft } from 'lucide-react';
import { useModuleStore } from '../../store/moduleStore';

export interface SubGraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown> | null;
}

export interface SubGraphEdge {
  id: string;
  source: string;
  target: string;
}

export type CustomNodeData = {
  label: string;
  moduleId?: string;
  subNodes: SubGraphNode[];
  subEdges: SubGraphEdge[];
  inputCount?: number;
  outputCount?: number;
};

export type CustomNodeType = Node<CustomNodeData, 'customNode'>;

function CustomNode({ id, data, selected }: NodeProps<CustomNodeType>) {
  const openModuleEditor = useModuleStore((state) => state.openEditor);

  const handleDoubleClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      openModuleEditor(id, data);
    },
    [id, data, openModuleEditor]
  );

  // Count inputs and outputs from sub-graph
  const inputCount = data.inputCount ?? 1;
  const outputCount = data.outputCount ?? 1;

  return (
    <div
      className={`
        min-w-[180px] rounded-xl border-2 border-violet-500/60 bg-violet-500/10 px-4 py-3 shadow-lg cursor-pointer
        ${selected ? 'ring-2 ring-violet-400/60 ring-offset-2 ring-offset-slate-900' : ''}
      `}
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-violet-700"
      />

      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-violet-400" />
        <div className="text-sm font-semibold text-violet-100">{data.label}</div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-violet-300/70">
        <div className="flex items-center gap-1">
          <ArrowRight className="w-3 h-3" />
          <span>{inputCount} in</span>
        </div>
        <div className="flex items-center gap-1">
          <span>{outputCount} out</span>
          <ArrowLeft className="w-3 h-3" />
        </div>
      </div>

      <div className="mt-2 text-xs text-violet-400/50 text-center">
        Double-click to edit
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-violet-700"
      />
    </div>
  );
}

export default memo(CustomNode);
