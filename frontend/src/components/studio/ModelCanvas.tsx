import { useCallback, useRef, type DragEvent, memo, useEffect, forwardRef, useImperativeHandle } from 'react';
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
  useReactFlow,
  Handle,
  Position,
  type NodeProps,
  useUpdateNodeInternals,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import ModuleEditorModal from '../ModuleEditorModal';
import { useModuleStore, countModuleIO } from '../../store/moduleStore';
import { useShapeStore } from '../../store/shapeStore';
import { propagateShapes, autoFillLinearParams } from '../../utils/shapeInference';
import type { ShapeNode, ShapeEdge } from '../../utils/shapeInference';
import {
  Brain,
  Layers,
  Zap,
  Grid3X3,
  ArrowDownUp,
  Shuffle,
  RotateCcw,
  Hash,
  Activity,
  Box,
  Minus,
  Circle,
  LogIn,
  LogOut,
  Plus,
  Package,
  Trash2,
} from 'lucide-react';

// Neural Network Layer Node Types
type NNLayerType =
  | 'Input'
  | 'Output'
  | 'Linear'
  | 'Conv2d'
  | 'Conv1d'
  | 'ConvTranspose2d'
  | 'ReLU'
  | 'LeakyReLU'
  | 'Sigmoid'
  | 'Tanh'
  | 'Softmax'
  | 'MaxPool2d'
  | 'AvgPool2d'
  | 'Flatten'
  | 'Dropout'
  | 'BatchNorm1d'
  | 'BatchNorm2d'
  | 'LSTM'
  | 'GRU'
  | 'Embedding'
  | 'LayerNorm'
  | 'CustomModule';

// Sub-graph types for custom modules
interface SubGraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown> | null;
}

interface SubGraphEdge {
  id: string;
  source: string;
  target: string;
}

// Layer parameters that affect shape calculation
interface LayerParams {
  // Linear layer
  inFeatures?: number;
  outFeatures?: number;
  // Conv layers
  inChannels?: number;
  outChannels?: number;
  kernelSize?: number | [number, number];
  stride?: number | [number, number];
  padding?: number | [number, number];
  // Pooling layers
  poolSize?: number | [number, number];
  // Embedding
  numEmbeddings?: number;
  embeddingDim?: number;
  // Recurrent
  hiddenSize?: number;
  numLayers?: number;
  // BatchNorm
  numFeatures?: number;
}

type NNLayerData = {
  label: string;
  type: NNLayerType;
  isIO?: boolean;
  portCount?: number;
  // For custom modules
  moduleId?: string;
  subNodes?: SubGraphNode[];
  subEdges?: SubGraphEdge[];
  inputCount?: number;
  outputCount?: number;
  // Shape tracking
  inputShape?: number[];
  outputShape?: number[];
  shapeError?: string | null;
  params?: LayerParams;
  [key: string]: unknown;
};

// Category-based layer definitions
const layerCategories = {
  io: {
    label: 'I/O',
    color: 'text-emerald-400',
    items: [
      { type: 'Input' as NNLayerType, label: 'Input', icon: LogIn, color: 'bg-emerald-500/20 border-emerald-500 hover:bg-emerald-500/30' },
      { type: 'Output' as NNLayerType, label: 'Output', icon: LogOut, color: 'bg-emerald-500/20 border-emerald-500 hover:bg-emerald-500/30' },
    ],
  },
  linear: {
    label: 'Linear',
    color: 'text-blue-400',
    items: [
      { type: 'Linear' as NNLayerType, label: 'Linear', icon: Layers, color: 'bg-blue-500/20 border-blue-500 hover:bg-blue-500/30' },
      { type: 'Flatten' as NNLayerType, label: 'Flatten', icon: Layers, color: 'bg-blue-500/20 border-blue-500 hover:bg-blue-500/30' },
      { type: 'Embedding' as NNLayerType, label: 'Embedding', icon: Hash, color: 'bg-blue-500/20 border-blue-500 hover:bg-blue-500/30' },
    ],
  },
  conv: {
    label: 'Conv',
    color: 'text-cyan-400',
    items: [
      { type: 'Conv2d' as NNLayerType, label: 'Conv2d', icon: Grid3X3, color: 'bg-cyan-500/20 border-cyan-500 hover:bg-cyan-500/30' },
      { type: 'Conv1d' as NNLayerType, label: 'Conv1d', icon: Minus, color: 'bg-cyan-500/20 border-cyan-500 hover:bg-cyan-500/30' },
      { type: 'ConvTranspose2d' as NNLayerType, label: 'ConvT2d', icon: Grid3X3, color: 'bg-cyan-500/20 border-cyan-500 hover:bg-cyan-500/30' },
    ],
  },
  activation: {
    label: 'Activation',
    color: 'text-yellow-400',
    items: [
      { type: 'ReLU' as NNLayerType, label: 'ReLU', icon: Zap, color: 'bg-yellow-500/20 border-yellow-500 hover:bg-yellow-500/30' },
      { type: 'LeakyReLU' as NNLayerType, label: 'LeakyReLU', icon: Zap, color: 'bg-yellow-500/20 border-yellow-500 hover:bg-yellow-500/30' },
      { type: 'Sigmoid' as NNLayerType, label: 'Sigmoid', icon: Activity, color: 'bg-yellow-500/20 border-yellow-500 hover:bg-yellow-500/30' },
      { type: 'Tanh' as NNLayerType, label: 'Tanh', icon: Activity, color: 'bg-yellow-500/20 border-yellow-500 hover:bg-yellow-500/30' },
      { type: 'Softmax' as NNLayerType, label: 'Softmax', icon: Circle, color: 'bg-yellow-500/20 border-yellow-500 hover:bg-yellow-500/30' },
    ],
  },
  pool: {
    label: 'Pooling',
    color: 'text-purple-400',
    items: [
      { type: 'MaxPool2d' as NNLayerType, label: 'MaxPool2d', icon: ArrowDownUp, color: 'bg-purple-500/20 border-purple-500 hover:bg-purple-500/30' },
      { type: 'AvgPool2d' as NNLayerType, label: 'AvgPool2d', icon: ArrowDownUp, color: 'bg-purple-500/20 border-purple-500 hover:bg-purple-500/30' },
    ],
  },
  norm: {
    label: 'Norm',
    color: 'text-pink-400',
    items: [
      { type: 'BatchNorm1d' as NNLayerType, label: 'BatchNorm1d', icon: Box, color: 'bg-pink-500/20 border-pink-500 hover:bg-pink-500/30' },
      { type: 'BatchNorm2d' as NNLayerType, label: 'BatchNorm2d', icon: Box, color: 'bg-pink-500/20 border-pink-500 hover:bg-pink-500/30' },
      { type: 'LayerNorm' as NNLayerType, label: 'LayerNorm', icon: Box, color: 'bg-pink-500/20 border-pink-500 hover:bg-pink-500/30' },
    ],
  },
  regularization: {
    label: 'Regularization',
    color: 'text-orange-400',
    items: [
      { type: 'Dropout' as NNLayerType, label: 'Dropout', icon: Shuffle, color: 'bg-orange-500/20 border-orange-500 hover:bg-orange-500/30' },
    ],
  },
  recurrent: {
    label: 'Recurrent',
    color: 'text-rose-400',
    items: [
      { type: 'LSTM' as NNLayerType, label: 'LSTM', icon: RotateCcw, color: 'bg-rose-500/20 border-rose-500 hover:bg-rose-500/30' },
      { type: 'GRU' as NNLayerType, label: 'GRU', icon: RotateCcw, color: 'bg-rose-500/20 border-rose-500 hover:bg-rose-500/30' },
    ],
  },
};

// Flatten all layers for lookup
const allLayers = Object.values(layerCategories).flatMap((cat) => cat.items);

// Input Node Component (undeletable, supports multiple ports)
const InputNode = memo(({ id, data, selected }: NodeProps<Node<NNLayerData>>) => {
  const portCount = data.portCount || 1;
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
  }, [portCount, id, updateNodeInternals]);

  const outputShapeStr = formatShapeDisplay(data.outputShape);

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[140px]
        bg-slate-800 shadow-lg transition-all
        border-emerald-500 bg-emerald-500/10
        ${selected ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-slate-900' : ''}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LogIn className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-white">{data.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400">{portCount} port{portCount > 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="text-xs text-slate-400 mt-1">Model Input</div>
      {/* Shape display */}
      {data.outputShape && (
        <div className="text-xs text-emerald-400/70 mt-1 font-mono">
          Shape: {outputShapeStr}
        </div>
      )}
      {Array.from({ length: portCount }).map((_, i) => (
        <Handle
          key={`output-${i}`}
          type="source"
          position={Position.Bottom}
          id={`output-${i}`}
          className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-emerald-300"
          style={{ left: `${((i + 1) / (portCount + 1)) * 100}%` }}
        />
      ))}
    </div>
  );
});
InputNode.displayName = 'InputNode';

// Output Node Component (undeletable, supports multiple ports)
const OutputNode = memo(({ id, data, selected }: NodeProps<Node<NNLayerData>>) => {
  const portCount = data.portCount || 1;
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
  }, [portCount, id, updateNodeInternals]);

  const inputShapeStr = formatShapeDisplay(data.inputShape);
  const hasError = Boolean(data.shapeError);

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[140px]
        bg-slate-800 shadow-lg transition-all
        ${hasError ? 'border-red-500 bg-red-500/10' : 'border-emerald-500 bg-emerald-500/10'}
        ${selected ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-slate-900' : ''}
      `}
      title={data.shapeError || undefined}
    >
      {Array.from({ length: portCount }).map((_, i) => (
        <Handle
          key={`input-${i}`}
          type="target"
          position={Position.Top}
          id={`input-${i}`}
          className={`!w-3 !h-3 !border-2 ${hasError ? '!bg-red-500 !border-red-300' : '!bg-emerald-500 !border-emerald-300'}`}
          style={{ left: `${((i + 1) / (portCount + 1)) * 100}%` }}
        />
      ))}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LogOut className={`w-4 h-4 ${hasError ? 'text-red-400' : 'text-emerald-400'}`} />
          <span className="text-sm font-medium text-white">{data.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400">{portCount} port{portCount > 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="text-xs text-slate-400 mt-1">Model Output</div>
      {/* Shape display */}
      {data.inputShape && (
        <div className={`text-xs mt-1 font-mono ${hasError ? 'text-red-400/70' : 'text-emerald-400/70'}`}>
          Shape: {inputShapeStr}
        </div>
      )}
      {/* Error indicator */}
      {hasError && (
        <div className="text-xs text-red-400 mt-1 truncate max-w-[150px]" title={data.shapeError || ''}>
          ⚠ {data.shapeError}
        </div>
      )}
    </div>
  );
});
OutputNode.displayName = 'OutputNode';

// Helper to format shape for display
const formatShapeDisplay = (shape: number[] | undefined): string => {
  if (!shape || shape.length === 0) return '?';
  return `[${shape.join(',')}]`;
};

// Standard NN Layer Node component
const NNLayerNode = memo(({ id, data, selected }: NodeProps<Node<NNLayerData>>) => {
  const layerItem = allLayers.find((item) => item.type === data.type);
  const Icon = layerItem?.icon || Brain;
  const defaultBorderColor = layerItem?.color.split(' ')[1] || 'border-slate-500';
  
  // Determine if there's a shape error
  const hasError = Boolean(data.shapeError);
  const borderColor = hasError ? 'border-red-500' : defaultBorderColor;
  
  // Format shapes for display
  const inputShapeStr = formatShapeDisplay(data.inputShape);
  const outputShapeStr = formatShapeDisplay(data.outputShape);
  const showShapes = data.inputShape || data.outputShape;

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/46cb2336-c027-4752-a0ab-d812af647802',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ModelCanvas.tsx:NNLayerNode',message:'NNLayerNode rendered',data:{nodeId:id,label:data.label,type:data.type,params:data.params,hasParamsField:data.params!==undefined,paramsKeys:data.params?Object.keys(data.params):[]},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H2'})}).catch(()=>{});
  // #endregion

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[120px]
        bg-slate-800 shadow-lg transition-all
        ${borderColor} bg-opacity-10
        ${selected ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-slate-900' : ''}
        ${hasError ? 'bg-red-500/10' : ''}
      `}
      title={data.shapeError || undefined}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={`!w-3 !h-3 !border-2 ${hasError ? '!bg-red-400 !border-red-600' : '!bg-slate-400 !border-slate-600'}`}
      />
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${hasError ? 'text-red-400' : 'text-slate-300'}`} />
        <span className="text-sm font-medium text-white">{data.label}</span>
      </div>
      {/* Shape display */}
      {showShapes && (
        <div className={`text-xs mt-1 font-mono ${hasError ? 'text-red-400' : 'text-slate-500'}`}>
          {inputShapeStr} → {outputShapeStr}
        </div>
      )}
      {/* Error indicator */}
      {hasError && (
        <div className="text-xs text-red-400 mt-1 truncate max-w-[150px]" title={data.shapeError || ''}>
          ⚠ {data.shapeError}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className={`!w-3 !h-3 !border-2 ${hasError ? '!bg-red-400 !border-red-600' : '!bg-slate-400 !border-slate-600'}`}
      />
    </div>
  );
});
NNLayerNode.displayName = 'NNLayerNode';

// Custom Module Node component (for reusable sub-graphs)
const CustomModuleNode = memo(({ data, selected }: NodeProps<Node<NNLayerData>>) => {
  const inputCount = data.inputCount || 1;
  const outputCount = data.outputCount || 1;

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[160px]
        bg-slate-800 shadow-lg transition-all cursor-pointer
        border-violet-500 bg-violet-500/10
        ${selected ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-slate-900' : ''}
      `}
      title="Double-click to edit module"
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-violet-600"
      />
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-medium text-white">{data.label}</span>
      </div>
      <div className="flex items-center justify-between mt-1 text-xs text-violet-300/70">
        <span>{inputCount} in</span>
        <span>{outputCount} out</span>
      </div>
      <div className="text-xs text-violet-400/50 mt-1">Double-click to edit</div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-violet-400 !border-2 !border-violet-600"
      />
    </div>
  );
});
CustomModuleNode.displayName = 'CustomModuleNode';

// Register node types
const nodeTypes: NodeTypes = {
  nnLayer: NNLayerNode,
  inputNode: InputNode,
  outputNode: OutputNode,
  customModule: CustomModuleNode,
};

// Initial nodes with Input and Output already present
const initialNodes: Node<NNLayerData>[] = [
  {
    id: 'input-node',
    type: 'inputNode',
    position: { x: 250, y: 50 },
    data: { label: 'Input', type: 'Input', isIO: true, portCount: 1 },
    deletable: false,
  },
  {
    id: 'output-node',
    type: 'outputNode',
    position: { x: 250, y: 400 },
    data: { label: 'Output', type: 'Output', isIO: true, portCount: 1 },
    deletable: false,
  },
];

const initialEdges: Edge[] = [];

let nodeId = 0;
const getId = () => `nn_layer_${nodeId++}`;

interface ModelCanvasProps {
  inputPortCount: number;
  outputPortCount: number;
  onInputPortCountChange: (count: number) => void;
  onOutputPortCountChange: (count: number) => void;
}

// Expose nodes/edges for training
export interface ModelCanvasHandle {
  getGraph: () => {
    nodes: Node<NNLayerData>[];
    edges: Edge[];
  };
}

const ModelCanvas = forwardRef<ModelCanvasHandle, ModelCanvasProps>(function ModelCanvas(
  {
    inputPortCount,
    outputPortCount,
    onInputPortCountChange,
    onOutputPortCountChange,
  },
  ref
) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // Query saved modules from Convex
  const savedModules = useQuery(api.modules.listModules);
  const deleteModuleMutation = useMutation(api.modules.deleteModule);
  const saveModuleMutation = useMutation(api.modules.saveModule);
  
  // Module editor store
  const openModuleEditor = useModuleStore((state) => state.openEditor);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialNodes.map((node) => {
      if (node.id === 'input-node') {
        return { ...node, data: { ...node.data, portCount: inputPortCount } };
      }
      if (node.id === 'output-node') {
        return { ...node, data: { ...node.data, portCount: outputPortCount } };
      }
      return node;
    })
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  // Expose nodes/edges for training via ref
  useImperativeHandle(ref, () => ({
    getGraph: () => ({ nodes, edges }),
  }), [nodes, edges]);

  // Shape store for propagation
  const { 
    datasetInputShape, 
    datasetNumClasses,
    updateAllShapes, 
    updateAllEdgeValidations,
  } = useShapeStore();

  // Shape propagation effect - runs when nodes, edges, or input shape changes
  useEffect(() => {
    if (!datasetInputShape) return;

    // Convert nodes to shape inference format
    const shapeNodes: ShapeNode[] = nodes.map((node) => ({
      id: node.id,
      type: node.type || 'nnLayer',
      data: {
        label: (node.data as NNLayerData).label,
        type: (node.data as NNLayerData).type,
        params: (node.data as NNLayerData).params,
        isIO: (node.data as NNLayerData).isIO,
      },
    }));

    // Convert edges to shape inference format
    const shapeEdges: ShapeEdge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined,
    }));

    // Propagate shapes through the network
    const { nodeShapes: newShapes, edgeValidations: newValidations } = propagateShapes(
      shapeNodes,
      shapeEdges,
      datasetInputShape
    );

    // Update nodes with shape info and auto-fill Linear layer params
    setNodes((nds) =>
      nds.map((node) => {
        const shapeInfo = newShapes.get(node.id);
        if (!shapeInfo) return node;

        const nodeData = node.data as NNLayerData;
        let updatedParams = nodeData.params || {};

        // Auto-fill Linear layer input features
        if (nodeData.type === 'Linear' && shapeInfo.inputShape) {
          updatedParams = autoFillLinearParams(
            shapeInfo.inputShape,
            updatedParams,
            datasetNumClasses
          );
        }

        return {
          ...node,
          data: {
            ...nodeData,
            inputShape: shapeInfo.inputShape ?? undefined,
            outputShape: shapeInfo.outputShape ?? undefined,
            shapeError: shapeInfo.error,
            params: updatedParams,
          },
        };
      })
    );

    // Update shape store with validation results
    updateAllShapes(newShapes);
    updateAllEdgeValidations(newValidations);
  }, [datasetInputShape, datasetNumClasses, edges, updateAllShapes, updateAllEdgeValidations]);
  // Note: We intentionally exclude 'nodes' from deps to avoid infinite loop
  // Shape propagation is triggered by edge changes and input shape changes

  // Update I/O port counts
  const updatePortCount = useCallback(
    (nodeId: string, delta: number, isInput: boolean) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            const currentCount = (node.data as NNLayerData).portCount || 1;
            const newCount = Math.max(1, Math.min(5, currentCount + delta));
            if (isInput) {
              onInputPortCountChange(newCount);
            } else {
              onOutputPortCountChange(newCount);
            }
            return { ...node, data: { ...node.data, portCount: newCount } };
          }
          return node;
        })
      );
    },
    [setNodes, onInputPortCountChange, onOutputPortCountChange]
  );

  // Handle new connections (modelState: managed by React Flow)
  // Enforces single-connection-per-input: removes existing edge to same target handle
  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => {
        // Remove any existing edge that connects to the same target + targetHandle
        const filtered = eds.filter(
          (edge) =>
            !(edge.target === connection.target && edge.targetHandle === connection.targetHandle)
        );
        return addEdge({ ...connection, animated: true }, filtered);
      });
    },
    [setEdges]
  );

  // Handle drag over
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop from layer palette
  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      // Check for custom module drop first
      const moduleData = event.dataTransfer.getData('application/customModule');
      if (moduleData) {
        try {
          const parsed = JSON.parse(moduleData);
          const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });

          const newNode: Node<NNLayerData> = {
            id: getId(),
            type: 'customModule',
            position,
            data: {
              label: parsed.label || 'New Module',
              type: 'CustomModule',
              moduleId: parsed.moduleId,
              subNodes: parsed.subNodes || [],
              subEdges: parsed.subEdges || [],
              inputCount: parsed.inputCount || 1,
              outputCount: parsed.outputCount || 1,
            },
          };

          setNodes((nds) => [...nds, newNode]);
          return;
        } catch {
          // Fall through to layer drop
        }
      }

      const type = event.dataTransfer.getData('application/nnlayer') as NNLayerType;

      if (!type || type === 'Input' || type === 'Output') {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node<NNLayerData> = {
        id: getId(),
        type: 'nnLayer',
        position,
        data: { label: type, type },
      };

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/46cb2336-c027-4752-a0ab-d812af647802',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ModelCanvas.tsx:onDrop',message:'New node created on drop',data:{nodeId:newNode.id,nodeType:type,nodeData:newNode.data,hasParams:'params' in newNode.data},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, setNodes]
  );

  // Handle drag start for layer palette items
  const onDragStart = (event: DragEvent<HTMLDivElement>, layerType: NNLayerType) => {
    if (layerType === 'Input' || layerType === 'Output') {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('application/nnlayer', layerType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle double-click on nodes to edit custom modules
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node<NNLayerData>) => {
      if (node.type === 'customModule') {
        // Open the module editor with this node's data
        openModuleEditor(node.id, {
          label: node.data.label,
          moduleId: node.data.moduleId,
          subNodes: (node.data.subNodes as SubGraphNode[]) || [],
          subEdges: (node.data.subEdges as SubGraphEdge[]) || [],
          inputCount: node.data.inputCount,
          outputCount: node.data.outputCount,
        });
      }
    },
    [openModuleEditor]
  );

  // Handler to update a custom node's sub-graph after editing
  const handleUpdateCustomNode = useCallback(
    (nodeId: string, subNodes: SubGraphNode[], subEdges: SubGraphEdge[], label: string) => {
      const io = countModuleIO(subNodes);
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  label,
                  subNodes,
                  subEdges,
                  inputCount: io.inputCount,
                  outputCount: io.outputCount,
                },
              }
            : node
        )
      );
    },
    [setNodes]
  );

  // Handler to save a module to the library
  const handleSaveToLibrary = useCallback(
    async (name: string, subNodes: SubGraphNode[], subEdges: SubGraphEdge[]) => {
      const io = countModuleIO(subNodes);
      try {
        await saveModuleMutation({
          name,
          nodes: subNodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data,
          })),
          edges: subEdges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
          })),
          inputCount: io.inputCount,
          outputCount: io.outputCount,
        });
      } catch (error) {
        console.error('Failed to save module:', error);
      }
    },
    [saveModuleMutation]
  );

  // Handle drag start for custom modules
  const onModuleDragStart = (
    event: DragEvent<HTMLDivElement>,
    moduleData: {
      label: string;
      moduleId?: string;
      subNodes: SubGraphNode[];
      subEdges: SubGraphEdge[];
      inputCount: number;
      outputCount: number;
    }
  ) => {
    event.dataTransfer.setData('application/customModule', JSON.stringify(moduleData));
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle delete module
  const handleDeleteModule = async (moduleId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    if (confirm('Delete this module from the library?')) {
      await deleteModuleMutation({ id: moduleId as Id<"modules"> });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Layer Palette */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-500" />
          <span className="text-sm font-semibold text-slate-300">Model Editor</span>
          <div className="h-6 w-px bg-slate-600 mx-2" />
          {/* I/O Port Controls */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Inputs:</span>
            <button
              onClick={() => updatePortCount('input-node', -1, true)}
              className="w-5 h-5 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 text-white"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-white w-4 text-center">{inputPortCount}</span>
            <button
              onClick={() => updatePortCount('input-node', 1, true)}
              className="w-5 h-5 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 text-white"
            >
              <Plus className="w-3 h-3" />
            </button>
            <div className="h-4 w-px bg-slate-600 mx-1" />
            <span className="text-slate-400">Outputs:</span>
            <button
              onClick={() => updatePortCount('output-node', -1, false)}
              className="w-5 h-5 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 text-white"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-white w-4 text-center">{outputPortCount}</span>
            <button
              onClick={() => updatePortCount('output-node', 1, false)}
              className="w-5 h-5 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 text-white"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
        {/* Layer Categories */}
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(layerCategories).map(([key, category]) => {
            if (key === 'io') return null; // Skip I/O since they're fixed
            return (
              <div key={key} className="flex items-center gap-1">
                <span className={`text-xs font-medium ${category.color}`}>{category.label}:</span>
                {category.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.type}
                      className={`
                        flex items-center gap-1 px-2 py-1 rounded-md border
                        cursor-grab active:cursor-grabbing
                        transition-all duration-150 text-xs
                        ${item.color}
                      `}
                      draggable
                      onDragStart={(e) => onDragStart(e, item.type)}
                    >
                      <Icon className="w-3 h-3 text-slate-300" />
                      <span className="font-medium text-white">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
          
          {/* Custom Modules Section */}
          <div className="h-6 w-px bg-slate-600 mx-1" />
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-violet-400">Modules:</span>
            {/* New Module Button */}
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-violet-500 bg-violet-500/10 hover:bg-violet-500/20 cursor-grab active:cursor-grabbing transition-all duration-150 text-xs"
              draggable
              onDragStart={(e) =>
                onModuleDragStart(e, {
                  label: 'New Module',
                  subNodes: [],
                  subEdges: [],
                  inputCount: 1,
                  outputCount: 1,
                })
              }
            >
              <Plus className="w-3 h-3 text-violet-300" />
              <span className="font-medium text-violet-200">New</span>
            </div>
            {/* Saved Modules */}
            {savedModules?.map((module) => (
              <div
                key={module.id}
                className="group flex items-center gap-1 px-2 py-1 rounded-md border border-violet-500 bg-violet-500/20 hover:bg-violet-500/30 cursor-grab active:cursor-grabbing transition-all duration-150 text-xs"
                draggable
                onDragStart={(e) =>
                  onModuleDragStart(e, {
                    label: module.name,
                    moduleId: module.id,
                    subNodes: module.nodes as SubGraphNode[],
                    subEdges: module.edges as SubGraphEdge[],
                    inputCount: module.inputCount,
                    outputCount: module.outputCount,
                  })
                }
              >
                <Package className="w-3 h-3 text-violet-300" />
                <span className="font-medium text-violet-200">{module.name}</span>
                <button
                  onClick={(e) => handleDeleteModule(module.id, e)}
                  className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded hover:bg-red-500/30 text-red-400 transition"
                  title="Delete module"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            {savedModules?.length === 0 && (
              <span className="text-xs text-slate-500 italic">No saved modules</span>
            )}
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-900"
          defaultEdgeOptions={{
            style: { stroke: '#64748b', strokeWidth: 2 },
            type: 'smoothstep',
          }}
          connectionLineStyle={{ stroke: '#64748b', strokeWidth: 2 }}
          snapToGrid
          snapGrid={[20, 20]}
        >
          <Background color="#334155" gap={20} />
          <Controls className="bg-slate-700 border-slate-600" />
          <MiniMap
            className="bg-slate-700"
            nodeColor={(node) => {
              const data = node.data as NNLayerData;
              if (data.type === 'Input' || data.type === 'Output') return '#10b981';
              if (data.type === 'CustomModule') return '#8b5cf6';
              return '#3b82f6';
            }}
          />
        </ReactFlow>
      </div>

      {/* Module Editor Modal */}
      <ModuleEditorModal
        onUpdateNode={handleUpdateCustomNode}
        onSaveToLibrary={handleSaveToLibrary}
      />
    </div>
  );
});

export default ModelCanvas;
