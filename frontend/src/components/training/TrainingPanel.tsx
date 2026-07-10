import { useState } from 'react';
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
    datasetDownloadStatus
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

  const [activeTab, setActiveTab] = useState<'config' | 'metrics' | 'logs' | 'inference'>('config');

  // Local config form states
  const [optimizer, setOptimizer] = useState('AdamW');
  const [learningRate, setLearningRate] = useState(0.001);
  const [scheduler, setScheduler] = useState('CosineAnnealingLR');
  const [epochs, setEpochs] = useState(5);
  const [lossFunction, setLossFunction] = useState('CrossEntropyLoss');

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
        return 'bg-white/5 text-muted-foreground border border-white/10';
    }
  };

  return (
    <div className="bg-card/90 backdrop-blur-2xl border-t border-border flex flex-col h-[380px] select-none text-white overflow-hidden relative">
      {/* Tab Header */}
      <div className="flex justify-between items-center px-6 border-b border-border shrink-0 h-14 bg-background/50">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider py-4 border-b-2 transition-all cursor-pointer ${
              activeTab === 'config' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white'
            }`}
          >
            <BookOpen size={14} /> Training Setup
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider py-4 border-b-2 transition-all cursor-pointer ${
              activeTab === 'metrics' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white'
            }`}
          >
            <BarChart2 size={14} /> Metrics Real-Time
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider py-4 border-b-2 transition-all cursor-pointer ${
              activeTab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white'
            }`}
          >
            <Terminal size={14} /> stdout Console
          </button>
          <button
            onClick={() => setActiveTab('inference')}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider py-4 border-b-2 transition-all cursor-pointer ${
              activeTab === 'inference' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white'
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
              disabled={validationStatus !== 'success' || isTraining || !isDatasetReady}
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
              className="text-muted-foreground hover:text-white border border-border hover:bg-white/5 rounded-xl h-9 px-3 text-xs font-bold cursor-pointer"
            >
              CLOSE
            </Button>
          )}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 p-6 overflow-y-auto min-h-0 bg-background">
        {activeTab === 'config' && (
          <TrainingSetup
            optimizer={optimizer}
            setOptimizer={setOptimizer}
            learningRate={learningRate}
            setLearningRate={setLearningRate}
            scheduler={scheduler}
            setScheduler={setScheduler}
            epochs={epochs}
            setEpochs={setEpochs}
            lossFunction={lossFunction}
            setLossFunction={setLossFunction}
          />
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
