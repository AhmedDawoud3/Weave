import { useCallback, useState, type DragEvent, type Dispatch, type SetStateAction } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type Node,
  type Edge,
  type NodeTypes,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import Terminal from './Terminal.tsx';
import LayerPalette, { type PaletteDragData } from './LayerPalette';
import LayerNode, { type LayerNodeData } from './nodes/LayerNode';
import ActivationNode, { type ActivationNodeData } from './nodes/ActivationNode';
import CustomNode, { type CustomNodeData, type SubGraphNode, type SubGraphEdge } from './nodes/CustomNode';
import ModuleEditorModal from './ModuleEditorModal';
import { countModuleIO } from '../store/moduleStore';
import {
  usePipelineStore,
  type DatasetOption,
  type OptimizerOption,
} from '../store/pipelineStore';

interface ConvexNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown> | null;
}

interface ConvexEdge {
  id: string;
  source: string;
  target: string;
}

type FlowNodeData = LayerNodeData | ActivationNodeData | CustomNodeData;

interface FlowCanvasProps {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange<Node<FlowNodeData>>;
  onEdgesChange: OnEdgesChange;
  setNodes: Dispatch<SetStateAction<Node<FlowNodeData>[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
}

const nodeTypes: NodeTypes = {
  layerNode: LayerNode,
  activationNode: ActivationNode,
  customNode: CustomNode,
};

const initialNodes: Node<FlowNodeData>[] = [];
const initialEdges: Edge[] = [];

let nodeId = 0;
const getId = () => `node_${nodeId++}`;

const parsePaletteData = (event: DragEvent<HTMLDivElement>): PaletteDragData | null => {
  const payload = event.dataTransfer.getData('application/reactflow');
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload) as PaletteDragData;
  } catch {
    return null;
  }
};

function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  setNodes,
  setEdges,
}: FlowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();

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

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const payload = parsePaletteData(event);
      if (!payload) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let data: FlowNodeData;
      
      if (payload.nodeType === 'customNode') {
        // Handle custom node creation
        data = {
          label: payload.label,
          moduleId: payload.moduleId,
          subNodes: payload.subNodes ?? [],
          subEdges: payload.subEdges ?? [],
          inputCount: payload.inputCount ?? 1,
          outputCount: payload.outputCount ?? 1,
        } as CustomNodeData;
      } else if (payload.nodeType === 'layerNode') {
        data = { label: payload.label, dimensions: payload.dimensions ?? '' };
      } else {
        data = { label: payload.label, dimensions: '' };
      }

      const newNode: Node<FlowNodeData> = {
        id: getId(),
        type: payload.nodeType,
        position,
        data,
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, setNodes]
  );

  return (
    <div className="relative h-full w-full">
      <LayerPalette />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        className="h-full w-full bg-slate-800"
        defaultEdgeOptions={{
          style: { stroke: '#64748b', strokeWidth: 2 },
          type: 'smoothstep',
        }}
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
              case 'layerNode':
                return '#3b82f6';
              case 'activationNode':
                return '#f59e0b';
              case 'customNode':
                return '#8b5cf6';
              default:
                return '#64748b';
            }
          }}
        />
      </ReactFlow>
    </div>
  );
}

function Editor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const generateCode = useAction(api.actions.generateCode);
  const saveModule = useMutation(api.modules.saveModule);
  const {
    dataset,
    batchSize,
    optimizer,
    learningRate,
    epochs,
    setDataset,
    setBatchSize,
    setOptimizer,
    setLearningRate,
    setEpochs,
  } = usePipelineStore();
  const runnerBaseUrl = (import.meta.env.VITE_RUNNER_URL || 'http://localhost:8000').replace(
    /\/$/,
    ''
  );

  // Handler to update a custom node's sub-graph
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
                } as CustomNodeData,
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
        await saveModule({
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
        const message = error instanceof Error ? error.message : 'Unknown error';
        setTerminalOutput((prev) => `${prev}\n[error] Failed to save module: ${message}\n`);
      }
    },
    [saveModule]
  );

  const buildPayload = useCallback(() => {
    const serializedNodes: ConvexNode[] = nodes.map((node) => ({
      id: node.id,
      type: node.type ?? 'layerNode',
      position: node.position,
      data: node.data ?? null,
    }));
    const serializedEdges: ConvexEdge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }));

    return {
      config: {
        dataset,
        batchSize,
        optimizer,
        learningRate,
        epochs,
      },
      nodes: serializedNodes,
      edges: serializedEdges,
    };
  }, [batchSize, dataset, edges, epochs, learningRate, nodes, optimizer]);

  const handleRunTraining = useCallback(async () => {
    if (isRunning) {
      return;
    }

    setIsRunning(true);
    setTerminalOutput('Starting training...\n');

    try {
      const code = await generateCode(buildPayload());
      setGeneratedCode(code);

      const response = await fetch(`${runnerBaseUrl}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error(`Runner error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Runner did not return a stream.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setTerminalOutput((prev) => prev + chunk);
        }
      }

      const tail = decoder.decode();
      if (tail) {
        setTerminalOutput((prev) => prev + tail);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setTerminalOutput((prev) => `${prev}\n[error] ${message}\n`);
    } finally {
      setIsRunning(false);
    }
  }, [buildPayload, generateCode, isRunning, runnerBaseUrl]);

  const handleToggleCode = useCallback(async () => {
    if (showCode) {
      setShowCode(false);
      return;
    }

    if (isGenerating) {
      return;
    }

    setIsGenerating(true);
    try {
      const code = await generateCode(buildPayload());
      setGeneratedCode(code);
      setShowCode(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setTerminalOutput((prev) => `${prev}\n[error] ${message}\n`);
    } finally {
      setIsGenerating(false);
    }
  }, [buildPayload, generateCode, isGenerating, showCode]);

  const inputClassName =
    'mt-2 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60';
  const labelClassName = 'text-xs font-semibold uppercase tracking-wider text-slate-500';
  const safeNumber = (value: number, fallback: number) => (Number.isNaN(value) ? fallback : value);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="h-12 border-b border-slate-700 flex items-center justify-between px-4 bg-slate-900">
        <span className="text-xs uppercase tracking-wider text-slate-500">Pipeline Editor</span>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-md border border-slate-600 text-slate-200 text-sm font-semibold hover:bg-slate-800 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleToggleCode}
            disabled={isGenerating}
          >
            {showCode ? 'Hide Code' : isGenerating ? 'Generating...' : 'Show Code'}
          </button>
          <button
            className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleRunTraining}
            disabled={isRunning}
          >
            {isRunning ? 'Running...' : 'Run Training'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[260px_minmax(0,1fr)_280px]">
        <section className="flex h-full flex-col gap-4 border-r border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dataset</div>
          <div>
            <label className={labelClassName}>Dataset</label>
            <select
              className={inputClassName}
              value={dataset}
              onChange={(event) => setDataset(event.target.value as DatasetOption)}
            >
              <option value="MNIST">MNIST</option>
              <option value="CIFAR-10">CIFAR-10</option>
            </select>
          </div>
          <div>
            <label className={labelClassName}>Batch Size</label>
            <input
              className={inputClassName}
              type="number"
              min={1}
              step={1}
              value={batchSize}
              onChange={(event) =>
                setBatchSize(safeNumber(event.target.valueAsNumber, batchSize))
              }
            />
          </div>
        </section>

        <div className="min-h-0 bg-slate-800">
          <ReactFlowProvider>
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              setNodes={setNodes}
              setEdges={setEdges}
            />
          </ReactFlowProvider>
        </div>

        <section className="flex h-full flex-col gap-6 border-l border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Training</div>
          <div className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Optimizer &amp; Loss
            </div>
            <div>
              <label className={labelClassName}>Optimizer</label>
              <select
                className={inputClassName}
                value={optimizer}
                onChange={(event) => setOptimizer(event.target.value as OptimizerOption)}
              >
                <option value="Adam">Adam</option>
                <option value="SGD">SGD</option>
              </select>
            </div>
            <div>
              <label className={labelClassName}>Learning Rate</label>
              <input
                className={inputClassName}
                type="number"
                min={0}
                step={0.0001}
                value={learningRate}
                onChange={(event) =>
                  setLearningRate(safeNumber(event.target.valueAsNumber, learningRate))
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Trainer
            </div>
            <div>
              <label className={labelClassName}>Epochs</label>
              <input
                className={inputClassName}
                type="number"
                min={1}
                step={1}
                value={epochs}
                onChange={(event) => setEpochs(safeNumber(event.target.valueAsNumber, epochs))}
              />
            </div>
          </div>
        </section>
      </div>

      {showCode && (
        <div className="h-64 border-t border-slate-800 bg-slate-950 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
            <span className="text-xs uppercase tracking-wider text-slate-500">Generated Code</span>
          </div>
          <pre className="flex-1 overflow-auto px-3 py-2 text-xs font-mono text-slate-200 whitespace-pre-wrap">
            {generatedCode || 'No code generated yet.'}
          </pre>
        </div>
      )}

      <Terminal output={terminalOutput} isRunning={isRunning} />

      {/* Module Editor Modal */}
      <ModuleEditorModal
        onUpdateNode={handleUpdateCustomNode}
        onSaveToLibrary={handleSaveToLibrary}
      />
    </div>
  );
}

export default Editor;
