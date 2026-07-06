import { useTrainingStore } from '../../store/useTrainingStore';

interface MetricsViewProps {
  epochs: number;
}

export function MetricsView({ epochs }: MetricsViewProps) {
  const {
    trainingStatus,
    epochMetrics,
    stepMetrics
  } = useTrainingStore();

  if (epochMetrics.length === 0 && stepMetrics.length === 0) {
    return (
      <div className="space-y-4">
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
              <span className="text-white">0 / {epochs}</span>
            </div>
            <div>
              <span className="text-muted-foreground mr-2 text-[10px]">Active Steps:</span>
              <span className="text-white">0</span>
            </div>
          </div>
        )}
        <div className="h-44 bg-background/25 border border-primary/5 rounded-xl flex items-center justify-center text-xs text-muted-foreground/40 font-bold uppercase select-none">
          Waiting for training indicators...
        </div>
      </div>
    );
  }

  const width = 500;
  const height = 180;
  const padding = 20;

  // Gather training losses (from steps or epochs)
  const stepLosses = stepMetrics.map(d => {
    const val = d.metrics?.train_loss ?? d.metrics?.loss ?? d.loss;
    return typeof val === 'number' && !isNaN(val) ? val : 0;
  });

  const epochTrainLosses = epochMetrics.map(d => {
    const val = d.metrics?.train_loss ?? d.metrics?.loss ?? d.loss;
    return typeof val === 'number' && !isNaN(val) ? val : 0;
  });

  const epochValLosses = epochMetrics.map(d => {
    const val = d.metrics?.val_loss;
    return typeof val === 'number' && !isNaN(val) ? val : null;
  });

  const accuracies = epochMetrics.map(d => {
    const val = d.metrics?.val_accuracy ?? d.metrics?.train_accuracy ?? d.metrics?.accuracy ?? d.accuracy;
    if (typeof val === 'number' && !isNaN(val)) {
      return val > 1.0 ? val / 100.0 : val;
    }
    return 0;
  });

  // Calculate scaling for Loss Curve
  // Use epoch metrics if they exist for cleaner curves, else fall back to steps
  const useEpochLoss = epochTrainLosses.length > 0;
  const lossesToPlot = useEpochLoss ? epochTrainLosses : stepLosses;
  const valLossesToPlot = useEpochLoss ? epochValLosses : [];

  const validValLosses = valLossesToPlot.filter((v): v is number => v !== null);
  const maxLoss = Math.max(...lossesToPlot, ...validValLosses, 1);
  const minLoss = Math.min(...lossesToPlot, ...validValLosses, 0);
  const lossRange = maxLoss - minLoss || 1;

  const getPointsString = (data: (number | null)[]) => {
    if (data.length === 0) return '';
    if (data.length === 1) {
      const val = data[0] ?? 0;
      const x1 = padding;
      const x2 = width - padding;
      const y = height - padding - ((val - minLoss) / lossRange) * (height - padding * 2);
      return `${x1},${y} ${x2},${y}`;
    }
    return data
      .map((val, idx) => {
        if (val === null) return null;
        const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - ((val - minLoss) / lossRange) * (height - padding * 2);
        return `${x},${y}`;
      })
      .filter(p => p !== null)
      .join(' ');
  };

  const lossPoints = getPointsString(lossesToPlot);
  const valLossPoints = getPointsString(valLossesToPlot);

  // Scaling for Accuracy
  const maxAcc = Math.max(...accuracies, 1);
  const minAcc = Math.min(...accuracies, 0);
  const accRange = maxAcc - minAcc || 1;

  const accuracyPoints = accuracies.length > 0
    ? accuracies.map((val, idx) => {
        const x = padding + (idx / Math.max(accuracies.length - 1, 1)) * (width - padding * 2);
        const y = height - padding - ((val - minAcc) / accRange) * (height - padding * 2);
        return `${x},${y}`;
      }).join(' ')
    : '';

  const latestTrainLoss = lossesToPlot[lossesToPlot.length - 1];
  const latestValLoss = validValLosses.length > 0 ? validValLosses[validValLosses.length - 1] : null;
  const latestAccuracy = accuracies.length > 0 ? accuracies[accuracies.length - 1] : null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Info */}
      <div className="flex gap-8 items-center bg-primary/5 border border-primary/10 rounded-xl p-4 text-xs font-bold uppercase tracking-wider select-none shrink-0">
        <div>
          <span className="text-muted-foreground mr-2 text-[10px]">Status:</span>
          <span className={`px-2 py-1.5 rounded-lg text-[10px] font-black ${
            trainingStatus === 'running'
              ? 'bg-primary/20 text-primary border border-primary/30 animate-pulse'
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Loss chart */}
        <div className="bg-background/25 p-4 rounded-xl border border-primary/5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Loss Curve</span>
              <span className="text-[8px] text-muted-foreground/60">
                {useEpochLoss ? 'Epoch-level metrics' : 'Step-level metrics'}
              </span>
            </div>
            <div className="flex gap-3 text-xs font-bold">
              <span className="text-primary">Train: {latestTrainLoss?.toFixed(4) ?? '0.0000'}</span>
              {latestValLoss !== null && (
                <span className="text-amber-400">Val: {latestValLoss.toFixed(4)}</span>
              )}
            </div>
          </div>
          <div className="relative w-full h-36">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
              {/* Gridlines */}
              <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
              <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />

              {/* Training Loss Path */}
              {lossPoints && (
                <polyline
                  fill="none"
                  stroke="#1e8fd3"
                  strokeWidth="2"
                  points={lossPoints}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Validation Loss Path */}
              {valLossPoints && (
                <polyline
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  points={valLossPoints}
                  strokeDasharray="4 2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </div>
        </div>

        {/* Accuracy chart */}
        <div className="bg-background/25 p-4 rounded-xl border border-primary/5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Validation Accuracy</span>
            <span className="text-xs font-bold text-emerald-400">
              {latestAccuracy !== null ? `${(latestAccuracy * 100).toFixed(1)}%` : '0.0%'}
            </span>
          </div>

          <div className="relative w-full h-36">
            {accuracies.length > 0 ? (
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                {/* Gridlines */}
                <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />

                {/* Accuracy Path */}
                {accuracyPoints && (
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    points={accuracyPoints}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            ) : (
              <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground/30 uppercase font-bold tracking-widest select-none">
                Requires completed epochs
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
