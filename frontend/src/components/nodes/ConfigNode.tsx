import { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Settings, Database, Brain, Gauge, Dumbbell } from 'lucide-react';

export type ConfigNodeData = {
  label: string;
  type: 'Dataset' | 'Model' | 'Optimizer' | 'Trainer';
};

export type ConfigNodeType = Node<ConfigNodeData, 'configNode'>;

const nodeIcons: Record<ConfigNodeData['type'], React.ElementType> = {
  Dataset: Database,
  Model: Brain,
  Optimizer: Gauge,
  Trainer: Dumbbell,
};

const nodeColors: Record<ConfigNodeData['type'], string> = {
  Dataset: 'border-emerald-500 bg-emerald-500/10',
  Model: 'border-blue-500 bg-blue-500/10',
  Optimizer: 'border-amber-500 bg-amber-500/10',
  Trainer: 'border-purple-500 bg-purple-500/10',
};

function ConfigNode({ data, selected }: NodeProps<ConfigNodeType>) {
  const Icon = nodeIcons[data.type];
  const colorClass = nodeColors[data.type];

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[140px]
        bg-slate-800 shadow-lg transition-all
        ${colorClass}
        ${selected ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-slate-900' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-600"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-300" />
          <span className="text-sm font-medium text-white">{data.label}</span>
        </div>
        <button
          className="nodrag p-1 rounded hover:bg-slate-700 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            console.log('Open settings for:', data.label);
          }}
        >
          <Settings className="w-4 h-4 text-slate-400 hover:text-white" />
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-600"
      />
    </div>
  );
}

export default memo(ConfigNode);
