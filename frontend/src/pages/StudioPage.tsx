import { useState, useCallback, useEffect, DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type ReactFlowInstance,
  type Connection,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Terminal, Code2, RefreshCw, Plus, Search, Loader2, Sliders, HelpCircle, Sun, Moon, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { api } from '../services/api';
import { Button } from "@/components/ui/button";
import { toast } from '../components/ui/toaster';
import { LayerPalette } from '../components/LayerPalette';
import { DatasetWorkspace } from '../components/DatasetWorkspace';
import { TokenizerWorkspace } from '../components/TokenizerWorkspace';

import { LayerNode } from '../components/LayerNode';
import { WeaveEdge } from '../components/WeaveEdge';
import { TrainingPanel } from '../components/training/TrainingPanel';
import { ExportModal } from '../components/ExportModal';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';
import { useWeaveStore } from '../store/useWeaveStore';
import { useTrainingStore } from '../store/useTrainingStore';
import { LayerType } from '../types';
import { useTheme } from '../context/ThemeContext';

const nodeTypes = { layer: LayerNode as any };
const edgeTypes = { weave: WeaveEdge as any };

const ALL_LAYER_TYPES: LayerType[] = [
  'InputNode', 'OutputNode',
  'Conv2d', 'ConvTranspose2d', 'MaxPool2d', 'AvgPool2d', 'AdaptiveAvgPool2d',
  // Sequence (1D)
  'Conv1d', 'MaxPool1d', 'BatchNorm1d', 'FlattenConsecutive',
  'Linear', 'Embedding',
  'BatchNorm2d', 'LayerNorm', 'GroupNorm',
  // Activations
  'ReLU', 'GELU', 'Sigmoid', 'Tanh', 'Softmax', 'LeakyReLU', 'SiLU', 'ELU', 'PReLU',
  'Flatten', 'Reshape', 'Permute', 'Dropout', 'Dropout2d',
  'Add', 'Concat', 'Multiply',
  // Transformer Primitives
  'SelfAttention', 'PositionalEncoding', 'CausalMask', 'FeedForward',
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
    selectProjectById,
    saveActiveSubGraph,
    ensureSubgraphExists,
    getFormattedGraph,
    datasetConfig
  } = useWeaveStore();

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (activeProject?.name) {
      document.title = `Weave | Studio - ${activeProject.name}`;
    } else {
      document.title = "Weave | Studio";
    }
  }, [activeProject?.name]);

  const { isTraining, trainingStatus, checkActiveRuns } = useTrainingStore();

  useEffect(() => {
    async function loadProject() {
      if (id && activeProject?.id !== id) {
        setIsInitialLoading(true);
        try {
          await selectProjectById(id);
        } catch (err: any) {
          console.error("Failed to load project:", err);
          toast.error(err.message || "Project not found or access denied.");
          navigate('/dashboard');
        } finally {
          setIsInitialLoading(false);
        }
      }
    }
    loadProject();
  }, [id, activeProject?.id, selectProjectById, navigate]);

  const handleNavigateDashboard = onNavigateDashboard || (() => navigate('/dashboard'));

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [showTrainingConsole, setShowTrainingConsole] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [liveCode, setLiveCode] = useState('');
  const [isCompilingLiveCode, setIsCompilingLiveCode] = useState(false);
  const [codePanelCollapsed, setCodePanelCollapsed] = useState(false);
  const [copiedLiveCode, setCopiedLiveCode] = useState(false);

  const handleCopyLiveCode = () => {
    navigator.clipboard.writeText(liveCode);
    setCopiedLiveCode(true);
    setTimeout(() => setCopiedLiveCode(false), 2000);
  };

  useEffect(() => {
    let active = true;
    const compileTimer = setTimeout(async () => {
      if (!active) return;
      setIsCompilingLiveCode(true);
      try {
        const formatted = getFormattedGraph();
        if (nodes.length === 0) {
          setLiveCode('# Drag and drop layers from the left panel to begin.');
          setIsCompilingLiveCode(false);
          return;
        }
        const res = await api.engine.exportPyTorch(
          formatted,
          activeInputShape || [1, 3, 224, 224],
          "data/checkpoints/best.pt",
          "data/exports/model.pt",
          datasetConfig
        );
        if (active) {
          if (res.code) {
            setLiveCode(res.code);
          } else if (res.status === 'error') {
            setLiveCode(`# PyTorch export failed.\n# Error: ${res.message}`);
          } else {
            setLiveCode('');
          }
        }
      } catch (err: any) {
        if (active) {
          setLiveCode(`# Live compilation waiting/offline.\n# Detail: ${err.message}`);
        }
      } finally {
        if (active) {
          setIsCompilingLiveCode(false);
        }
      }
    }, 600);

    return () => {
      active = false;
      clearTimeout(compileTimer);
    };
  }, [nodes, edges, activeSubGraph, getFormattedGraph]);

  // Compute highlighted live PyTorch code
  const highlightedLiveCode = (() => {
    if (!liveCode) return '';
    try {
      return Prism.highlight(liveCode, Prism.languages.python || {}, 'python');
    } catch (e) {
      return liveCode;
    }
  })();
  const [newSubGraphName, setNewSubGraphName] = useState('');
  const [showSubGraphPrompt, setShowSubGraphPrompt] = useState(false);
  const [showShortcutsTray, setShowShortcutsTray] = useState(false);

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

  // Periodically check and reconnect to any running background training jobs
  useEffect(() => {
    checkActiveRuns();
    const interval = setInterval(checkActiveRuns, 10000);
    return () => clearInterval(interval);
  }, [checkActiveRuns]);

  // Auto-open the training console when training starts or is active
  useEffect(() => {
    if (isTraining || trainingStatus === 'running' || trainingStatus === 'paused') {
      setShowTrainingConsole(true);
    }
  }, [isTraining, trainingStatus]);

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

  // Open command palette with Space/Tab keys & support hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isEditing = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );

      // Support saving regardless of focus (since Ctrl+S is global)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveActiveSubGraph();
        toast.success("Sandbox saved successfully!");
        return;
      }

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
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsTray(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reactFlowInstance, saveActiveSubGraph]);

  // Poll kernel online status every 5 seconds
  useEffect(() => {
    checkKernelConnection();
    const interval = setInterval(() => {
      checkKernelConnection();
    }, 5000);
    return () => clearInterval(interval);
  }, [checkKernelConnection]);

  // Handle double-clicking nested blocks to enter viewport
  const handleNodeDoubleClick = useCallback(async (_: any, node: any) => {
    const doubleClickableTypes = ['Block', 'ResidualBlock', 'TransformerEncoder', 'MultiHeadAttention', 'ConvBNReLU', 'BottleneckBlock', 'BatchNorm2dManualBlock', 'AttentionManualBlock', 'RNNManualBlock', 'CustomAutogradManualBlock', 'Module', 'Stack'];
    if (doubleClickableTypes.includes(node.data?.type)) {
      const subGraphId = await ensureSubgraphExists(node.id);
      if (subGraphId) {
        enterSubGraph(subGraphId);
      }
    }
  }, [enterSubGraph, ensureSubgraphExists]);

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

  if (isInitialLoading) {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(108,60,225,0.05),transparent_60%)]" />
        <div className="flex flex-col items-center relative z-10">
          <Loader2 className="animate-spin text-primary mb-4" size={48} />
          <h3 className="text-base font-black uppercase tracking-widest text-foreground">Loading Workspace</h3>
          <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">Synchronizing graph and dependencies...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      key="main"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-screen bg-background text-foreground flex flex-col overflow-hidden relative font-sans"
    >
      {/* Mobile Blocking Overlay */}
      <div className="md:hidden fixed inset-0 z-[2000] bg-background flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 mb-6 text-primary shadow-glow animate-pulse">
          <Sliders size={28} />
        </div>
        <h3 className="text-lg font-black text-foreground uppercase tracking-wider mb-2">Desktop View Required</h3>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed mb-6">
          The Neural Design Studio requires a larger viewport to visually build, parameter-tune, and trace model architectures. Please access this page on a desktop browser.
        </p>
        <Button onClick={handleNavigateDashboard} className="bg-primary text-primary-foreground font-black px-6 h-11 rounded-xl">
          Return to Dashboard
        </Button>
      </div>

      {/* Studio Header Toolbar */}
      <div className="h-16 border-b border-border bg-card/40 backdrop-blur-md flex items-center justify-between px-6 shrink-0 relative z-35">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo_icon.svg" alt="Weave Icon" className="h-6 w-6" />
            <div className="flex flex-col">
              <span className="text-[10px] text-primary font-black uppercase tracking-widest">Active Workspace</span>
              <span className="text-xs font-black text-foreground uppercase truncate max-w-[150px]">{activeProject?.name || 'Sandbox'}</span>
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          {/* Workspace Switcher */}
          <div className="flex bg-foreground/40 border border-border rounded-xl p-1 shrink-0 h-10 items-center select-none nodrag">
            <button
              onClick={() => setActiveTab('canvas')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${activeTab === 'canvas'
                  ? 'bg-primary/20 text-primary border border-primary/10 shadow-[0_0_8px_rgba(108,60,225,0.1)]'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Model Canvas
            </button>
            <button
              onClick={() => setActiveTab('dataset')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${activeTab === 'dataset'
                  ? 'bg-primary/20 text-primary border border-primary/10 shadow-[0_0_8px_rgba(108,60,225,0.1)]'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Dataset Workspace
            </button>
            <button
              onClick={() => setActiveTab('tokenizer')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${activeTab === 'tokenizer'
                  ? 'bg-primary/20 text-primary border border-primary/10 shadow-[0_0_8px_rgba(108,60,225,0.1)]'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Tokenizer Workspace
            </button>
          </div>

          <div className="h-8 w-px bg-border" />

          {/* SubGraph Selector or Breadcrumbs Navigation */}
          {navigationStack.length > 0 ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <button
                onClick={() => exitSubGraph(-1)}
                className="hover:text-primary transition-all uppercase tracking-wide hover:underline font-extrabold cursor-pointer"
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
                      className="hover:text-primary transition-all uppercase tracking-wide hover:underline font-extrabold max-w-[100px] truncate cursor-pointer"
                      title={sub.name}
                    >
                      {sub.name}
                    </button>
                  </div>
                );
              })}
              <span>/</span>
              <span className="text-foreground uppercase tracking-wide max-w-[120px] truncate font-black" title={activeSubGraph?.name}>
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
                  className="bg-primary/5 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary transition-all uppercase font-bold cursor-pointer"
                >
                  {activeSubGraphs.map(s => (
                    <option key={s.id} value={s.id} className="bg-card">{s.name}</option>
                  ))}
                </select>
              ) : (
                <span className="text-xs italic text-muted-foreground">None</span>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSubGraphPrompt(true)}
                className="hover:bg-primary/15 hover:text-primary rounded-xl h-8 w-8 cursor-pointer"
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
          <div 
            className="flex items-center select-none nodrag cursor-help relative group px-1"
            title={isKernelConnected ? 'Kernel Online' : 'Kernel Offline'}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${isKernelConnected ? 'bg-weave-teal animate-pulse shadow-[0_0_8px_#2dd4bf]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
            <span className="absolute top-7 left-1/2 -translate-x-1/2 bg-card border border-border text-[9px] font-black uppercase text-foreground rounded-lg px-2 py-0.5 shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              {isKernelConnected ? 'Kernel Online' : 'Kernel Offline'}
            </span>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Autosave status indicator */}
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground select-none">
            <span className={`w-2 h-2 rounded-full ${isSavingGraph ? 'bg-yellow-400 animate-pulse' : 'bg-primary'}`} />
            <span>{isSavingGraph ? 'Saving...' : 'Saved'}</span>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Input Shape Editor */}
          <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-2.5 py-1.5 h-10 select-none">
            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Shape:</span>
            <input
              type="text"
              value={shapeInput}
              onChange={(e) => setShapeInput(e.target.value)}
              onBlur={handleShapeSubmit}
              onKeyDown={(e) => { if (e.key === 'Enter') handleShapeSubmit(); }}
              className="bg-transparent text-xs font-mono font-bold text-primary focus:outline-none w-28 text-center"
              placeholder="e.g. 32, 3, 224, 224"
            />
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Compile check manually triggers pipeline shape checker */}
          <Button
            variant="ghost"
            onClick={() => validatePipeline()}
            className={`rounded-xl border hover:text-foreground transition-all text-xs font-bold h-10 cursor-pointer ${validationStatus === 'success'
                ? 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                : validationStatus === 'error'
                  ? 'border-red-500/20 text-red-400 hover:bg-red-500/10'
                  : 'border-border text-muted-foreground hover:bg-foreground/5'
              }`}
          >
            <RefreshCw size={14} className={`mr-1.5 ${validationStatus === 'idle' ? 'animate-spin' : ''}`} />
            {validationStatus === 'success' ? 'VALID' : validationStatus === 'error' ? 'ERROR' : 'VALIDATING...'}
          </Button>

          <Button
            onClick={() => setShowExportModal(true)}
            className="bg-primary hover:brightness-110 text-primary-foreground font-black text-xs h-10 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-glow"
          >
            <Code2 size={16} /> EXPORT
          </Button>

          <Button
            onClick={() => {
              setShowTrainingConsole(!showTrainingConsole);
            }}
            className={`${
              isTraining
                ? 'bg-primary/20 border-primary/50 text-foreground ring-1 ring-primary/30'
                : 'bg-primary/10 border-primary/20 text-primary'
            } border hover:bg-primary hover:text-primary-foreground font-black text-xs h-10 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer`}
          >
            {isTraining ? (
              <span className="relative flex h-2.5 w-2.5 mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-weave-teal opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-weave-teal" />
              </span>
            ) : (
              <Terminal size={16} />
            )}
            {isTraining ? 'ACTIVE' : 'TRAIN'}
          </Button>

          <Button
            variant="ghost"
            onClick={() => setTheme(theme === 'weave-dark' ? 'weave-light' : 'weave-dark')}
            className="border border-border hover:bg-foreground/5 text-muted-foreground hover:text-foreground rounded-xl h-10 w-10 flex items-center justify-center cursor-pointer p-0"
            title="Toggle Theme"
          >
            {theme === 'weave-dark' ? <Sun size={14} /> : <Moon size={14} />}
          </Button>

          <Button
            variant="ghost"
            onClick={handleNavigateDashboard}
            className="border border-border hover:bg-foreground/5 text-muted-foreground hover:text-foreground rounded-xl h-10 px-4 transition-all cursor-pointer"
          >
            EXIT
          </Button>
        </div>
      </div>

      {/* Main Studio Body Workspace */}
<div className="flex-1 flex overflow-hidden min-h-0 relative">
        {activeTab === 'canvas' ? (
          <>
            <LayerPalette onNavigateDashboard={handleNavigateDashboard} />

            {/* Canvas Area */}
            <div className="flex-1 flex min-w-0 bg-background relative h-full">

              <div className="flex-1 relative min-h-0 min-w-0 h-full">
                {/* Floating Canvas boundary node spawn buttons when in a nested subgraph */}
                {navigationStack.length > 0 && (
                  <>
                    {/* Top floating button: + ADD INPUT */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                      <Button
                        onClick={handleAddInputNode}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold shadow-lg border border-emerald-400/20 px-4 py-2 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 duration-200 cursor-pointer"
                      >
                        <Plus size={14} strokeWidth={3} />
                        ADD INPUT NODE
                      </Button>
                    </div>

                    {/* Bottom floating button: + ADD OUTPUT */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                      <Button
                        onClick={handleAddOutputNode}
                        className="bg-amber-600 hover:bg-amber-500 text-white rounded-full font-bold shadow-lg border border-amber-400/20 px-4 py-2 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 duration-200 cursor-pointer"
                      >
                        <Plus size={14} strokeWidth={3} />
                        ADD OUTPUT NODE
                      </Button>
                    </div>
                  </>
                )}

                {/* validation Warning float */}
                {validationStatus === 'error' && validationMessage && (
                  <div className="absolute left-6 top-6 max-w-sm bg-red-500/10 border border-red-500/25 p-4 rounded-xl shadow-xl z-20 flex items-start gap-2.5 text-xs text-red-400 select-text leading-relaxed">
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    <p className="font-semibold">{validationMessage}</p>
                  </div>
                )}

                {/* Keyboard Shortcuts Hint */}
                <div
                  onClick={() => setShowShortcutsTray(true)}
                  className="absolute bottom-4 right-4 z-20 bg-card/80 backdrop-blur-md border border-border rounded-xl p-3 shadow-lg text-[10px] text-muted-foreground flex flex-col gap-1.5 select-none cursor-pointer hover:border-primary/50 transition-colors pointer-events-auto"
                >
                  <div className="flex items-center gap-2 font-bold text-foreground uppercase tracking-wider mb-0.5">
                    <HelpCircle size={12} className="text-primary animate-pulse" /> Shortcuts
                  </div>
                  <div className="flex justify-between gap-4"><span>Spawn Node:</span><kbd className="bg-foreground/5 border border-border px-1.5 py-0.2 rounded font-mono">Space</kbd></div>
                  <div className="flex justify-between gap-4"><span>Focus Search:</span><kbd className="bg-foreground/5 border border-border px-1.5 py-0.2 rounded font-mono">/</kbd></div>
                  <div className="flex justify-between gap-4"><span>Delete Layer:</span><kbd className="bg-foreground/5 border border-border px-1.5 py-0.2 rounded font-mono">Backspace</kbd></div>
                </div>

                {/* Detailed Shortcuts Overlay */}
                <AnimatePresence>
                  {showShortcutsTray && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6"
                      onClick={() => setShowShortcutsTray(false)}
                    >
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="glass-panel p-8 rounded-3xl max-w-sm w-full relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                          <h3 className="text-md font-black uppercase text-slate-100 flex items-center gap-2">
                            <HelpCircle className="text-weave-violet" size={16} /> Keyboard Shortcuts
                          </h3>
                          <button
                            onClick={() => setShowShortcutsTray(false)}
                            className="text-[10px] uppercase text-slate-400 hover:text-white cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-xs py-1.5 border-b border-white/5">
                            <span className="text-slate-400">Spawn Layer Palette</span>
                            <kbd className="bg-white/5 border border-white/10 px-2.5 py-0.5 rounded font-mono text-[10px] text-weave-violet font-bold">Space / Tab</kbd>
                          </div>
                          <div className="flex justify-between items-center text-xs py-1.5 border-b border-white/5">
                            <span className="text-slate-400">Save Active Sandbox</span>
                            <kbd className="bg-white/5 border border-white/10 px-2.5 py-0.5 rounded font-mono text-[10px] text-weave-blue font-bold">Ctrl + S</kbd>
                          </div>
                          <div className="flex justify-between items-center text-xs py-1.5 border-b border-white/5">
                            <span className="text-slate-400">Delete Selected Node</span>
                            <kbd className="bg-white/5 border border-white/10 px-2.5 py-0.5 rounded font-mono text-[10px] text-weave-teal font-bold">Backspace / Del</kbd>
                          </div>
                          <div className="flex justify-between items-center text-xs py-1.5 border-b border-white/5">
                            <span className="text-slate-400">Focus Search bar</span>
                            <kbd className="bg-white/5 border border-white/10 px-2.5 py-0.5 rounded font-mono text-[10px] text-weave-amber font-bold">/</kbd>
                          </div>
                          <div className="flex justify-between items-center text-xs py-1.5">
                            <span className="text-slate-400">Toggle this helper</span>
                            <kbd className="bg-white/5 border border-white/10 px-2.5 py-0.5 rounded font-mono text-[10px] text-slate-300 font-bold">?</kbd>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                      color: 'var(--primary)',
                    }
                  }}
                  snapToGrid={true}
                  snapGrid={[15, 15]}
                  fitView
                >
                  <Background color="var(--border)" gap={20} size={1} />
                  <Controls className="bg-card border border-border rounded-xl overflow-hidden [&>button]:border-border [&>button]:text-foreground [&>button]:bg-transparent hover:[&>button]:bg-foreground/5 [&>svg]:fill-white" />
                  <MiniMap
                    className="!bg-card border border-border rounded-xl overflow-hidden shadow-2xl !bottom-4 !left-4 !w-[150px] !h-[100px]"
                    nodeColor="#1a1a24"
                    maskColor="rgba(0, 0, 0, 0.4)"
                    nodeStrokeColor="var(--primary)"
                    nodeBorderRadius={4}
                  />
                </ReactFlow>
              </div>

              {/* Collapsible Live PyTorch Code Panel */}
              <div className="flex h-full select-none relative shrink-0">
                <button
                  onClick={() => setCodePanelCollapsed(v => !v)}
                  className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card hover:bg-sidebar border border-border rounded-full p-1.5 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer z-40 text-muted-foreground hover:text-foreground"
                >
                  {codePanelCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>

                <AnimatePresence initial={false}>
                  {!codePanelCollapsed && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 420, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 180 }}
                      className="h-full border-l border-border bg-card/65 backdrop-blur-md flex flex-col overflow-hidden text-foreground w-[420px]"
                    >
                      {/* Header */}
                      <div className="p-4 border-b border-border shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Code2 size={15} className="text-primary animate-pulse" />
                          <span className="text-xs font-black uppercase tracking-wider text-foreground">
                            Live PyTorch Code
                          </span>
                        </div>
                        
                        {isCompilingLiveCode ? (
                          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-primary tracking-widest">
                            <Loader2 size={10} className="animate-spin" />
                            <span>Compiling...</span>
                          </div>
                        ) : (
                          <button
                            onClick={handleCopyLiveCode}
                            className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors focus:outline-none bg-transparent border-0 cursor-pointer"
                          >
                            {copiedLiveCode ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                            <span>{copiedLiveCode ? 'Copied' : 'Copy'}</span>
                          </button>
                        )}
                      </div>

                      {/* Code Area */}
                      <div className="flex-1 overflow-auto p-4 font-mono text-[10px] leading-relaxed relative select-text scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                        <pre className="language-python text-foreground/90 whitespace-pre-wrap select-text p-0 m-0 bg-transparent">
                          <code
                            className="language-python"
                            dangerouslySetInnerHTML={{ __html: highlightedLiveCode }}
                          />
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        ) : activeTab === 'dataset' ? (
          <DatasetWorkspace />
        ) : (
          <TokenizerWorkspace />
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
            <TrainingPanel onClose={() => setShowTrainingConsole(false)} />
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
              className="w-full max-w-[400px] bg-card border border-border p-6 rounded-2xl shadow-2xl relative"
            >
              <h2 className="text-xl font-black mb-1 text-foreground uppercase">New Graph variant</h2>
              <p className="text-xs text-muted-foreground mb-4">Initialize a new subgraph revision/variant for model mapping.</p>

              <form onSubmit={handleCreateSubGraph} className="space-y-4">
                <input
                  type="text"
                  placeholder="e.g. ResNet V2 Convolution"
                  value={newSubGraphName}
                  onChange={(e) => setNewSubGraphName(e.target.value)}
                  required
                  className="w-full h-11 bg-background border border-border p-3 text-sm rounded-xl outline-none focus:border-primary text-foreground"
                />

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSubGraphPrompt(false)}
                    className="flex-1 h-11 border-border rounded-xl cursor-pointer"
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-11 bg-primary text-primary-foreground font-extrabold uppercase rounded-xl transition-all cursor-pointer"
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
              className="w-full max-w-[480px] bg-card border border-border rounded-2xl shadow-glow overflow-hidden flex flex-col max-h-[380px]"
            >
              {/* Search input header */}
              <div className="p-4 border-b border-border flex items-center gap-3">
                <Search className="text-primary/60 shrink-0 animate-pulse" size={18} />
                <input
                  type="text"
                  placeholder="Type to search and add layer... (or Space/Tab)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder-muted-foreground/50"
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
                    className="w-full p-2.5 hover:bg-primary/10 rounded-xl transition-all text-left text-xs font-bold text-foreground/85 hover:text-foreground uppercase flex items-center justify-between group cursor-pointer border-none bg-transparent"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                      <span>{type}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 group-hover:text-primary transition-all font-black tracking-widest">
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
