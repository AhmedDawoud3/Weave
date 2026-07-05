import { useState, useCallback, useEffect, DragEvent } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowInstance,
  Connection,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Terminal, Code2, RefreshCw, Plus, Search, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Sidebar } from '../components/Sidebar';
import { LayerPalette } from '../components/LayerPalette';
import { DatasetWorkspace } from '../components/DatasetWorkspace';


import { LayerNode } from '../components/LayerNode';
import { WeaveEdge } from '../components/WeaveEdge';
import { TrainingConsole } from '../components/TrainingConsole';
import { ExportModal } from '../components/ExportModal';
import { useWeaveStore } from '../store/useWeaveStore';
import { LayerType } from '../types';

const nodeTypes = { layer: LayerNode };
const edgeTypes = { weave: WeaveEdge };

const ALL_LAYER_TYPES: LayerType[] = [
  'InputNode', 'OutputNode',
  'Conv2d', 'ConvTranspose2d', 'MaxPool2d', 'AvgPool2d', 'AdaptiveAvgPool2d',
  'Linear', 'Embedding',
  'BatchNorm2d', 'LayerNorm', 'GroupNorm',
  'ReLU', 'GELU', 'Sigmoid', 'Tanh', 'Softmax',
  'Flatten', 'Reshape', 'Permute', 'Dropout', 'Dropout2d',
  'Add', 'Concat', 'Multiply',
  'ResidualBlock', 'TransformerEncoder', 'MultiHeadAttention', 'ConvBNReLU', 'BottleneckBlock',
  'BatchNorm2dManualBlock', 'AttentionManualBlock', 'RNNManualBlock', 'CustomAutogradManualBlock'
];

interface StudioPageProps {
  onNavigateDashboard?: () => void;
}

export function StudioPage({ onNavigateDashboard }: StudioPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isInitialLoading, setIsInitialLoading] = useState(false);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    setSelectedNodeId,
    addNode,
    connectEdges,
    validationStatus,
    validationMessage,
    validatePipeline,
    activeInputShape,
    isSavingGraph,
    activeProject,
    activeSubGraphs,
    activeSubGraph,
    selectSubGraph,
    createSubGraph,
    navigationStack,
    enterSubGraph,
    exitSubGraph,
    isKernelConnected,
    checkKernelConnection,
    activeTab,
    setActiveTab,
    selectProjectById
  } = useWeaveStore();

  useEffect(() => {
    async function loadProject() {
      if (id && activeProject?.id !== id) {
        setIsInitialLoading(true);
        try {
          await selectProjectById(id);
        } catch (err: any) {
          console.error("Failed to load project:", err);
          alert(err.message || "Project not found or you don't have access. Redirecting to dashboard.");
          navigate('/dashboard');
        } finally {
          setIsInitialLoading(false);
        }
      }
    }
    loadProject();
  }, [id, activeProject?.id, selectProjectById, navigate]);

  const handleNavigateDashboard = onNavigateDashboard || (() => navigate('/dashboard'));

  if (isInitialLoading) {
    return (
      <div className="h-screen w-full bg-[#070709] flex flex-col items-center justify-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(30,143,211,0.05),transparent_60%)]" />
        <div className="flex flex-col items-center relative z-10">
          <Loader2 className="animate-spin text-[#40d3b6] mb-4" size={48} />
          <h3 className="text-lg font-black uppercase tracking-widest text-white">Loading Workspace</h3>
          <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">Synchronizing graph and dependencies...</p>
        </div>
      </div>
    );
  }

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [showTrainingConsole, setShowTrainingConsole] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [newSubGraphName, setNewSubGraphName] = useState('');
  const [showSubGraphPrompt, setShowSubGraphPrompt] = useState(false);

  const [showSearchPalette, setShowSearchPalette] = useState(false);
  const [searchPalettePosition, setSearchPalettePosition] = useState<{ x: number; y: number } | null>(null);
  const [shapeInput, setShapeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Synchronize dynamic shape updates from store (templates, dataset inference, etc.)
  useEffect(() => {
    if (activeInputShape) {
      setShapeInput(activeInputShape.join(', '));
    } else {
      setShapeInput('32, 3, 224, 224');
    }
  }, [activeInputShape]);

  const checkActiveRuns = useWeaveStore(state => (state as any).checkActiveRuns);

  // Periodically check and reconnect to any running background training jobs
  useEffect(() => {
    if (checkActiveRuns) {
      checkActiveRuns();
      const interval = setInterval(checkActiveRuns, 10000);
      return () => clearInterval(interval);
    }
  }, [checkActiveRuns]);

  const handleShapeSubmit = () => {
    // Parse format like "32, 3, 224, 224" or "[32, 3, 224, 224]"
    const clean = shapeInput.replace(/[\[\]]/g, '').trim();
    const parts = clean.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    if (parts.length > 0) {
      validatePipeline(parts);
    } else if (activeInputShape) {
      setShapeInput(activeInputShape.join(', '));
    }
  };



  // Handle adding node from the command palette
  const handleAddNodeFromPalette = useCallback((type: LayerType) => {
    if (searchPalettePosition) {
      addNode(type, searchPalettePosition);
    }
    setShowSearchPalette(false);
  }, [addNode, searchPalettePosition]);

  // Open command palette with Space/Tab keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isEditing = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.getAttribute('contenteditable') === 'true'
      );
      if (isEditing) return;

      if (e.key === ' ' || e.key === 'Tab') {
        e.preventDefault();
        if (reactFlowInstance) {
          const position = reactFlowInstance.screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          });
          setSearchPalettePosition(position);
          setSearchQuery('');
          setShowSearchPalette(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reactFlowInstance]);

  // Poll kernel online status every 5 seconds
  useEffect(() => {
    checkKernelConnection();
    const interval = setInterval(() => {
      checkKernelConnection();
    }, 5000);
    return () => clearInterval(interval);
  }, [checkKernelConnection]);

  // Handle double-clicking nested blocks to enter viewport
  const handleNodeDoubleClick = useCallback((_: any, node: any) => {
    const doubleClickableTypes = ['Block', 'ResidualBlock', 'TransformerEncoder', 'MultiHeadAttention', 'ConvBNReLU', 'BottleneckBlock', 'BatchNorm2dManualBlock', 'AttentionManualBlock', 'RNNManualBlock', 'CustomAutogradManualBlock'];
    if (doubleClickableTypes.includes(node.data?.type)) {
      const subGraphId = node.data?.params?.subgraph_id;
      if (subGraphId) {
        enterSubGraph(subGraphId);
      }
    }
  }, [enterSubGraph]);


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


  const handleAddInputNode = useCallback(() => {
    const inCount = nodes.filter(n => n.data?.type === 'InputNode').length;
    addNode('InputNode', { x: 150 + inCount * 120, y: 50 });
  }, [addNode, nodes]);

  const handleAddOutputNode = useCallback(() => {
    const outCount = nodes.filter(n => n.data?.type === 'OutputNode').length;
    addNode('OutputNode', { x: 150 + outCount * 120, y: 450 });
  }, [addNode, nodes]);

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

          {/* Workspace Switcher */}
          <div className="flex bg-black/40 border border-primary/10 rounded-xl p-1 shrink-0 h-10 items-center select-none nodrag">
            <button
              onClick={() => setActiveTab('canvas')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'canvas'
                  ? 'bg-primary/20 text-[#40d3b6] border border-primary/10 shadow-[0_0_8px_rgba(64,211,182,0.1)]'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              Model Canvas
            </button>
            <button
              onClick={() => setActiveTab('dataset')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'dataset'
                  ? 'bg-primary/20 text-[#40d3b6] border border-primary/10 shadow-[0_0_8px_rgba(64,211,182,0.1)]'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              Dataset Workspace
            </button>
          </div>

          <div className="h-8 w-px bg-primary/10" />

          {/* SubGraph Selector or Breadcrumbs Navigation */}
          {navigationStack.length > 0 ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <button
                onClick={() => exitSubGraph(-1)}
                className="hover:text-primary transition-all uppercase tracking-wide hover:underline font-extrabold"
              >
                Root
              </button>
              {navigationStack.map((sub, index) => {
                if (index === 0) return null;
                return (
                  <div key={sub.id} className="flex items-center gap-2">
                    <span>/</span>
                    <button
                      onClick={() => exitSubGraph(index)}
                      className="hover:text-primary transition-all uppercase tracking-wide hover:underline font-extrabold max-w-[100px] truncate"
                      title={sub.name}
                    >
                      {sub.name}
                    </button>
                  </div>
                );
              })}
              <span>/</span>
              <span className="text-white uppercase tracking-wide max-w-[120px] truncate font-black" title={activeSubGraph?.name}>
                {activeSubGraph?.name}
              </span>
            </div>
          ) : (
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
          )}
        </div>

        {/* Compile Status and Exporter menu actions */}
        <div className="flex items-center gap-4">
          {/* Kernel status indicator */}
          <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-wider select-none">
            <span className={`w-2 h-2 rounded-full ${isKernelConnected ? 'bg-[#40d3b6] animate-pulse shadow-[0_0_8px_#40d3b6]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
            <span className={isKernelConnected ? 'text-[#40d3b6]' : 'text-red-400'}>
              {isKernelConnected ? 'Kernel Online' : 'Kernel Offline'}
            </span>
          </div>

          <div className="h-6 w-px bg-primary/10" />

          {/* Autosave status indicator */}
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground select-none">
            <span className={`w-2 h-2 rounded-full ${isSavingGraph ? 'bg-yellow-400 animate-pulse' : 'bg-primary'}`} />
            <span>{isSavingGraph ? 'Autosaving...' : 'Saved to Cloud'}</span>
          </div>

          <div className="h-6 w-px bg-primary/10" />

          {/* Input Shape Editor */}
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-xl px-2.5 py-1.5 h-10 select-none">
            <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Shape:</span>
            <input
              type="text"
              value={shapeInput}
              onChange={(e) => setShapeInput(e.target.value)}
              onBlur={handleShapeSubmit}
              onKeyDown={(e) => { if (e.key === 'Enter') handleShapeSubmit(); }}
              className="bg-transparent text-xs font-mono font-bold text-[#40d3b6] focus:outline-none w-28 text-center"
              placeholder="e.g. 32, 3, 224, 224"
            />
          </div>

          <div className="h-6 w-px bg-primary/10" />

          {/* Compile check manually triggers pipeline shape checker */}
          <Button
            variant="ghost"
            onClick={() => validatePipeline()}
            className={`rounded-xl border hover:text-white transition-all text-xs font-bold h-10 ${
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
            onClick={handleNavigateDashboard}
            className="border border-primary/5 hover:bg-primary/15 text-muted-foreground hover:text-white rounded-xl h-10 px-4 transition-all"
          >
            EXIT STUDIO
          </Button>
        </div>
      </div>

      {/* Main Studio Body Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {activeTab === 'canvas' ? (
          <>
            <Sidebar onNavigateDashboard={handleNavigateDashboard} />

            {/* Canvas Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#070709] relative">
              <LayerPalette />

              <div className="flex-1 relative min-h-0 min-w-0">
                {/* Floating Canvas boundary node spawn buttons when in a nested subgraph */}
                {navigationStack.length > 0 && (
                  <>
                    {/* Top floating button: + ADD INPUT */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                      <Button
                        onClick={handleAddInputNode}
                        className="bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-full font-bold shadow-lg border border-emerald-400/20 px-4 py-2 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 duration-200"
                      >
                        <Plus size={14} strokeWidth={3} />
                        ADD INPUT NODE
                      </Button>
                    </div>

                    {/* Bottom floating button: + ADD OUTPUT */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                      <Button
                        onClick={handleAddOutputNode}
                        className="bg-amber-600/90 hover:bg-amber-500 text-white rounded-full font-bold shadow-lg border border-amber-400/20 px-4 py-2 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 duration-200"
                      >
                        <Plus size={14} strokeWidth={3} />
                        ADD OUTPUT NODE
                      </Button>
                    </div>
                  </>
                )}

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
                  onNodeDoubleClick={handleNodeDoubleClick}

                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  defaultEdgeOptions={{ 
                    type: 'weave',
                    markerEnd: {
                      type: MarkerType.ArrowClosed,
                      color: '#40d3b6',
                    }
                  }}
                  snapToGrid={true}
                  snapGrid={[15, 15]}
                  fitView
                >
                  <Background color="#1a1a1f" gap={20} />
                  <Controls className="bg-[#0e0e11]/80 border border-primary/10 rounded-xl overflow-hidden [&>button]:border-primary/5 [&>button]:text-white [&>button]:bg-transparent hover:[&>button]:bg-primary/20 [&>svg]:fill-white" />
                  <MiniMap 
                    className="!bg-[#0e0e11]/90 border border-primary/10 rounded-xl overflow-hidden shadow-2xl !bottom-24 !left-6 !w-[150px] !h-[100px]" 
                    nodeColor="#1a1a24"
                    maskColor="rgba(0, 0, 0, 0.4)"
                    nodeStrokeColor="#40d3b6"
                    nodeBorderRadius={4}
                  />
                </ReactFlow>
              </div>
            </div>
          </>
        ) : (
          <DatasetWorkspace />
        )}
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

      {/* FLOATING COMMAND PALETTE */}
      <AnimatePresence>
        {showSearchPalette && (
          <div 
            className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 select-none"
            onClick={() => setShowSearchPalette(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[480px] bg-[#0c0c0e]/95 backdrop-blur-2xl border border-primary/20 rounded-2xl shadow-[0_0_50px_rgba(64,211,182,0.08)] overflow-hidden flex flex-col max-h-[380px]"
            >
              {/* Search input header */}
              <div className="p-4 border-b border-primary/10 flex items-center gap-3">
                <Search className="text-primary/60 shrink-0 animate-pulse" size={18} />
                <input
                  type="text"
                  placeholder="Type to search and add layer... (or Space/Tab)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-transparent border-none outline-none text-sm text-white placeholder-muted-foreground/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowSearchPalette(false);
                    } else if (e.key === 'Enter') {
                      const filtered = ALL_LAYER_TYPES.filter(type => 
                        type.toLowerCase().includes(searchQuery.toLowerCase())
                      );
                      if (filtered.length > 0) {
                        handleAddNodeFromPalette(filtered[0]);
                      }
                    }
                  }}
                />
              </div>

              {/* Filtered list of layers */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {ALL_LAYER_TYPES.filter(type => 
                  type.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleAddNodeFromPalette(type)}
                    className="w-full p-2.5 hover:bg-primary/10 rounded-xl transition-all text-left text-xs font-bold text-white/85 hover:text-white uppercase flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                      <span>{type}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground/60 group-hover:text-primary transition-all font-black tracking-widest">
                      INSERT LAYER
                    </span>
                  </button>
                ))}
                {ALL_LAYER_TYPES.filter(type => 
                  type.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 && (
                  <div className="p-6 text-center text-xs text-muted-foreground italic">
                    No matching layers found.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
