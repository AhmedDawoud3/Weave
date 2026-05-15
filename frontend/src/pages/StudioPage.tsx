import { useState, useCallback, DragEvent } from 'react';
import ReactFlow, {
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  ReactFlowInstance,
  Node,
  Edge,
  Connection,
} from 'reactflow';
// @ts-ignore
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { Sidebar } from '../components/Sidebar';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { LayerNode } from '../components/LayerNode';
import type { NodeData } from '../types';

const nodeTypes = { layer: LayerNode };

interface StudioPageProps {
  onNavigateDashboard: () => void;
}

export function StudioPage({ onNavigateDashboard }: StudioPageProps) {
  const [nodes, setNodes] = useState<Node<NodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const onConnect = useCallback((p: Connection) => setEdges((eds) => addEdge({ ...p, animated: true }, eds)), []);

  const onDrop = useCallback((event: DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type || !reactFlowInstance) return;
    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const newNode: Node<NodeData> = {
      id: `${Date.now()}`,
      type: 'layer',
      position,
      data: { type: type as NodeData['type'], params: { units: 64, activation: 'relu' } },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [reactFlowInstance]);

  const handleUpdateNodeParams = useCallback((nodeId: string, params: Record<string, unknown>) => {
    setNodes(nds => nds.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, params: { ...n.data.params, ...params } } } : n
    ));
  }, []);

  const handleRemoveNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setSelectedNodeId(null);
  }, []);

  return (
    <motion.div
      key="main"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="dark w-full h-screen bg-[#080808] text-white flex overflow-hidden"
    >
      <Sidebar onNavigateDashboard={onNavigateDashboard} />

      {/* Canvas Area */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(c) => setNodes((nds) => applyNodeChanges(c, nds))}
          onEdgesChange={(c) => setEdges((eds) => applyEdgeChanges(c, eds))}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onNodeClick={(_, n) => setSelectedNodeId(n.id)}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background color="#1a1a1a" gap={20} />
          <Controls className="bg-white/5 border-white/10" />
        </ReactFlow>
      </div>

      <PropertiesPanel
        selectedNode={selectedNode}
        selectedNodeId={selectedNodeId}
        onUpdateNodeParams={handleUpdateNodeParams}
        onRemoveNode={handleRemoveNode}
      />
    </motion.div>
  );
}
