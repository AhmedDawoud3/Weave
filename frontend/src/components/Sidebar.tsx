import { Database, Brain, Gauge, Dumbbell } from 'lucide-react';
import type { DragEvent } from 'react';

type NodeType = 'Dataset' | 'Model' | 'Optimizer' | 'Trainer';

interface SidebarItem {
  type: NodeType;
  label: string;
  icon: React.ElementType;
  color: string;
}

const sidebarItems: SidebarItem[] = [
  { type: 'Dataset', label: 'Dataset', icon: Database, color: 'bg-emerald-500/20 border-emerald-500 hover:bg-emerald-500/30' },
  { type: 'Model', label: 'Model', icon: Brain, color: 'bg-blue-500/20 border-blue-500 hover:bg-blue-500/30' },
  { type: 'Optimizer', label: 'Optimizer', icon: Gauge, color: 'bg-amber-500/20 border-amber-500 hover:bg-amber-500/30' },
  { type: 'Trainer', label: 'Trainer', icon: Dumbbell, color: 'bg-purple-500/20 border-purple-500 hover:bg-purple-500/30' },
];

function Sidebar() {
  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-56 bg-slate-800 border-r border-slate-700 p-4 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Components
      </h2>
      
      {sidebarItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.type}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg border
              cursor-grab active:cursor-grabbing
              transition-all duration-150
              ${item.color}
            `}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
          >
            <Icon className="w-5 h-5 text-slate-300" />
            <span className="text-sm font-medium text-white">{item.label}</span>
          </div>
        );
      })}

      <div className="mt-auto pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          Drag components onto the canvas to build your neural network pipeline.
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
