import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, BarChart2, BookOpen, Terminal, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWeaveStore } from '../store/useWeaveStore';

interface TrainingConsoleProps {
  onClose?: () => void;
}

export function TrainingConsole({ onClose }: TrainingConsoleProps) {
  const {
    validationStatus,
    nodeShapes,
    // Training State
    isTraining,
    trainingStatus,
    epochMetrics,
    stepMetrics,
    trainingLogs,
    suggestedLoss,
    suggestedLossAlternatives,
    lrPreview,
    startTraining,
    controlTraining,
    getLossSuggestion,
    getLRSchedulePreview,
    inferredDatasetShape,
    getFormattedGraph,
    datasetConfig,
    datasetDownloadStatus,
    setActiveTab: setStoreTab
  } = useWeaveStore();

  const [activeTab, setActiveTab] = useState<'config' | 'metrics' | 'logs' | 'inference'>('config');

  // Inference local state
  const [checkpointPath, setCheckpointPath] = useState('data/checkpoints/best.pt');
  const [inferenceInput, setInferenceInput] = useState('');
  const [inferenceLoading, setInferenceLoading] = useState(false);
  const [inferenceResult, setInferenceResult] = useState<any | null>(null);
  const [inferenceError, setInferenceError] = useState<string | null>(null);

  const generatePresetInput = (type: 'random' | 'zeros' | 'ones') => {
    let inputShape = inferredDatasetShape || [3, 224, 224];
    const totalSize = inputShape.reduce((a, b) => a * b, 1);
    
    let values: number[] = [];
    if (type === 'random') {
      values = Array.from({ length: totalSize }, () => Math.random());
    } else if (type === 'zeros') {
      values = Array.from({ length: totalSize }, () => 0);
    } else if (type === 'ones') {
      values = Array.from({ length: totalSize }, () => 1);
    }

    setInferenceInput(JSON.stringify([values]));
  };

  const handleRunInference = async () => {
    setInferenceLoading(true);
    setInferenceError(null);
    setInferenceResult(null);
    try {
      let parsedInput: number[][];
      try {
        parsedInput = JSON.parse(inferenceInput);
        if (!Array.isArray(parsedInput) || !Array.isArray(parsedInput[0])) {
          throw new Error("Input must be a 2D JSON array, e.g. [[1.0, 2.0, ...]]");
        }
      } catch (e: any) {
        const values = inferenceInput.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        if (values.length === 0) {
          throw new Error("Unable to parse inputs. Please enter a valid comma-separated list or JSON 2D array.");
        }
        parsedInput = [values];
      }

      const formattedGraph = getFormattedGraph();
      const res = await fetch(`${import.meta.env.VITE_ENGINE_URL || 'http://localhost:8000'}/inference/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graph: formattedGraph,
          checkpoint_path: checkpointPath,
          input: parsedInput
        })
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }
      
      const data = await res.json();
      if (data.status === 'success') {
        setInferenceResult(data);
      } else {
        setInferenceError(data.message || 'Inference execution failed.');
      }
    } catch (err: any) {
      setInferenceError(err.message || 'Inference call failed.');
    } finally {
      setInferenceLoading(false);
    }
  };

  // Local Form state
  const [optimizer, setOptimizer] = useState('AdamW');
  const [learningRate, setLearningRate] = useState(0.001);
  const [scheduler, setScheduler] = useState('CosineAnnealingLR');
  const [epochs, setEpochs] = useState(5);
  const [lossFunction, setLossFunction] = useState('CrossEntropyLoss');

  // Dataset readiness checks
  const isDatasetConfigured = !!datasetConfig;
  const isPredefined = datasetConfig?.source === 'predefined';
  const isDownloaded = isPredefined ? (datasetConfig && datasetDownloadStatus[(datasetConfig as any).name] === 'downloaded') : true;
  const isDatasetReady = isDatasetConfigured && isDownloaded;

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto Scroll Terminal to bottom
  useEffect(() => {
    if (activeTab === 'logs' && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [trainingLogs, activeTab]);

  // Retrieve suggested loss when final output shape changes
  const outputShape = nodeShapes['output'];
  useEffect(() => {
    if (outputShape && outputShape.length > 0) {
      // Guess task type based on output dimensions
      const lastDim = outputShape[outputShape.length - 1];
      const task = lastDim === 1 ? 'regression' : 'classification';
      const finalAct = lastDim === 1 ? 'none' : 'softmax';
      getLossSuggestion(outputShape, finalAct, task);
    }
  }, [outputShape, getLossSuggestion]);

  // Update LR preview on change
  useEffect(() => {
    getLRSchedulePreview(optimizer, learningRate, scheduler, epochs);
  }, [optimizer, learningRate, scheduler, epochs, getLRSchedulePreview]);

  // Start executing the training runner config
  const handleStartRun = () => {
    const config = {
      optimizer_config: {
        optimizer_type: optimizer,
        lr: learningRate,
        weight_decay: 0.01,
        scheduler_type: scheduler
      },
      loss_config: {
        loss_type: lossFunction
      },
      training_settings: {
        epochs: epochs,
        device: "cpu" // Dev cpu mode
      }
    };
    startTraining(config);
    setActiveTab('metrics');
  };

  // Helper to render an SVG sparkline for LR Schedule
  const renderLRSparkline = () => {
    if (!lrPreview || lrPreview.length === 0) return null;
    const width = 280;
    const height = 40;
    const padding = 5;
    
    const maxVal = Math.max(...lrPreview);
    const minVal = Math.min(...lrPreview);
    const range = maxVal - minVal || 1;

    const points = lrPreview.map((val, idx) => {
      const x = padding + (idx / (lrPreview.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="bg-background/20 rounded-lg border border-primary/5">
        <polyline
          fill="none"
          stroke="#1e8fd3"
          strokeWidth="2"
          points={points}
        />
      </svg>
    );
  };

  // Helper to render training metric SVG charts
  const renderMetricsChart = () => {
    if (epochMetrics.length === 0 && stepMetrics.length === 0) {
      return (
        <div className="h-44 bg-background/25 border border-primary/5 rounded-xl flex items-center justify-center text-xs text-muted-foreground/40 font-bold uppercase select-none">
          Waiting for training indicators...
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const padding = 20;

    // Loss Sparkline from Epoch metrics (or steps if empty)
    const pointsData = epochMetrics.length > 0 ? epochMetrics : stepMetrics;
    const losses = pointsData.map(d => {
      const val = d.metrics?.train_loss ?? d.metrics?.loss ?? d.loss;
      return val !== undefined && val !== null ? val : 0;
    });
    const accuracies = epochMetrics.map(d => {
      const val = d.metrics?.val_accuracy ?? d.metrics?.train_accuracy ?? d.metrics?.accuracy ?? d.accuracy;
      if (val !== undefined && val !== null) {
        return val > 1.0 ? val / 100.0 : val;
      }
      return 0;
    });

    const maxLoss = Math.max(...losses, 1);
    const minLoss = Math.min(...losses, 0);
    const lossRange = maxLoss - minLoss || 1;

    const lossPoints = losses.map((val, idx) => {
      const x = padding + (idx / (losses.length - 1 || 1)) * (width - padding * 2);
      const y = height - padding - ((val - minLoss) / lossRange) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Loss chart */}
        <div className="bg-background/25 p-4 rounded-xl border border-primary/5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Loss Curve</span>
            <span className="text-xs font-bold text-primary">{losses[losses.length - 1]?.toFixed(4) || '0.00'}</span>
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              points={lossPoints}
            />
          </svg>
        </div>

        {/* Accuracy chart */}
        <div className="bg-background/25 p-4 rounded-xl border border-primary/5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Validation Accuracy</span>
            <span className="text-xs font-bold text-emerald-400">
              {accuracies.length > 0 ? `${(accuracies[accuracies.length - 1] * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
          {accuracies.length > 1 ? (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                points={accuracies.map((val, idx) => {
                  const x = padding + (idx / (accuracies.length - 1)) * (width - padding * 2);
                  const y = height - padding - val * (height - padding * 2);
                  return `${x},${y}`;
                }).join(' ')}
              />
            </svg>
          ) : (
            <div className="h-32 flex items-center justify-center text-[10px] text-muted-foreground/30 uppercase font-bold tracking-widest select-none">
              Requires 2+ completed epochs
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card/30 backdrop-blur-2xl border-t border-primary/10 flex flex-col h-[380px] select-none text-white overflow-hidden relative">
      {/* Console Tab Header */}
      <div className="flex justify-between items-center px-6 border-b border-primary/10 shrink-0 h-14">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider py-4 border-b-2 transition-all ${
              activeTab === 'config' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white'
            }`}
          >
            <BookOpen size={14} /> Training Setup
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider py-4 border-b-2 transition-all ${
              activeTab === 'metrics' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white'
            }`}
          >
            <BarChart2 size={14} /> Metrics Real-Time
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider py-4 border-b-2 transition-all ${
              activeTab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white'
            }`}
          >
            <Terminal size={14} /> stdout Console
          </button>
          <button
            onClick={() => setActiveTab('inference')}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider py-4 border-b-2 transition-all ${
              activeTab === 'inference' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white'
            }`}
          >
            <Sparkles size={14} className="text-[#40d3b6]" /> Inference Tester
          </button>
        </div>

        {/* Play/Control panel buttons */}
        <div className="flex items-center gap-3">
          {validationStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg mr-4">
              <AlertTriangle size={14} />
              <span>Compilation Mismatch</span>
            </div>
          )}

          {trainingStatus === 'running' ? (
            <>
              <Button
                onClick={() => controlTraining('pause')}
                className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold h-9 px-4 rounded-xl flex items-center gap-1.5"
              >
                <Pause size={14} /> PAUSE
              </Button>
              <Button
                onClick={() => controlTraining('stop')}
                className="bg-red-600 hover:bg-red-500 text-white font-bold h-9 px-4 rounded-xl flex items-center gap-1.5"
              >
                <Square size={14} /> ABORT
              </Button>
            </>
          ) : trainingStatus === 'paused' ? (
            <>
              <Button
                onClick={() => controlTraining('resume')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-4 rounded-xl flex items-center gap-1.5"
              >
                <Play size={14} /> RESUME
              </Button>
              <Button
                onClick={() => controlTraining('stop')}
                className="bg-red-600 hover:bg-red-500 text-white font-bold h-9 px-4 rounded-xl flex items-center gap-1.5"
              >
                <Square size={14} /> ABORT
              </Button>
            </>
          ) : (
            <Button
              onClick={handleStartRun}
              disabled={validationStatus !== 'success' || isTraining || !isDatasetReady}
              className="bg-gradient-to-r from-[#40d3b6] to-[#1e8fd3] text-black font-extrabold h-9 px-6 rounded-xl flex items-center gap-1.5"
            >
              {isTraining ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              START TRAINING
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-muted-foreground hover:text-white border border-primary/5 hover:bg-primary/10 rounded-xl h-9 px-3 text-xs font-bold"
            >
              CLOSE
            </Button>
          )}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 p-6 overflow-y-auto min-h-0 bg-[#09090b]">
        {activeTab === 'config' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm max-w-5xl">
            {/* Optimizer & LR scheduler setup */}
            <div className="space-y-4">
              <h3 className="text-xs text-primary font-black uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles size={12} /> Optimization Engine
              </h3>
              
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">Optimizer Type</Label>
                <Select value={optimizer} onValueChange={setOptimizer}>
                  <SelectTrigger className="bg-background/40 border-primary/10 rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e11] border-primary/10 text-white">
                    <SelectItem value="AdamW">AdamW (Recommended)</SelectItem>
                    <SelectItem value="Adam">Adam</SelectItem>
                    <SelectItem value="SGD">SGD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Learning Rate</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={learningRate}
                    onChange={(e) => setLearningRate(Number(e.target.value))}
                    className="bg-background/40 border-primary/10 rounded-xl h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Epochs</Label>
                  <Input
                    type="number"
                    value={epochs}
                    onChange={(e) => setEpochs(Number(e.target.value))}
                    className="bg-background/40 border-primary/10 rounded-xl h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">LR Scheduler</Label>
                <Select value={scheduler} onValueChange={setScheduler}>
                  <SelectTrigger className="bg-background/40 border-primary/10 rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e11] border-primary/10 text-white">
                    <SelectItem value="CosineAnnealingLR">Cosine Annealing</SelectItem>
                    <SelectItem value="StepLR">Step Decay</SelectItem>
                    <SelectItem value="None">Static Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Suggested Loss functions based on shapes */}
            <div className="space-y-4">
              <h3 className="text-xs text-primary font-black uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles size={12} /> Loss Objective
              </h3>

              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">Loss Function</Label>
                <Select value={lossFunction} onValueChange={setLossFunction}>
                  <SelectTrigger className="bg-background/40 border-primary/10 rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e11] border-primary/10 text-white">
                    <SelectItem value="CrossEntropyLoss">CrossEntropyLoss</SelectItem>
                    <SelectItem value="MSELoss">MSELoss (Regression)</SelectItem>
                    <SelectItem value="BCELoss">BCELoss (Binary)</SelectItem>
                    <SelectItem value="NLLLoss">NLLLoss</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {suggestedLoss && (
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                    <Sparkles size={10} /> Smart Advice
                  </div>
                  <p className="text-xs leading-normal">
                    Based on output shape <span className="font-bold text-primary">[{outputShape?.join(', ')}]</span>, Weave suggests using <span className="font-bold text-[#40d3b6]">{suggestedLoss}</span>.
                  </p>
                  {suggestedLossAlternatives.length > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Alternatives: {suggestedLossAlternatives.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Scheduler path decay visualization */}
            <div className="space-y-4">
              <h3 className="text-xs text-primary font-black uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles size={12} /> LR Schedule Path
              </h3>
              
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Visualization of decay rate mapping initial rate of {learningRate} down across {epochs} steps using {scheduler}.
                </p>
                {renderLRSparkline()}
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">
                  Configured Dataset
                </Label>
                {datasetConfig ? (
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-white uppercase tracking-wider">
                          {datasetConfig.source === 'predefined' ? (datasetConfig as any).name : `${datasetConfig.source} source`}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {datasetConfig.source === 'predefined' ? 'Predefined torchvision dataset' : 'Local folder / Custom'}
                        </span>
                      </div>
                      
                      {isPredefined && (
                        <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded ${
                          isDownloaded 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {isDownloaded ? 'Downloaded' : 'Not Ready'}
                        </span>
                      )}
                    </div>

                    {!isDownloaded && (
                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 space-y-2 select-none">
                        <p className="text-[9px] text-amber-400 leading-normal font-medium">
                          ⚠️ The selected dataset is not downloaded yet. Please download it from the Dataset panel before starting.
                        </p>
                        <Button
                          onClick={() => setStoreTab('dataset')}
                          className="h-6 w-full text-[9px] bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-md"
                        >
                          Go to Dataset Panel
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl space-y-2 select-none">
                    <p className="text-[9px] text-red-400 leading-normal font-medium">
                      ❌ No dataset is configured. You must set up a dataset before training.
                    </p>
                    <Button
                      onClick={() => setStoreTab('dataset')}
                      className="h-6 w-full text-[9px] bg-[#ef4444] hover:bg-red-600 text-white font-extrabold rounded-md"
                    >
                      Configure Dataset
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="space-y-6 max-w-5xl">
            {/* Run summary headers */}
            {trainingStatus !== 'idle' && (
              <div className="flex gap-8 items-center bg-primary/5 border border-primary/10 rounded-xl p-4 text-xs font-bold uppercase tracking-wider select-none shrink-0">
                <div>
                  <span className="text-muted-foreground mr-2 text-[10px]">Status:</span>
                  <span className={`px-2 py-1.5 rounded-lg text-[10px] font-black ${
                    trainingStatus === 'running' 
                      ? 'bg-primary/20 text-primary border border-primary/30' 
                      : trainingStatus === 'paused'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'bg-muted/20 text-white border border-white/10'
                  }`}>
                    {trainingStatus}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground mr-2 text-[10px]">Epoch:</span>
                  <span className="text-white">{epochMetrics.length} / {epochs}</span>
                </div>
                <div>
                  <span className="text-muted-foreground mr-2 text-[10px]">Active Steps:</span>
                  <span className="text-white">{stepMetrics.length}</span>
                </div>
              </div>
            )}
            
            {renderMetricsChart()}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="h-full bg-black/40 border border-primary/10 rounded-xl p-4 font-mono text-xs overflow-y-auto flex flex-col gap-1.5 text-foreground/80 scroll-smooth">
            {trainingLogs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground/30 text-[10px] uppercase tracking-widest select-none">
                No logs recorded yet. Build graph & click training to initiate logs.
              </div>
            ) : (
              trainingLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed break-all">
                  <span className="text-[#40d3b6] select-none mr-2">&gt;</span> {log}
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        )}

        {activeTab === 'inference' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm max-w-5xl h-full select-none">
            {/* Input Config Panel */}
            <div className="space-y-4 text-left overflow-y-auto pr-2">
              <h3 className="text-xs text-primary font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#40d3b6]" /> Predict Input Parameters
              </h3>

              <div className="space-y-1.5 flex flex-col">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">Model Checkpoint Path</Label>
                <Input
                  type="text"
                  value={checkpointPath}
                  onChange={(e) => setCheckpointPath(e.target.value)}
                  className="bg-background/40 border-primary/10 rounded-xl h-10 text-xs text-white"
                  placeholder="e.g. data/checkpoints/best.pt"
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Input Values (2D JSON or CSV)</Label>
                  <span className="text-[9px] text-[#40d3b6] font-mono">
                    Expected shape: {inferredDatasetShape ? `[1, ${inferredDatasetShape.join(', ')}]` : 'Any'}
                  </span>
                </div>
                <textarea
                  value={inferenceInput}
                  onChange={(e) => setInferenceInput(e.target.value)}
                  rows={4}
                  className="w-full text-xs font-mono bg-[#050508]/80 border border-primary/10 rounded-xl p-3.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                  placeholder="[[1.0, 1.0, 1.0...]] or comma-separated numbers"
                />

                {/* Preset Actions */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => generatePresetInput('random')}
                    className="px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/15 hover:bg-primary/20 text-[#40d3b6] hover:text-white transition-all text-[9px] font-black uppercase tracking-wider cursor-pointer"
                  >
                    🎲 Random Noise
                  </button>
                  <button
                    onClick={() => generatePresetInput('zeros')}
                    className="px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/15 hover:bg-primary/20 text-[#40d3b6] hover:text-white transition-all text-[9px] font-black uppercase tracking-wider cursor-pointer"
                  >
                    All Zeros
                  </button>
                  <button
                    onClick={() => generatePresetInput('ones')}
                    className="px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/15 hover:bg-primary/20 text-[#40d3b6] hover:text-white transition-all text-[9px] font-black uppercase tracking-wider cursor-pointer"
                  >
                    All Ones
                  </button>
                </div>
              </div>

              <Button
                onClick={handleRunInference}
                disabled={inferenceLoading}
                className="w-full mt-4 bg-gradient-to-r from-[#40d3b6] to-primary hover:opacity-95 text-black font-extrabold px-6 rounded-xl flex items-center justify-center gap-2 h-11"
              >
                {inferenceLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                RUN PREDICTIVE INFERENCE
              </Button>
            </div>

            {/* Visual Output Panel */}
            <div className="space-y-4 text-left overflow-y-auto pr-2">
              <h3 className="text-xs text-primary font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BarChart2 size={13} /> Evaluation Output
              </h3>

              <div className="bg-[#050508]/40 border border-primary/10 rounded-xl p-4 min-h-[200px] flex flex-col justify-center select-text">
                {inferenceError && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg leading-relaxed font-mono">
                    ❌ Evaluation Error:<br />
                    {inferenceError}
                  </div>
                )}

                {inferenceResult && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase font-black tracking-wider border-b border-primary/10 pb-1.5">
                      <span>Status: {inferenceResult.status}</span>
                      <span>Output Shape: [{inferenceResult.output_shape?.join(', ')}]</span>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-[#40d3b6] uppercase tracking-wider">Predictions:</div>
                      <pre className="p-3 bg-black/40 border border-primary/5 rounded-xl text-[10px] overflow-x-auto text-white leading-relaxed max-h-[160px] overflow-y-auto">
                        {JSON.stringify(inferenceResult.prediction, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {!inferenceResult && !inferenceError && (
                  <div className="text-center text-muted-foreground/30 text-[10px] uppercase font-bold tracking-widest py-8">
                    Waiting for evaluation run...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
