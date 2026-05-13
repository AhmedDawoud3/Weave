import { useEffect, useRef } from 'react';
import { X, Play, Square, RotateCcw, ChevronDown, ChevronUp, Terminal as TerminalIcon, Code, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useTrainingStore } from '../../store/trainingStore';
import ProgressBar from './ProgressBar';
import TrainingMetrics from './TrainingMetrics';
import LossChart from './LossChart';
import CheckpointList from './CheckpointList';

interface TrainingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTraining: () => Promise<void>;
  totalEpochs: number;
}

function TrainingPanel({ isOpen, onClose, onStartTraining, totalEpochs }: TrainingPanelProps) {
  const [showTerminal, setShowTerminal] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [showAccuracy, setShowAccuracy] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  
  const {
    isRunning,
    error,
    currentEpoch,
    totalEpochs: storeEpochs,
    currentBatch,
    totalBatches,
    trainLoss,
    valLoss,
    trainAccuracy,
    valAccuracy,
    timePerEpoch,
    eta,
    lossHistory,
    accuracyHistory,
    checkpoints,
    terminalOutput,
    generatedCode,
    startTraining,
    stopTraining,
    resetTraining,
  } = useTrainingStore();

  const handleCopyCode = async () => {
    if (generatedCode) {
      await navigator.clipboard.writeText(generatedCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const handleStart = async () => {
    startTraining(totalEpochs);
    try {
      await onStartTraining();
    } catch (err) {
      console.error('Training failed:', err);
    }
  };

  const handleStop = () => {
    stopTraining();
  };

  const handleReset = () => {
    resetTraining();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-slate-800 rounded-t-2xl shadow-2xl border border-slate-700 max-h-[85vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : error ? 'bg-red-500' : 'bg-slate-500'}`} />
            <h2 className="text-lg font-semibold text-white">Training Dashboard</h2>
            {isRunning && (
              <span className="text-sm text-slate-400">
                Epoch {currentEpoch}/{storeEpochs}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isRunning && (
              <button
                type="button"
                onClick={handleStart}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                Start Training
              </button>
            )}
            {isRunning && (
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              disabled={isRunning}
              className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Progress Bars */}
          <div className="space-y-4">
            <ProgressBar
              current={currentEpoch}
              total={storeEpochs || totalEpochs}
              label="Overall Progress (Epochs)"
              color="purple"
              size="lg"
            />
            {isRunning && totalBatches > 0 && (
              <ProgressBar
                current={currentBatch}
                total={totalBatches}
                label={`Epoch ${currentEpoch} Progress (Batches)`}
                color="blue"
                size="md"
              />
            )}
          </div>

          {/* Metrics Grid */}
          <TrainingMetrics
            currentEpoch={currentEpoch}
            totalEpochs={storeEpochs || totalEpochs}
            trainLoss={trainLoss}
            valLoss={valLoss || undefined}
            trainAccuracy={trainAccuracy}
            valAccuracy={valAccuracy || undefined}
            timePerEpoch={timePerEpoch}
            eta={eta}
            isRunning={isRunning}
          />

          {/* Chart Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">Training Charts</span>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAccuracy}
                  onChange={(e) => setShowAccuracy(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                Show Accuracy
              </label>
            </div>
            <LossChart
              lossHistory={lossHistory}
              accuracyHistory={accuracyHistory}
              showAccuracy={showAccuracy}
            />
          </div>

          {/* Checkpoints */}
          <CheckpointList checkpoints={checkpoints} />

          {/* Generated Code (Collapsible) */}
          <div className="bg-slate-700/30 rounded-lg border border-slate-600/50">
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-slate-300">Generated Code</span>
                {generatedCode && (
                  <span className="text-xs text-slate-500">
                    ({generatedCode.split('\n').length} lines)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {generatedCode && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCode();
                    }}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600 rounded transition-colors"
                    title="Copy code"
                  >
                    {codeCopied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                )}
                {showCode ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>
            {showCode && (
              <div className="max-h-80 overflow-auto px-4 pb-4 font-mono text-xs text-blue-300 whitespace-pre bg-black/30">
                {generatedCode || 'No code generated yet. Click "Start Training" to generate code.'}
              </div>
            )}
          </div>

          {/* Terminal Output (Collapsible) */}
          <div className="bg-slate-700/30 rounded-lg border border-slate-600/50">
            <button
              type="button"
              onClick={() => setShowTerminal(!showTerminal)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-300">Terminal Output</span>
              </div>
              {showTerminal ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {showTerminal && (
              <div
                ref={terminalRef}
                className="h-48 overflow-auto px-4 pb-4 font-mono text-xs text-green-300 whitespace-pre-wrap bg-black/30"
              >
                {terminalOutput || 'No output yet...'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrainingPanel;
