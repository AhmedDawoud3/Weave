import { useState, useEffect } from 'react';
import { Play, Pause, Square, BarChart2, BookOpen, Terminal, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useWeaveStore } from '../../store/useWeaveStore';
import { useTrainingStore } from '../../store/useTrainingStore';
import { useTrainingSSE } from '../../hooks/useTrainingSSE';
import { TrainingSetup } from './TrainingSetup';
import { MetricsView } from './MetricsView';
import { LogsTerminal } from './LogsTerminal';
import { InferencePanel } from './InferencePanel';

interface TrainingPanelProps {
  onClose?: () => void;
}

export function TrainingPanel({ onClose }: TrainingPanelProps) {
  const {
    validationStatus,
    datasetConfig,
    lossConfig,
    optimizerConfig,
    setLossConfig,
    setOptimizerConfig,
    datasetDownloadStatus,
    nodes
  } = useWeaveStore();

  const {
    isTraining,
    trainingStatus,
    activeRunId,
    startTraining,
    controlTraining,
    sseConnectionState
  } = useTrainingStore();

  // Establish SSE stream automatically if run ID is set
  useTrainingSSE(activeRunId);

  const calculateTotalParameters = (nodesList: any[]): number => {
    let total = 0;
    for (const node of nodesList) {
      const p = node.data?.params || {};
      const type = node.data?.type;
      
      if (type === 'Linear') {
        const inf = Number(p.in_features) || 0;
        const outf = Number(p.out_features) || 0;
        const bias = p.bias !== false;
        total += inf * outf + (bias ? outf : 0);
      } else if (type === 'Conv2d' || type === 'ConvTranspose2d') {
        const inc = Number(p.in_channels) || 0;
        const outc = Number(p.out_channels) || 0;
        const k = Number(p.kernel_size) || 0;
        const bias = p.bias !== false;
        total += inc * outc * k * k + (bias ? outc : 0);
      } else if (type === 'Conv1d') {
        const inc = Number(p.in_channels) || 0;
        const outc = Number(p.out_channels) || 0;
        const k = Number(p.kernel_size) || 0;
        const bias = p.bias !== false;
        total += inc * outc * k + (bias ? outc : 0);
      } else if (type === 'Embedding') {
        const numEmb = Number(p.num_embeddings) || 0;
        const embDim = Number(p.embedding_dim) || 0;
        total += numEmb * embDim;
      } else if (type === 'BatchNorm2d' || type === 'BatchNorm1d') {
        const numF = Number(p.num_features) || 0;
        total += numF * 2;
      } else if (type === 'LayerNorm') {
        const shape = p.normalized_shape;
        let size = 0;
        if (Array.isArray(shape)) {
          size = shape.reduce((acc, v) => acc * (Number(v) || 1), 1);
        } else {
          size = Number(shape) || 0;
        }
        total += size * 2;
      } else if (type === 'GroupNorm') {
        const numC = Number(p.num_channels) || 0;
        total += numC * 2;
      }
    }
    return total;
  };

  const paramCount = calculateTotalParameters(nodes);

  const [activeTab, setActiveTab] = useState<'config' | 'metrics' | 'logs' | 'inference'>('config');

  // Local config form states
  const [optimizer, setOptimizer] = useState('AdamW');
  const [learningRate, setLearningRate] = useState(0.001);
  const [scheduler, setScheduler] = useState('CosineAnnealingLR');
  const [epochs, setEpochs] = useState(5);
  const [lossFunction, setLossFunction] = useState('CrossEntropyLoss');

  // Sync with store-level training config when changed
  useEffect(() => {
    if (optimizerConfig) {
      setOptimizer(optimizerConfig.optimizer_type || 'AdamW');
      setLearningRate(optimizerConfig.lr ?? 0.001);
      setScheduler(optimizerConfig.scheduler_type || 'CosineAnnealingLR');
      setEpochs(optimizerConfig.epochs ?? 5);
    }
    if (lossConfig) {
      setLossFunction(lossConfig.loss_type || 'CrossEntropyLoss');
    }
  }, [optimizerConfig, lossConfig]);

  // When form states change, save them back to the store
  const handleOptimizerChange = (val: string) => {
    setOptimizer(val);
    setOptimizerConfig({
      optimizer_type: val,
      lr: learningRate,
      scheduler_type: scheduler,
      epochs: epochs
    });
  };

  const handleLearningRateChange = (val: number) => {
    setLearningRate(val);
    setOptimizerConfig({
      optimizer_type: optimizer,
      lr: val,
      scheduler_type: scheduler,
      epochs: epochs
    });
  };

  const handleSchedulerChange = (val: string) => {
    setScheduler(val);
    setOptimizerConfig({
      optimizer_type: optimizer,
      lr: learningRate,
      scheduler_type: val,
      epochs: epochs
    });
  };

  const handleEpochsChange = (val: number) => {
    setEpochs(val);
    setOptimizerConfig({
      optimizer_type: optimizer,
      lr: learningRate,
      scheduler_type: scheduler,
      epochs: val
    });
  };

  const handleLossChange = (val: string) => {
    setLossFunction(val);
    setLossConfig({
      loss_type: val
    });
  };

  // Dataset checks
  const isDatasetConfigured = !!datasetConfig;
  const isPredefined = datasetConfig?.source === 'predefined';
  const isDownloaded = isPredefined
    ? !!(datasetConfig && datasetDownloadStatus[(datasetConfig as any).name] === 'downloaded')
    : true;
  const isDatasetReady = isDatasetConfigured && isDownloaded;

  const handleStartRun = async () => {
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
        device: 'cpu'
      }
    };
    try {
      await startTraining(config);
      setActiveTab('metrics');
    } catch (e) {
      console.error('Start training error:', e);
    }
  };

  const getSseBadgeColor = () => {
    switch (sseConnectionState) {
      case 'connected':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'connecting':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse';
      case 'error':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:
        return 'bg-foreground/5 text-muted-foreground border border-foreground/10';
    }
  };

  return (
    <div className="bg-card/90 backdrop-blur-2xl border-t border-border flex flex-col h-[380px] select-none text-foreground overflow-hidden relative">
      {/* Tab Header */}
      <div className="flex justify-between items-center px-6 border-b border-border shrink-0 h-14 bg-background/50">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider py-4 border-b-2 transition-all cursor-pointer ${
              activeTab === 'config' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen size={14} /> Training Setup
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider py-4 border-b-2 transition-all cursor-pointer ${
              activeTab === 'metrics' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart2 size={14} /> Metrics Real-Time
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider py-4 border-b-2 transition-all cursor-pointer ${
              activeTab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Terminal size={14} /> stdout Console
          </button>
          <button
            onClick={() => setActiveTab('inference')}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider py-4 border-b-2 transition-all cursor-pointer ${
              activeTab === 'inference' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles size={14} className="text-primary animate-pulse" /> Inference Tester
          </button>
        </div>

        {/* Status / Control actions */}
        <div className="flex items-center gap-3">
          {activeRunId && (
            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded ${getSseBadgeColor()}`}>
              SSE: {sseConnectionState}
            </span>
          )}

          {validationStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg mr-4">
              <AlertTriangle size={14} />
              <span>Compilation Mismatch</span>
            </div>
          )}

          {paramCount > 20000000 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg mr-4">
              <AlertTriangle size={14} className="text-amber-400 animate-pulse" />
              <span>Cap Exceeded ({ (paramCount / 1000000).toFixed(1) }M)</span>
            </div>
          )}

          {trainingStatus === 'running' ? (
            <>
              <Button
                onClick={() => controlTraining('pause')}
                className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold h-9 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Pause size={14} /> PAUSE
              </Button>
              <Button
                onClick={() => controlTraining('stop')}
                className="bg-red-600 hover:bg-red-500 text-white font-bold h-9 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Square size={14} /> ABORT
              </Button>
            </>
          ) : trainingStatus === 'paused' ? (
            <>
              <Button
                onClick={() => controlTraining('resume')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Play size={14} /> RESUME
              </Button>
              <Button
                onClick={() => controlTraining('stop')}
                className="bg-red-600 hover:bg-red-500 text-white font-bold h-9 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Square size={14} /> ABORT
              </Button>
            </>
          ) : (
            <Button
              onClick={handleStartRun}
              disabled={validationStatus !== 'success' || isTraining || !isDatasetReady || paramCount > 20000000}
              className="bg-primary hover:brightness-110 text-primary-foreground font-black h-9 px-6 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-glow"
            >
              {isTraining ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              START TRAINING
            </Button>
          )}

          {onClose && (
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground border border-border hover:bg-foreground/5 rounded-xl h-9 px-3 text-xs font-bold cursor-pointer"
            >
              CLOSE
            </Button>
          )}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 p-6 overflow-y-auto min-h-0 bg-background">
        {activeTab === 'config' && (
          <>
            {paramCount > 20000000 && (
              <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-amber-400 font-bold select-none">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0 text-amber-400" />
                  <div>
                    <span className="font-extrabold uppercase text-[#40d3b6]">20M Parameter Cap Exceeded:</span>
                    <span className="font-normal text-muted-foreground ml-1">
                      This model has { (paramCount / 1000000).toFixed(1) }M parameters. Training is blocked.
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-black bg-white/5 border border-border rounded-lg px-3 py-1">
                  Use EXPORT button on the top header instead
                </div>
              </div>
            )}
            <TrainingSetup
            optimizer={optimizer}
            setOptimizer={handleOptimizerChange}
            learningRate={learningRate}
            setLearningRate={handleLearningRateChange}
            scheduler={scheduler}
            setScheduler={handleSchedulerChange}
            epochs={epochs}
            setEpochs={handleEpochsChange}
            lossFunction={lossFunction}
            setLossFunction={handleLossChange}
          />
          </>
        )}
        {activeTab === 'metrics' && (
          <MetricsView epochs={epochs} />
        )}
        {activeTab === 'logs' && (
          <LogsTerminal />
        )}
        {activeTab === 'inference' && (
          <InferencePanel />
        )}
      </div>
    </div>
  );
}
