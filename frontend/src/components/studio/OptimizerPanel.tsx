import { Gauge, Dumbbell } from 'lucide-react';

export interface OptimizerConfig {
  optimizerType: 'Adam' | 'SGD' | 'RMSprop' | 'AdamW';
  learningRate: number;
  epochs: number;
  weightDecay: number;
  momentum: number;
}

interface OptimizerPanelProps {
  config: OptimizerConfig;
  onChange: (config: OptimizerConfig) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStartTraining?: () => void;
}

function OptimizerPanel({ config, onChange, isExpanded, onToggleExpand, onStartTraining }: OptimizerPanelProps) {
  const handleChange = (field: keyof OptimizerConfig, value: string | number) => {
    onChange({ ...config, [field]: value });
  };

  const showMomentum = config.optimizerType === 'SGD' || config.optimizerType === 'RMSprop';

  return (
    <div className="flex flex-col border-b border-slate-700">
      {/* Sticky Tab Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="sticky top-0 z-10 flex items-center justify-between gap-2 p-4 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer border-b border-slate-700"
      >
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-white">Optimizer & Trainer</h2>
        </div>
        <span className="text-slate-400 text-xl">{isExpanded ? '−' : '+'}</span>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-4 flex flex-col gap-4">
          {/* Optimizer Type */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="optimizerType" className="text-sm font-medium text-slate-300">
              Optimizer
            </label>
            <select
              id="optimizerType"
              value={config.optimizerType}
              onChange={(e) => handleChange('optimizerType', e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="Adam">Adam</option>
              <option value="SGD">SGD</option>
              <option value="RMSprop">RMSprop</option>
              <option value="AdamW">AdamW</option>
            </select>
          </div>

          {/* Learning Rate */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="learningRate" className="text-sm font-medium text-slate-300">
              Learning Rate
            </label>
            <input
              type="number"
              id="learningRate"
              value={config.learningRate}
              onChange={(e) => handleChange('learningRate', parseFloat(e.target.value) || config.learningRate)}
              step={0.0001}
              min={0.00001}
              max={1}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* Weight Decay */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="weightDecay" className="text-sm font-medium text-slate-300">
              Weight Decay
            </label>
            <input
              type="number"
              id="weightDecay"
              value={config.weightDecay}
              onChange={(e) => handleChange('weightDecay', parseFloat(e.target.value) || config.weightDecay)}
              step={0.0001}
              min={0}
              max={1}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* Momentum (for SGD and RMSprop) */}
          {showMomentum && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="momentum" className="text-sm font-medium text-slate-300">
                Momentum
              </label>
              <input
                type="number"
                id="momentum"
                value={config.momentum}
                onChange={(e) => handleChange('momentum', parseFloat(e.target.value) || config.momentum)}
                step={0.01}
                min={0}
                max={1}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Training Section */}
          <div className="pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-slate-300">Training</span>
            </div>

            {/* Epochs */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="epochs" className="text-sm font-medium text-slate-300">
                Epochs
              </label>
              <input
                type="number"
                id="epochs"
                value={config.epochs}
                onChange={(e) => handleChange('epochs', parseInt(e.target.value, 10) || config.epochs)}
                min={1}
                max={1000}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Train Button */}
          <button
            type="button"
            className="mt-4 w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-purple-500 hover:from-amber-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all duration-150 shadow-lg"
            onClick={() => {
              if (onStartTraining) {
                onStartTraining();
              } else {
                console.log('Start Training with config:', config);
              }
            }}
          >
            Start Training
          </button>

          <p className="text-xs text-slate-500 pt-2 border-t border-slate-700">
            Configure your optimizer and training parameters here.
          </p>
        </div>
      )}
    </div>
  );
}

export default OptimizerPanel;
