import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useWeaveStore } from '../../store/useWeaveStore';
import { useTrainingStore } from '../../store/useTrainingStore';

interface TrainingSetupProps {
  optimizer: string;
  setOptimizer: (val: string) => void;
  learningRate: number;
  setLearningRate: (val: number) => void;
  scheduler: string;
  setScheduler: (val: string) => void;
  epochs: number;
  setEpochs: (val: number) => void;
  lossFunction: string;
  setLossFunction: (val: string) => void;
}

export function TrainingSetup({
  optimizer,
  setOptimizer,
  learningRate,
  setLearningRate,
  scheduler,
  setScheduler,
  epochs,
  setEpochs,
  lossFunction,
  setLossFunction
}: TrainingSetupProps) {
  const {
    nodeShapes,
    datasetConfig,
    datasetDownloadStatus,
    setActiveTab: setStoreTab
  } = useWeaveStore();

  const {
    suggestedLoss,
    suggestedLossAlternatives,
    lrPreview,
    getLossSuggestion,
    getLRSchedulePreview
  } = useTrainingStore();

  // Dataset readiness checks
  const isPredefined = datasetConfig?.source === 'predefined';
  const isDownloaded = isPredefined
    ? !!(datasetConfig && datasetDownloadStatus[(datasetConfig as any).name] === 'downloaded')
    : true;

  // Retrieve suggested loss when final output shape changes
  const outputShape = nodeShapes['output'];
  useEffect(() => {
    if (outputShape && outputShape.length > 0) {
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

  const renderLRSparkline = () => {
    if (!lrPreview || lrPreview.length === 0) return null;
    const width = 280;
    const height = 40;
    const padding = 5;

    const maxVal = Math.max(...lrPreview);
    const minVal = Math.min(...lrPreview);
    const range = maxVal - minVal || 1;

    const points = lrPreview
      .map((val, idx) => {
        const x = padding + (idx / (lrPreview.length - 1)) * (width - padding * 2);
        const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg width={width} height={height} className="bg-background border border-border rounded-lg">
        <polyline fill="none" stroke="var(--primary)" strokeWidth="2" points={points} />
      </svg>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm max-w-5xl">
      {/* Optimization Engine */}
      <div className="space-y-4">
        <h3 className="text-xs text-primary font-black uppercase tracking-wider mb-2 flex items-center gap-1">
          <Sparkles size={12} /> Optimization Engine
        </h3>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase font-bold">Optimizer Type</Label>
          <Select value={optimizer} onValueChange={setOptimizer}>
            <SelectTrigger className="bg-background border border-border rounded-xl h-10 cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border text-white">
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
              className="bg-background border border-border rounded-xl h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase font-bold">Epochs</Label>
            <Input
              type="number"
              value={epochs}
              onChange={(e) => setEpochs(Number(e.target.value))}
              className="bg-background border border-border rounded-xl h-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase font-bold">LR Scheduler</Label>
          <Select value={scheduler} onValueChange={setScheduler}>
            <SelectTrigger className="bg-background border border-border rounded-xl h-10 cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border text-white">
              <SelectItem value="CosineAnnealingLR">Cosine Annealing</SelectItem>
              <SelectItem value="StepLR">Step Decay</SelectItem>
              <SelectItem value="None">Static Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loss Objective */}
      <div className="space-y-4">
        <h3 className="text-xs text-primary font-black uppercase tracking-wider mb-2 flex items-center gap-1">
          <Sparkles size={12} /> Loss Objective
        </h3>

        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground uppercase font-bold">Loss Function</Label>
          <Select value={lossFunction} onValueChange={setLossFunction}>
            <SelectTrigger className="bg-background border border-border rounded-xl h-10 cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border text-white">
              <SelectItem value="CrossEntropyLoss">CrossEntropyLoss</SelectItem>
              <SelectItem value="MSELoss">MSELoss (Regression)</SelectItem>
              <SelectItem value="BCELoss">BCELoss (Binary)</SelectItem>
              <SelectItem value="NLLLoss">NLLLoss</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {suggestedLoss && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
              <Sparkles size={10} /> Smart Advice
            </div>
            <p className="text-xs leading-normal">
              Based on output shape <span className="font-bold text-primary">[{outputShape?.join(', ')}]</span>, Weave suggests using <span className="font-bold text-weave-teal">{suggestedLoss}</span>.
            </p>
            {suggestedLossAlternatives.length > 0 && (
              <p className="text-[10px] text-muted-foreground">
                Alternatives: {suggestedLossAlternatives.join(', ')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* LR Schedule Path & Dataset */}
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
            <div className="p-3 bg-background border border-border rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-white uppercase tracking-wider">
                    {datasetConfig.source === 'predefined' ? (datasetConfig as any).name : `${datasetConfig.source} source`}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
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
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 space-y-2 select-none">
                  <p className="text-[10px] text-amber-400 leading-normal font-medium">
                    ⚠️ The selected dataset is not downloaded yet. Please download it from the Dataset panel before starting.
                  </p>
                  <Button
                    onClick={() => setStoreTab('dataset')}
                    className="h-7 w-full text-[10px] bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-md cursor-pointer"
                  >
                    Go to Dataset Panel
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2 select-none">
              <p className="text-[10px] text-red-400 leading-normal font-medium">
                ❌ No dataset is configured. You must set up a dataset before training.
              </p>
              <Button
                onClick={() => setStoreTab('dataset')}
                className="h-7 w-full text-[10px] bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-md cursor-pointer"
              >
                Configure Dataset
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
