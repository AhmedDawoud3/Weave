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
    getLRSchedulePreview
  } = useWeaveStore();

  const [activeTab, setActiveTab] = useState<'config' | 'metrics' | 'logs'>('config');

  // Local Form state
  const [dataset, setDataset] = useState('MNIST');
  const batchSize = 32;
  const [optimizer, setOptimizer] = useState('AdamW');
  const [learningRate, setLearningRate] = useState(0.001);
  const [scheduler, setScheduler] = useState('CosineAnnealingLR');
  const [epochs, setEpochs] = useState(5);
  const [lossFunction, setLossFunction] = useState('CrossEntropyLoss');

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
      dataset_config: {
        dataset_name: dataset,
        train_transforms: [
          { type: "Resize", size: [28, 28] },
          { type: "ToTensor" },
          { type: "Normalize", mean: [0.1307], std: [0.3081] }
        ]
      },
      dataloader_config: {
        batch_size: batchSize,
        shuffle: true,
        num_workers: 2
      },
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
    const losses = pointsData.map(d => d.loss !== undefined ? d.loss : 0);
    const accuracies = epochMetrics.map(d => d.accuracy !== undefined ? d.accuracy : 0);

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
              disabled={validationStatus !== 'success' || isTraining}
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

              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">Dataset Catalog</Label>
                <Select value={dataset} onValueChange={setDataset}>
                  <SelectTrigger className="bg-background/40 border-primary/10 rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e11] border-primary/10 text-white">
                    <SelectItem value="MNIST">MNIST Digits (Images)</SelectItem>
                    <SelectItem value="CIFAR10">CIFAR-10 Objects</SelectItem>
                    <SelectItem value="Custom">Custom ImageFolder</SelectItem>
                  </SelectContent>
                </Select>
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
      </div>
    </div>
  );
}
