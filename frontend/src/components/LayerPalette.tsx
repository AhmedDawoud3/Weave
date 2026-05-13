import { Layers, Sparkles, Shrink, BadgeCheck, Box, Plus, Trash2 } from 'lucide-react';
import type { DragEvent, ElementType } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { SubGraphNode, SubGraphEdge } from './nodes/CustomNode';

export type PaletteDragData = {
  nodeType: 'layerNode' | 'activationNode' | 'customNode';
  label: string;
  dimensions?: string;
  // For custom nodes from library
  moduleId?: string;
  subNodes?: SubGraphNode[];
  subEdges?: SubGraphEdge[];
  inputCount?: number;
  outputCount?: number;
};

type LayerPaletteItem = Omit<PaletteDragData, 'moduleId' | 'subNodes' | 'subEdges' | 'inputCount' | 'outputCount'> & {
  description: string;
  icon: ElementType;
  accent: string;
};

const paletteItems: LayerPaletteItem[] = [
  {
    nodeType: 'layerNode',
    label: 'Linear',
    dimensions: 'in: 784, out: 128',
    description: 'Fully connected layer',
    icon: Layers,
    accent: 'border-blue-500/60 bg-blue-500/10 text-blue-200',
  },
  {
    nodeType: 'activationNode',
    label: 'ReLU',
    description: 'Activation function',
    icon: Sparkles,
    accent: 'border-amber-500/60 bg-amber-500/10 text-amber-200',
  },
  {
    nodeType: 'layerNode',
    label: 'Flatten',
    dimensions: 'shape: 1x28x28 -> 784',
    description: 'Flatten tensors',
    icon: Shrink,
    accent: 'border-slate-500/60 bg-slate-500/10 text-slate-200',
  },
  {
    nodeType: 'layerNode',
    label: 'Output',
    dimensions: 'in: 128, out: 10',
    description: 'Classification head',
    icon: BadgeCheck,
    accent: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200',
  },
];

function LayerPalette() {
  const modules = useQuery(api.modules.listModules);
  const deleteModule = useMutation(api.modules.deleteModule);

  const handleDragStart = (event: DragEvent<HTMLDivElement>, item: PaletteDragData) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(item));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleNewModule = (event: DragEvent<HTMLDivElement>) => {
    const newModuleData: PaletteDragData = {
      nodeType: 'customNode',
      label: 'New Module',
      subNodes: [],
      subEdges: [],
      inputCount: 1,
      outputCount: 1,
    };
    event.dataTransfer.setData('application/reactflow', JSON.stringify(newModuleData));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDeleteModule = async (moduleId: Id<"modules">, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    if (confirm('Delete this module from the library?')) {
      await deleteModule({ id: moduleId });
    }
  };

  return (
    <aside className="absolute left-4 top-4 z-10 w-56 max-h-[calc(100vh-120px)] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/90 p-4 shadow-xl backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Layer Palette
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {paletteItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`
                flex cursor-grab flex-col gap-1 rounded-lg border px-3 py-2 transition
                active:cursor-grabbing hover:border-slate-500 ${item.accent}
              `}
              draggable
              onDragStart={(event) => handleDragStart(event, item)}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
              <div className="text-xs text-slate-400">{item.description}</div>
            </div>
          );
        })}
      </div>

      {/* Modules Section - Always visible */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="text-xs font-semibold uppercase tracking-wider text-violet-400">
          Custom Modules
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {/* New Module Button */}
          <div
            className="flex cursor-grab items-center gap-2 rounded-lg border-2 border-dashed border-violet-500/60 bg-violet-500/10 px-3 py-3 text-violet-200 transition hover:border-violet-400 hover:bg-violet-500/20 active:cursor-grabbing"
            draggable
            onDragStart={handleNewModule}
          >
            <Plus className="h-5 w-5" />
            <div>
              <span className="text-sm font-semibold">New Module</span>
              <div className="text-xs text-violet-300/60">Drag to create</div>
            </div>
          </div>

          {/* Loading state */}
          {modules === undefined && (
            <div className="text-xs text-slate-500 text-center py-2">
              Loading modules...
            </div>
          )}

          {/* Saved Modules */}
          {modules?.map((module) => (
            <div
              key={module.id}
              className="group flex cursor-grab flex-col gap-1 rounded-lg border border-violet-500/60 bg-violet-500/10 px-3 py-2 text-violet-200 transition hover:border-violet-400 active:cursor-grabbing"
              draggable
              onDragStart={(event) =>
                handleDragStart(event, {
                  nodeType: 'customNode',
                  label: module.name,
                  moduleId: module.id,
                  subNodes: module.nodes as SubGraphNode[],
                  subEdges: module.edges as SubGraphEdge[],
                  inputCount: module.inputCount,
                  outputCount: module.outputCount,
                })
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Box className="h-4 w-4" />
                  <span>{module.name}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteModule(module.id as Id<"modules">, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 transition"
                  title="Delete module"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="text-xs text-violet-300/60">
                {module.inputCount} in / {module.outputCount} out
              </div>
            </div>
          ))}

          {modules !== undefined && modules.length === 0 && (
            <div className="text-xs text-slate-500 text-center py-2">
              No saved modules yet
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default LayerPalette;
