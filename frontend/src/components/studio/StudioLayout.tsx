import { useState, useRef, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Workflow } from 'lucide-react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import DatasetPanel, { type DatasetConfig } from './DatasetPanel';
import ModelCanvas, { type ModelCanvasHandle } from './ModelCanvas';
import OptimizerPanel, { type OptimizerConfig } from './OptimizerPanel';
import LossPanel, { type LossConfig } from './LossPanel';
import TrainingPanel from './TrainingPanel';
import { useTrainingStore, parseTrainingOutput } from '../../store/trainingStore';

/**
 * StudioLayout - Main parent component for the No-Code Deep Learning Studio
 *
 * State Management Strategy:
 * - modelState: Managed internally by React Flow (nodes, edges, onConnect) in ModelCanvas
 * - pipelineState: Plain React state for the side panels (dataset config, optimizer config, loss config)
 *
 * Layout Structure (3-Column Flexbox with Expandable Tabs):
 * - Left Panel (20-25%): DatasetPanel - Dataset Configuration form (expandable)
 * - Center Panel (50-60%): ModelCanvas - React Flow canvas for NN architecture
 * - Right Panel (20-25%): LossPanel + OptimizerPanel - Both with expandable tabs
 */

// Pipeline state type combining all configurations
interface PipelineState {
  dataset: DatasetConfig;
  optimizer: OptimizerConfig;
  loss: LossConfig;
}

// Track which panels are expanded
interface ExpandedPanels {
  dataset: boolean;
  loss: boolean;
  optimizer: boolean;
}

// Model I/O configuration
interface ModelIOConfig {
  inputPortCount: number;
  outputPortCount: number;
}

// Get runner base URL from environment or default to localhost
const getRunnerBaseUrl = (): string => {
  return import.meta.env.VITE_RUNNER_URL || 'http://localhost:8000';
};

function StudioLayout() {
  // Ref to access ModelCanvas nodes/edges
  const modelCanvasRef = useRef<ModelCanvasHandle>(null);
  
  // Training panel visibility
  const [isTrainingPanelOpen, setIsTrainingPanelOpen] = useState(false);
  
  // Convex action for code generation
  const generateCode = useAction(api.actions.generateCode);
  
  // Training store actions
  const { 
    updateBatchProgress, 
    updateEpochComplete, 
    addCheckpoint, 
    appendOutput,
    setError,
    stopTraining,
    setGeneratedCode,
  } = useTrainingStore();

  // pipelineState: Plain React state for side panel forms (NOT nodes)
  const [pipelineState, setPipelineState] = useState<PipelineState>({
    dataset: {
      datasetName: 'MNIST',
      customPath: '',
      batchSize: 32,
      shuffle: true,
      normalize: true,
      numWorkers: 4,
    },
    optimizer: {
      optimizerType: 'Adam',
      learningRate: 0.001,
      epochs: 5,
      weightDecay: 0,
      momentum: 0.9,
    },
    loss: {
      lossType: 'CrossEntropyLoss',
      customLossCode: '',
      reduction: 'mean',
      labelSmoothing: 0,
    },
  });

  // Track which panels are expanded
  const [expandedPanels, setExpandedPanels] = useState<ExpandedPanels>({
    dataset: true,
    loss: true,
    optimizer: true,
  });

  // Model I/O configuration
  const [modelIO, setModelIO] = useState<ModelIOConfig>({
    inputPortCount: 1,
    outputPortCount: 1,
  });

  // Toggle panel expansion
  const togglePanel = (panel: keyof ExpandedPanels) => {
    setExpandedPanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
  };

  // Handlers to update pipeline state
  const handleDatasetChange = (datasetConfig: DatasetConfig) => {
    setPipelineState((prev) => ({ ...prev, dataset: datasetConfig }));
  };

  const handleOptimizerChange = (optimizerConfig: OptimizerConfig) => {
    setPipelineState((prev) => ({ ...prev, optimizer: optimizerConfig }));
  };

  const handleLossChange = (lossConfig: LossConfig) => {
    setPipelineState((prev) => ({ ...prev, loss: lossConfig }));
  };

  // Open training panel
  const handleOpenTraining = useCallback(() => {
    setIsTrainingPanelOpen(true);
  }, []);

  // Handle training execution
  const handleStartTraining = useCallback(async () => {
    // Get current graph from ModelCanvas
    const graph = modelCanvasRef.current?.getGraph();
    if (!graph) {
      setError('Could not get model graph');
      return;
    }

    // Prepare config for code generation
    const config = {
      dataset: pipelineState.dataset.datasetName,
      batchSize: pipelineState.dataset.batchSize,
      optimizer: pipelineState.optimizer.optimizerType,
      learningRate: pipelineState.optimizer.learningRate,
      epochs: pipelineState.optimizer.epochs,
    };

    // Map nodes for Convex (strip React Flow specific data)
    const nodes = graph.nodes.map((node) => ({
      id: node.id,
      type: node.type || 'unknown',
      position: node.position,
      data: node.data,
    }));

    const edges = graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }));

    try {
      // Generate code via Convex action
      const code = await generateCode({ config, nodes, edges });
      setGeneratedCode(code);
      appendOutput(`Generated training code...\n`);

      // Send code to runner backend
      const runnerBaseUrl = getRunnerBaseUrl();
      const response = await fetch(`${runnerBaseUrl}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error(`Runner error: ${response.status}`);
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          
          appendOutput(line + '\n');
          
          // Parse structured output
          const { type, data } = parseTrainingOutput(line);
          
          if (type === 'batch') {
            updateBatchProgress({
              epoch: data.epoch as number,
              batch: data.batch as number,
              totalBatches: data.total_batches as number,
              loss: data.loss as number,
            });
          } else if (type === 'epoch') {
            updateEpochComplete({
              epoch: data.epoch as number,
              trainLoss: data.train_loss as number,
              trainAcc: data.train_acc as number,
              valLoss: data.val_loss as number | undefined,
              valAcc: data.val_acc as number | undefined,
              time: data.time as number,
            });
          } else if (type === 'checkpoint') {
            addCheckpoint({
              path: data.path as string,
              epoch: data.epoch as number,
              loss: data.loss as number,
              accuracy: data.accuracy as number | undefined,
              timestamp: data.timestamp as number || Date.now(),
            });
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        appendOutput(buffer + '\n');
      }

      stopTraining();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Training failed';
      setError(message);
      appendOutput(`Error: ${message}\n`);
    }
  }, [
    pipelineState,
    generateCode,
    appendOutput,
    updateBatchProgress,
    updateEpochComplete,
    addCheckpoint,
    setError,
    stopTraining,
    setGeneratedCode,
  ]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900">
      {/* Header */}
      <header className="h-14 border-b border-slate-700 flex items-center px-4 gap-2 shrink-0">
        <Workflow className="w-6 h-6 text-blue-500" />
        <h1 className="text-xl font-bold text-white">Weave Studio</h1>
        <span className="text-slate-400 text-sm ml-2">No-Code Deep Learning</span>
      </header>

      {/* Main Content - 3 Column Layout */}
      <main className="flex-1 flex min-h-0">
        {/* Left Panel (20-25%): Dataset Configuration Form with Expandable Tab */}
        <aside className="w-1/5 min-w-[260px] max-w-[320px] bg-slate-800 border-r border-slate-700 flex flex-col overflow-y-auto">
          <DatasetPanel
            config={pipelineState.dataset}
            onChange={handleDatasetChange}
            isExpanded={expandedPanels.dataset}
            onToggleExpand={() => togglePanel('dataset')}
          />
        </aside>

        {/* Center Panel (50-60%): Model Editor - React Flow Canvas */}
        <ReactFlowProvider>
          <ModelCanvas
            ref={modelCanvasRef}
            inputPortCount={modelIO.inputPortCount}
            outputPortCount={modelIO.outputPortCount}
            onInputPortCountChange={(count) => setModelIO((prev) => ({ ...prev, inputPortCount: count }))}
            onOutputPortCountChange={(count) => setModelIO((prev) => ({ ...prev, outputPortCount: count }))}
          />
        </ReactFlowProvider>

        {/* Right Panel (20-25%): Loss + Optimizer & Trainer Forms with Expandable Tabs */}
        <aside className="w-1/5 min-w-[260px] max-w-[320px] bg-slate-800 border-l border-slate-700 flex flex-col overflow-y-auto">
          <LossPanel
            config={pipelineState.loss}
            onChange={handleLossChange}
            isExpanded={expandedPanels.loss}
            onToggleExpand={() => togglePanel('loss')}
          />
          <OptimizerPanel
            config={pipelineState.optimizer}
            onChange={handleOptimizerChange}
            isExpanded={expandedPanels.optimizer}
            onToggleExpand={() => togglePanel('optimizer')}
            onStartTraining={handleOpenTraining}
          />
        </aside>
      </main>

      {/* Training Panel */}
      <TrainingPanel
        isOpen={isTrainingPanelOpen}
        onClose={() => setIsTrainingPanelOpen(false)}
        onStartTraining={handleStartTraining}
        totalEpochs={pipelineState.optimizer.epochs}
      />
    </div>
  );
}

export default StudioLayout;
