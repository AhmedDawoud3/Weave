import { useCallback, useState, type DragEvent, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type OnConnect,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  X,
  Save,
  Library,
  Layers,
  Sparkles,
  Shrink,
  Grid3X3,
  Minus,
  Zap,
  Activity,
  Circle,
  ArrowDownUp,
  Box,
  Shuffle,
  RotateCcw,
  Hash,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useModuleStore, countModuleIO } from '../store/moduleStore';
import type { SubGraphNode, SubGraphEdge } from './nodes/CustomNode';
import LayerNode, { type LayerNodeData } from './nodes/LayerNode';
import ActivationNode from './nodes/ActivationNode';
import ModuleInputNode from './nodes/ModuleInputNode';
import ModuleOutputNode from './nodes/ModuleOutputNode';
import DeletableEdge from './edges/DeletableEdge';

const moduleNodeTypes: NodeTypes = {
  layerNode: LayerNode,
  activationNode: ActivationNode,
  moduleInput: ModuleInputNode,
  moduleOutput: ModuleOutputNode,
};

const moduleEdgeTypes: EdgeTypes = {
  deletable: DeletableEdge,
};

type PaletteDragData = {
  nodeType: string;
  label: string;
  dimensions?: string;
};

interface ModulePaletteProps {
  onAddInput: () => void;
  onAddOutput: () => void;
}

// Layer categories for the module palette
const layerCategories = [
  {
    label: 'Linear',
    color: 'text-blue-400',
    items: [
      { nodeType: 'layerNode', label: 'Linear', dimensions: 'in: 128, out: 128', icon: Layers, accent: 'border-blue-500/60 bg-blue-500/10 text-blue-200' },
      { nodeType: 'layerNode', label: 'Embedding', dimensions: 'num: 1000, dim: 128', icon: Hash, accent: 'border-blue-500/60 bg-blue-500/10 text-blue-200' },
    ],
  },
  {
    label: 'Conv',
    color: 'text-cyan-400',
    items: [
      { nodeType: 'layerNode', label: 'Conv2d', dimensions: 'in: 1, out: 32, k: 3', icon: Grid3X3, accent: 'border-cyan-500/60 bg-cyan-500/10 text-cyan-200' },
      { nodeType: 'layerNode', label: 'Conv1d', dimensions: 'in: 1, out: 32, k: 3', icon: Minus, accent: 'border-cyan-500/60 bg-cyan-500/10 text-cyan-200' },
    ],
  },
  {
    label: 'Activation',
    color: 'text-yellow-400',
    items: [
      { nodeType: 'activationNode', label: 'ReLU', icon: Zap, accent: 'border-amber-500/60 bg-amber-500/10 text-amber-200' },
      { nodeType: 'activationNode', label: 'LeakyReLU', icon: Zap, accent: 'border-amber-500/60 bg-amber-500/10 text-amber-200' },
      { nodeType: 'activationNode', label: 'Sigmoid', icon: Activity, accent: 'border-amber-500/60 bg-amber-500/10 text-amber-200' },
      { nodeType: 'activationNode', label: 'Tanh', icon: Activity, accent: 'border-amber-500/60 bg-amber-500/10 text-amber-200' },
      { nodeType: 'activationNode', label: 'Softmax', icon: Circle, accent: 'border-amber-500/60 bg-amber-500/10 text-amber-200' },
    ],
  },
  {
    label: 'Pooling',
    color: 'text-purple-400',
    items: [
      { nodeType: 'layerNode', label: 'MaxPool2d', dimensions: 'k: 2', icon: ArrowDownUp, accent: 'border-purple-500/60 bg-purple-500/10 text-purple-200' },
      { nodeType: 'layerNode', label: 'AvgPool2d', dimensions: 'k: 2', icon: ArrowDownUp, accent: 'border-purple-500/60 bg-purple-500/10 text-purple-200' },
    ],
  },
  {
    label: 'Norm',
    color: 'text-pink-400',
    items: [
      { nodeType: 'layerNode', label: 'BatchNorm1d', dimensions: 'features: 128', icon: Box, accent: 'border-pink-500/60 bg-pink-500/10 text-pink-200' },
      { nodeType: 'layerNode', label: 'BatchNorm2d', dimensions: 'features: 32', icon: Box, accent: 'border-pink-500/60 bg-pink-500/10 text-pink-200' },
      { nodeType: 'layerNode', label: 'LayerNorm', dimensions: 'shape: 128', icon: Box, accent: 'border-pink-500/60 bg-pink-500/10 text-pink-200' },
    ],
  },
  {
    label: 'Regularization',
    color: 'text-orange-400',
    items: [
      { nodeType: 'layerNode', label: 'Dropout', dimensions: 'p: 0.5', icon: Shuffle, accent: 'border-orange-500/60 bg-orange-500/10 text-orange-200' },
      { nodeType: 'layerNode', label: 'Flatten', dimensions: '', icon: Shrink, accent: 'border-orange-500/60 bg-orange-500/10 text-orange-200' },
    ],
  },
  {
    label: 'Recurrent',
    color: 'text-rose-400',
    items: [
      { nodeType: 'layerNode', label: 'LSTM', dimensions: 'in: 128, hidden: 256', icon: RotateCcw, accent: 'border-rose-500/60 bg-rose-500/10 text-rose-200' },
      { nodeType: 'layerNode', label: 'GRU', dimensions: 'in: 128, hidden: 256', icon: RotateCcw, accent: 'border-rose-500/60 bg-rose-500/10 text-rose-200' },
    ],
  },
];

function ModulePalette({ onAddInput, onAddOutput }: ModulePaletteProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (label: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, data: PaletteDragData) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(data));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="absolute left-4 top-4 z-10 w-52 max-h-[calc(100%-2rem)] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Layers
      </div>
      
      {layerCategories.map((category) => {
        const isExpanded = expandedCategories.has(category.label);
        return (
          <div key={category.label} className="mt-2">
            <button
              onClick={() => toggleCategory(category.label)}
              className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg border border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 transition ${category.color}`}
            >
              <span className="text-xs font-medium">{category.label}</span>
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
            {isExpanded && (
              <div className="mt-1 ml-2 flex flex-col gap-1">
                {category.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={`
                        flex cursor-grab items-center gap-2 rounded-lg border px-2 py-1 text-xs transition
                        active:cursor-grabbing hover:border-slate-500 ${item.accent}
                      `}
                      draggable
                      onDragStart={(event) => handleDragStart(event, item)}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      
      <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
        I/O Nodes
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        <button
          onClick={onAddInput}
          className="flex items-center gap-2 rounded-lg border border-green-500/60 bg-green-500/10 px-2 py-1.5 text-sm text-green-200 hover:border-green-400 transition"
        >
          + Add Input
        </button>
        <button
          onClick={onAddOutput}
          className="flex items-center gap-2 rounded-lg border border-red-500/60 bg-red-500/10 px-2 py-1.5 text-sm text-red-200 hover:border-red-400 transition"
        >
          + Add Output
        </button>
      </div>
    </aside>
  );
}

let nodeId = 0;
const getId = () => `module_node_${nodeId++}`;

interface ModuleCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onSave: (nodes: SubGraphNode[], edges: SubGraphEdge[]) => void;
  onSaveAsModule: (nodes: SubGraphNode[], edges: SubGraphEdge[]) => void;
  onClose: () => void;
  moduleName: string;
  onNameChange: (name: string) => void;
}

function ModuleCanvas({
  initialNodes,
  initialEdges,
  onSave,
  onSaveAsModule,
  onClose,
  moduleName,
  onNameChange,
}: ModuleCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => {
        const filtered = eds.filter(
          (edge) =>
            !(edge.target === connection.target && edge.targetHandle === connection.targetHandle)
        );
        return addEdge({ ...connection, type: 'deletable', animated: true }, filtered);
      });
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const payload = event.dataTransfer.getData('application/reactflow');
      if (!payload) return;

      try {
        const data = JSON.parse(payload) as PaletteDragData;
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const nodeData: LayerNodeData =
          data.nodeType === 'layerNode'
            ? { label: data.label, dimensions: data.dimensions ?? '' }
            : { label: data.label, dimensions: '' };

        const newNode: Node = {
          id: getId(),
          type: data.nodeType,
          position,
          data: nodeData,
        };

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/46cb2336-c027-4752-a0ab-d812af647802',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ModuleEditorModal.tsx:onDrop',message:'Node created in module editor',data:{nodeId:newNode.id,nodeType:data.nodeType,nodeData:nodeData,hasDimensions:'dimensions' in nodeData},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3-H4'})}).catch(()=>{});
        // #endregion

        setNodes((nds) => [...nds, newNode]);
      } catch {
        // ignore parse errors
      }
    },
    [screenToFlowPosition, setNodes]
  );

  const addInputNode = useCallback(() => {
    const inputNodes = nodes.filter((n) => n.type === 'moduleInput');
    const newNode: Node = {
      id: `input_${inputNodes.length}`,
      type: 'moduleInput',
      position: { x: 100, y: 100 + inputNodes.length * 100 },
      data: { label: `Input ${inputNodes.length + 1}`, portIndex: inputNodes.length },
      deletable: inputNodes.length > 0, // First input is not deletable
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes, setNodes]);

  const addOutputNode = useCallback(() => {
    const outputNodes = nodes.filter((n) => n.type === 'moduleOutput');
    const newNode: Node = {
      id: `output_${outputNodes.length}`,
      type: 'moduleOutput',
      position: { x: 500, y: 100 + outputNodes.length * 100 },
      data: { label: `Output ${outputNodes.length + 1}`, portIndex: outputNodes.length },
      deletable: outputNodes.length > 0, // First output is not deletable
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes, setNodes]);

  const handleSave = useCallback(() => {
    const subNodes: SubGraphNode[] = nodes.map((node) => ({
      id: node.id,
      type: node.type ?? 'layerNode',
      position: node.position,
      data: (node.data as Record<string, unknown>) ?? null,
    }));
    const subEdges: SubGraphEdge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }));
    onSave(subNodes, subEdges);
  }, [nodes, edges, onSave]);

  const handleSaveAsModule = useCallback(() => {
    const subNodes: SubGraphNode[] = nodes.map((node) => ({
      id: node.id,
      type: node.type ?? 'layerNode',
      position: node.position,
      data: (node.data as Record<string, unknown>) ?? null,
    }));
    const subEdges: SubGraphEdge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }));
    onSaveAsModule(subNodes, subEdges);
  }, [nodes, edges, onSaveAsModule]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-[95vw] h-[90vh] bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-slate-700 flex items-center justify-between px-4 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-violet-400">
              <Layers className="w-5 h-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">Module Editor</span>
            </div>
            <input
              type="text"
              value={moduleName}
              onChange={(e) => onNameChange(e.target.value)}
              className="ml-4 px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60"
              placeholder="Module name..."
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-600 text-slate-200 text-sm font-semibold hover:bg-slate-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={handleSaveAsModule}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 transition-colors"
            >
              <Library className="w-4 h-4" />
              Save as Module
            </button>
            <button
              onClick={onClose}
              className="ml-2 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <ModulePalette onAddInput={addInputNode} onAddOutput={addOutputNode} />
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={moduleNodeTypes}
            edgeTypes={moduleEdgeTypes}
            defaultEdgeOptions={{
              type: 'deletable',
              style: { stroke: '#64748b', strokeWidth: 2 },
            }}
            fitView
            className="h-full w-full bg-slate-800"
            connectionLineStyle={{ stroke: '#64748b', strokeWidth: 2 }}
            snapToGrid
            snapGrid={[20, 20]}
          >
            <Background color="#475569" gap={20} />
            <Controls className="bg-slate-700 border-slate-600" />
            <MiniMap
              className="bg-slate-700"
              nodeColor={(node) => {
                switch (node.type) {
                  case 'moduleInput':
                    return '#22c55e';
                  case 'moduleOutput':
                    return '#ef4444';
                  case 'layerNode':
                    return '#3b82f6';
                  case 'activationNode':
                    return '#f59e0b';
                  default:
                    return '#64748b';
                }
              }}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

interface ModuleEditorModalProps {
  onUpdateNode: (nodeId: string, subNodes: SubGraphNode[], subEdges: SubGraphEdge[], label: string) => void;
  onSaveToLibrary: (name: string, nodes: SubGraphNode[], edges: SubGraphEdge[]) => void;
}

export default function ModuleEditorModal({ onUpdateNode, onSaveToLibrary }: ModuleEditorModalProps) {
  const { isOpen, editingNodeId, editingNodeData, subNodes, subEdges, closeEditor } = useModuleStore();
  const [moduleName, setModuleName] = useState('');

  useEffect(() => {
    if (editingNodeData) {
      setModuleName(editingNodeData.label || 'New Module');
    }
  }, [editingNodeData]);

  const handleSave = useCallback(
    (nodes: SubGraphNode[], edges: SubGraphEdge[]) => {
      if (editingNodeId) {
        const io = countModuleIO(nodes);
        onUpdateNode(editingNodeId, nodes, edges, moduleName);
      }
      closeEditor();
    },
    [editingNodeId, moduleName, onUpdateNode, closeEditor]
  );

  const handleSaveAsModule = useCallback(
    (nodes: SubGraphNode[], edges: SubGraphEdge[]) => {
      onSaveToLibrary(moduleName, nodes, edges);
      if (editingNodeId) {
        onUpdateNode(editingNodeId, nodes, edges, moduleName);
      }
      closeEditor();
    },
    [moduleName, onSaveToLibrary, editingNodeId, onUpdateNode, closeEditor]
  );

  if (!isOpen || !editingNodeData) {
    return null;
  }

  // Convert SubGraphNode[] to Node[] for ReactFlow
  const initialNodes: Node[] = subNodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data ?? {},
    deletable: node.type !== 'moduleInput' && node.type !== 'moduleOutput' 
      ? true 
      : (node.data as Record<string, unknown>)?.portIndex !== 0,
  }));

  const initialEdges: Edge[] = subEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'deletable',
    animated: true,
  }));

  return (
    <ReactFlowProvider>
      <ModuleCanvas
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        onSave={handleSave}
        onSaveAsModule={handleSaveAsModule}
        onClose={closeEditor}
        moduleName={moduleName}
        onNameChange={setModuleName}
      />
    </ReactFlowProvider>
  );
}
