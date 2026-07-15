import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity } from 'lucide-react';
import { Button } from '../ui/button';

interface CompareRunsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRuns: Array<{
    id: string;
    projectName: string;
    metrics: {
      loss: number[];
      accuracy: number[];
      epochs: number[];
    };
  }>;
}

export function CompareRunsModal({ isOpen, onClose, selectedRuns }: CompareRunsModalProps) {
  const [activeMetric, setActiveMetric] = useState<'loss' | 'accuracy'>('loss');

  if (!isOpen || selectedRuns.length === 0) return null;

  // Colors for compared lines
  const runColors = ['stroke-weave-violet text-weave-violet bg-weave-violet', 'stroke-weave-teal text-weave-teal bg-weave-teal', 'stroke-weave-blue text-weave-blue bg-weave-blue'];

  // Helper to construct custom SVG path for metrics
  const getSvgPath = (values: number[], width: number, height: number): string => {
    if (values.length < 2) return '';
    const maxVal = Math.max(...values, 1.0);
    const minVal = Math.min(...values, 0.0);
    const range = maxVal - minVal || 1.0;
    
    return values.map((val, idx) => {
      const x = (idx / (values.length - 1)) * width;
      // Invert Y since SVG y=0 is top
      const y = height - ((val - minVal) / range) * height;
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="glass-panel p-8 rounded-3xl max-w-3xl w-full relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-xl font-black uppercase text-slate-100 flex items-center gap-2">
                <Activity className="text-weave-violet" size={20} /> Experiment Comparison
              </h3>
              <p className="text-xs text-slate-400 mt-1">Comparing metrics across {selectedRuns.length} selected runs</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Metric Toggle */}
          <div className="flex gap-3 mb-8">
            <Button
              onClick={() => setActiveMetric('loss')}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-xl border ${
                activeMetric === 'loss'
                  ? 'bg-weave-violet border-transparent text-white'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
              }`}
            >
              Loss Curve
            </Button>
            <Button
              onClick={() => setActiveMetric('accuracy')}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-xl border ${
                activeMetric === 'accuracy'
                  ? 'bg-weave-teal border-transparent text-white'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
              }`}
            >
              Validation Accuracy
            </Button>
          </div>

          {/* Chart Display Area (custom SVG) */}
          <div className="h-64 bg-black/45 border border-white/5 rounded-2xl p-6 relative flex items-center justify-center mb-8 overflow-hidden">
            {/* Grid background lines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 pointer-events-none" />
            
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
              {selectedRuns.map((run, idx) => {
                const values = activeMetric === 'loss' ? run.metrics.loss : run.metrics.accuracy;
                const colorClass = runColors[idx % runColors.length];
                const pathStr = getSvgPath(values, 500, 200);

                return (
                  <g key={run.id}>
                    {/* Path line */}
                    <path
                      d={pathStr}
                      fill="none"
                      className={`${colorClass} stroke-2 transition-all duration-500`}
                    />
                    {/* Dots at epochs */}
                    {values.map((val, vIdx) => {
                      const maxVal = Math.max(...values, 1.0);
                      const minVal = Math.min(...values, 0.0);
                      const range = maxVal - minVal || 1.0;
                      const cx = (vIdx / (values.length - 1)) * 500;
                      const cy = 200 - ((val - minVal) / range) * 200;
                      return (
                        <circle
                          key={vIdx}
                          cx={cx}
                          cy={cy}
                          r={3}
                          className={`${colorClass} stroke-background stroke-2 cursor-pointer hover:r-5 transition-all`}
                        >
                          <title>{`Epoch ${vIdx + 1}: ${val}`}</title>
                        </circle>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend / Run details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-6">
            {selectedRuns.map((run, idx) => {
              const colorClass = runColors[idx % runColors.length];
              const values = activeMetric === 'loss' ? run.metrics.loss : run.metrics.accuracy;
              const lastValue = values[values.length - 1];
              return (
                <div key={run.id} className="flex items-center gap-3 bg-white/5 border border-white/5 p-4 rounded-xl">
                  <div className={`w-3.5 h-3.5 rounded-full ${colorClass.split(' ')[2]}`} />
                  <div className="text-left flex-1 truncate">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Project: {run.projectName}</p>
                    <h4 className="text-sm font-bold text-slate-200 truncate uppercase">{run.id}</h4>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      {activeMetric === 'loss' ? 'Final Loss' : 'Final Acc'}:{' '}
                      <span className="font-extrabold text-white">
                        {typeof lastValue === 'number' ? lastValue.toFixed(4) : 'N/A'}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
