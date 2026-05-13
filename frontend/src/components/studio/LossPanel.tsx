import { Flame, Calculator } from 'lucide-react';

export interface LossConfig {
  lossType: 'CrossEntropyLoss' | 'MSELoss' | 'BCELoss' | 'BCEWithLogitsLoss' | 'NLLLoss' | 'L1Loss' | 'SmoothL1Loss' | 'KLDivLoss' | 'Custom';
  customLossCode: string;
  reduction: 'mean' | 'sum' | 'none';
  labelSmoothing: number;
}

interface LossPanelProps {
  config: LossConfig;
  onChange: (config: LossConfig) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function LossPanel({ config, onChange, isExpanded, onToggleExpand }: LossPanelProps) {
  const handleChange = (field: keyof LossConfig, value: string | number) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="flex flex-col border-b border-slate-700">
      {/* Sticky Tab Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="sticky top-0 z-10 flex items-center justify-between gap-2 p-4 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer border-b border-slate-700"
      >
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-white">Loss Function</h2>
        </div>
        <span className="text-slate-400 text-xl">{isExpanded ? '−' : '+'}</span>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-4 flex flex-col gap-4">
          {/* Loss Type */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lossType" className="text-sm font-medium text-slate-300">
              Loss Type
            </label>
            <select
              id="lossType"
              value={config.lossType}
              onChange={(e) => handleChange('lossType', e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="CrossEntropyLoss">CrossEntropyLoss</option>
              <option value="MSELoss">MSELoss</option>
              <option value="BCELoss">BCELoss</option>
              <option value="BCEWithLogitsLoss">BCEWithLogitsLoss</option>
              <option value="NLLLoss">NLLLoss</option>
              <option value="L1Loss">L1Loss</option>
              <option value="SmoothL1Loss">SmoothL1Loss</option>
              <option value="KLDivLoss">KLDivLoss</option>
              <option value="Custom">Custom Loss</option>
            </select>
          </div>

          {/* Reduction */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reduction" className="text-sm font-medium text-slate-300">
              Reduction
            </label>
            <select
              id="reduction"
              value={config.reduction}
              onChange={(e) => handleChange('reduction', e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="mean">Mean</option>
              <option value="sum">Sum</option>
              <option value="none">None</option>
            </select>
          </div>

          {/* Label Smoothing */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="labelSmoothing" className="text-sm font-medium text-slate-300">
              Label Smoothing
            </label>
            <input
              type="number"
              id="labelSmoothing"
              value={config.labelSmoothing}
              onChange={(e) => handleChange('labelSmoothing', parseFloat(e.target.value) || config.labelSmoothing)}
              step={0.01}
              min={0}
              max={1}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Custom Loss Code (shown only when Custom is selected) */}
          {config.lossType === 'Custom' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-orange-500" />
                <label htmlFor="customLossCode" className="text-sm font-medium text-slate-300">
                  Custom Loss Function
                </label>
              </div>
              <p className="text-xs text-slate-500 mb-2">
                Define your custom loss. Use `pred` for predictions and `target` for labels.
                Example: torch.mean((pred - target) ** 2)
              </p>
              <textarea
                id="customLossCode"
                value={config.customLossCode}
                onChange={(e) => handleChange('customLossCode', e.target.value)}
                rows={4}
                placeholder={`# Custom loss function\ndef custom_loss(pred, target):\n    return torch.mean((pred - target) ** 2)`}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              />
            </div>
          )}

          <p className="text-xs text-slate-500 pt-2 border-t border-slate-700">
            Configure the loss function for training your model.
          </p>
        </div>
      )}
    </div>
  );
}

export default LossPanel;
