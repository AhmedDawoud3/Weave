import { useState, useCallback, DragEvent } from 'react';
import ReactFlow, {
  Background,
  Controls,
  ReactFlowInstance,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Code2, RefreshCw, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sidebar } from '../components/Sidebar';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { LayerNode } from '../components/LayerNode';
import { TrainingConsole } from '../components/TrainingConsole';
import { ExportModal } from '../components/ExportModal';
import { useWeaveStore } from '../store/useWeaveStore';
import { LayerType } from '../types';

const nodeTypes = { layer: LayerNode };

interface StudioPageProps {
  onNavigateDashboard: () => void;
}

export function StudioPage({ onNavigateDashboard }: StudioPageProps) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    selectedNodeId,
    setSelectedNodeId,
    addNode,
    removeNode,
    updateNodeParams,
    connectEdges,
    validationStatus,
    validationMessage,
    validatePipeline,
    isSavingGraph,
    activeProject,
    activeSubGraphs,
    activeSubGraph,
    selectSubGraph,
    createSubGraph
  } = useWeaveStore();

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [showTrainingConsole, setShowTrainingConsole] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [newSubGraphName, setNewSubGraphName] = useState('');
  const [showSubGraphPrompt, setShowSubGraphPrompt] = useState(false);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const onConnect = useCallback((connection: Connection) => {
    connectEdges(connection);
  }, [connectEdges]);

  const onDrop = useCallback((event: DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow') as LayerType;
    if (!type || !reactFlowInstance) return;
    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addNode(type, position);
  }, [reactFlowInstance, addNode]);

  const handleUpdateNodeParams = useCallback((nodeId: string, params: Record<string, any>) => {
    updateNodeParams(nodeId, params);
  }, [updateNodeParams]);

  const handleRemoveNode = useCallback((nodeId: string) => {
    removeNode(nodeId);
  }, [removeNode]);

  const handleCreateSubGraph = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubGraphName.trim()) return;
    await createSubGraph(newSubGraphName);
    setNewSubGraphName('');
    setShowSubGraphPrompt(false);
  };

  return (
    <motion.div
      key="main"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="dark w-full h-screen bg-[#070709] text-white flex flex-col overflow-hidden relative"
    >
      {/* Studio Header Toolbar */}
      <div className="h-16 border-b border-primary/10 bg-card/15 backdrop-blur-md flex items-center justify-between px-6 shrink-0 relative z-35">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[9px] text-[#40d3b6] font-black uppercase tracking-widest">Active Workspace</span>
            <span className="text-sm font-black text-white uppercase truncate max-w-[150px]">{activeProject?.name || 'Sandbox'}</span>
          </div>

          <div className="h-8 w-px bg-primary/10" />

          {/* SubGraph Selector & Revision Control */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">SubGraph:</span>
            {activeSubGraphs.length > 0 ? (
              <select
                value={activeSubGraph?.id || ''}
                onChange={(e) => {
                  const sub = activeSubGraphs.find(s => s.id === e.target.value);
                  if (sub) selectSubGraph(sub);
                }}
                className="bg-primary/5 border border-primary/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-primary transition-all uppercase font-bold"
              >
                {activeSubGraphs.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#0e0e11]">{s.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-xs italic text-muted-foreground">None</span>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSubGraphPrompt(true)}
              className="hover:bg-primary/15 hover:text-[#40d3b6] text-muted-foreground rounded-xl"
              title="Create New SubGraph"
            >
              <Plus size={16} />
            </Button>
          </div>
        </div>

        {/* Compile Status and Exporter menu actions */}
        <div className="flex items-center gap-4">
          {/* Autosave status indicator */}
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground select-none">
            <span className={`w-2 h-2 rounded-full ${isSavingGraph ? 'bg-yellow-400 animate-pulse' : 'bg-primary'}`} />
            <span>{isSavingGraph ? 'Autosaving...' : 'Saved to Cloud'}</span>
          </div>

          <div className="h-6 w-px bg-primary/10" />

          {/* Compile check manually triggers pipeline shape checker */}
          <Button
            variant="ghost"
            onClick={() => validatePipeline([32, 3, 224, 224])}
            className={`rounded-xl border hover:text-white transition-all text-xs font-bold ${
              validationStatus === 'success' 
                ? 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10' 
                : validationStatus === 'error'
                  ? 'border-red-500/20 text-red-400 hover:bg-red-500/10'
                  : 'border-primary/15 text-muted-foreground hover:bg-primary/10'
            }`}
          >
            <RefreshCw size={14} className={`mr-1.5 ${validationStatus === 'idle' ? 'animate-spin' : ''}`} />
            {validationStatus === 'success' ? 'GRAPH VALIDATED' : validationStatus === 'error' ? 'COMPILE ERROR' : 'VALIDATING...'}
          </Button>

          <Button
            onClick={() => setShowExportModal(true)}
            className="bg-primary/10 border border-primary/20 hover:bg-primary text-white hover:text-black font-extrabold text-xs h-10 px-4 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Code2 size={16} /> EXPORT
          </Button>

          <Button
            onClick={() => {
              setShowTrainingConsole(!showTrainingConsole);
            }}
            className="bg-[#1e8fd3]/10 border border-[#1e8fd3]/25 hover:bg-[#1e8fd3] text-white hover:text-black font-extrabold text-xs h-10 px-4 rounded-xl transition-all flex items-center gap-1.5"
          >
            <Terminal size={16} /> TRAINING CONSOLE
          </Button>

          <Button
            variant="ghost"
            onClick={onNavigateDashboard}
            className="border border-primary/5 hover:bg-primary/15 text-muted-foreground hover:text-white rounded-xl h-10 px-4 transition-all"
          >
            EXIT STUDIO
          </Button>
        </div>
      </div>

      {/* Main Studio Body Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        <Sidebar onNavigateDashboard={onNavigateDashboard} />

        {/* Canvas Area */}
        <div className="flex-1 relative bg-[#070709]">
          {/* validation Warning float */}
          {validationStatus === 'error' && validationMessage && (
            <div className="absolute left-6 top-6 max-w-sm bg-red-500/10 border border-red-500/20 p-4 rounded-xl shadow-xl z-20 flex items-start gap-2.5 text-xs text-red-400 select-text">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <p className="leading-relaxed font-semibold">{validationMessage}</p>
            </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onNodeClick={(_, n) => setSelectedNodeId(n.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#1a1a1f" gap={20} />
            <Controls className="bg-[#0e0e11]/80 border border-primary/10 rounded-xl overflow-hidden [&>button]:border-primary/5 [&>button]:text-white [&>button]:bg-transparent hover:[&>button]:bg-primary/20 [&>svg]:fill-white" />
          </ReactFlow>
        </div>

        <PropertiesPanel
          selectedNode={selectedNode}
          selectedNodeId={selectedNodeId}
          onUpdateNodeParams={handleUpdateNodeParams}
          onRemoveNode={handleRemoveNode}
        />
      </div>

      {/* Collapsible bottom training console drawer */}
      <AnimatePresence>
        {showTrainingConsole && (
          <motion.div
            initial={{ y: 380 }}
            animate={{ y: 0 }}
            exit={{ y: 380 }}
            transition={{ type: 'spring', damping: 20 }}
            className="absolute bottom-0 left-0 right-0 z-40"
          >
            <TrainingConsole onClose={() => setShowTrainingConsole(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPORT MODAL DISPLAY TRIGGER */}
      <AnimatePresence>
        {showExportModal && (
          <ExportModal onClose={() => setShowExportModal(false)} />
        )}
      </AnimatePresence>

      {/* NEW SUBGRAPH PROMPT DIALOG */}
      <AnimatePresence>
        {showSubGraphPrompt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[400px] bg-card/85 backdrop-blur-2xl border border-primary/20 p-6 rounded-2xl shadow-2xl relative"
            >
              <h2 className="text-xl font-black mb-1 text-white uppercase">New Graph variant</h2>
              <p className="text-xs text-muted-foreground mb-4">Initialize a new subgraph revision/variant for model mapping.</p>
              
              <form onSubmit={handleCreateSubGraph} className="space-y-4">
                <input
                  type="text"
                  placeholder="e.g. ResNet V2 Convolution"
                  value={newSubGraphName}
                  onChange={(e) => setNewSubGraphName(e.target.value)}
                  required
                  className="w-full h-11 bg-background/50 border border-primary/10 p-3 text-sm rounded-xl outline-none focus:border-primary text-white"
                />
                
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSubGraphPrompt(false)}
                    className="flex-1 h-11 border-primary/10 rounded-xl"
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-11 bg-gradient-to-r from-primary to-[#1e8fd3] text-black font-extrabold uppercase rounded-xl transition-all"
                  >
                    CREATE
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
