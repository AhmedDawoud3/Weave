import { useState } from 'react';
import { useTrainingStore } from '../../store/useTrainingStore';
import { Activity, Pause, CheckCircle2, AlertOctagon, Hourglass } from 'lucide-react';

interface MetricsViewProps {
  epochs: number;
}

export function MetricsView({ epochs }: MetricsViewProps) {
  const {
    trainingStatus,
    epochMetrics,
    stepMetrics,
    elapsedTime,
    etaSeconds,
    stepsPerSec,
    currentStep,
    totalSteps,
    sseConnectionState
  } = useTrainingStore();

  const [chartMode, setChartMode] = useState<'steps' | 'epochs'>('steps');

  // Hover/Tooltip States for Loss Chart
  const [lossHoveredIdx, setLossHoveredIdx] = useState<number | null>(null);
  const [lossTooltipPos, setLossTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Hover/Tooltip States for Secondary Chart
  const [secHoveredIdx, setSecHoveredIdx] = useState<number | null>(null);
  const [secTooltipPos, setSecTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Format dynamic clock duration (MM:SS or HH:MM:SS)
  const formatDuration = (seconds: number | null): string => {
    if (seconds === null || isNaN(seconds) || seconds < 0) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (num: number) => String(num).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  // Automatically detect task type (classification vs. regression) based on metric keys
  const hasMse = stepMetrics.some(m => m.metrics && ('train_mse' in m.metrics || 'mse' in m.metrics)) ||
                 epochMetrics.some(m => m.metrics && ('train_mse' in m.metrics || 'val_mse' in m.metrics || 'mse' in m.metrics));
  const isRegression = hasMse;

  // Render a placeholder if no data is recorded yet
  if (epochMetrics.length === 0 && stepMetrics.length === 0) {
    return (
      <div className="space-y-4">
        {trainingStatus !== 'idle' && (
          <div className="flex gap-8 items-center bg-primary/5 border border-border rounded-xl p-4 text-xs font-bold uppercase tracking-wider select-none shrink-0">
            <div>
              <span className="text-muted-foreground mr-2 text-[10px]">Status:</span>
              <span className={`px-2 py-1.5 rounded-lg text-[10px] font-black ${
                trainingStatus === 'running'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : trainingStatus === 'paused'
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'bg-muted/20 text-foreground border border-border'
              }`}>
                {trainingStatus}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground mr-2 text-[10px]">Epoch:</span>
              <span className="text-foreground">0 / {epochs}</span>
            </div>
            <div>
              <span className="text-muted-foreground mr-2 text-[10px]">Active Steps:</span>
              <span className="text-foreground">0</span>
            </div>
          </div>
        )}
        <div className="h-44 bg-background/25 border border-border rounded-xl flex items-center justify-center text-xs text-muted-foreground/45 font-bold uppercase select-none">
          Waiting for training indicators...
        </div>
      </div>
    );
  }

  // overall progress percentage
  const overallPercent = totalSteps && currentStep
    ? Math.min(100, Math.max(0, (currentStep / totalSteps) * 100))
    : 0;

  // Gather training losses
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

  // Gather secondary metrics (Accuracy / MSE)
  const stepSecondary = stepMetrics.map(d => {
    if (isRegression) {
      const val = d.metrics?.train_mse ?? d.metrics?.mse;
      return typeof val === 'number' && !isNaN(val) ? val : 0;
    } else {
      const val = d.metrics?.train_accuracy ?? d.metrics?.accuracy;
      if (typeof val === 'number' && !isNaN(val)) {
        return val / 100.0;
      }
      return 0;
    }
  });

  const epochTrainSecondary = epochMetrics.map(d => {
    if (isRegression) {
      const val = d.metrics?.train_mse ?? d.metrics?.mse;
      return typeof val === 'number' && !isNaN(val) ? val : 0;
    } else {
      const val = d.metrics?.train_accuracy ?? d.metrics?.accuracy;
      if (typeof val === 'number' && !isNaN(val)) {
        return val / 100.0;
      }
      return 0;
    }
  });

  const epochValSecondary = epochMetrics.map(d => {
    if (isRegression) {
      const val = d.metrics?.val_mse;
      return typeof val === 'number' && !isNaN(val) ? val : null;
    } else {
      const val = d.metrics?.val_accuracy;
      if (typeof val === 'number' && !isNaN(val)) {
        return val / 100.0;
      }
      return null;
    }
  });

  // Plot variables mapping based on Steps vs Epochs mode
  const plotSteps = chartMode === 'steps';
  const lossesToPlot = plotSteps ? stepLosses : epochTrainLosses;
  const valLossesToPlot = plotSteps ? [] : epochValLosses;

  const secondariesToPlot = plotSteps ? stepSecondary : epochTrainSecondary;
  const valSecondariesToPlot = plotSteps ? [] : epochValSecondary;

  // Chart setup bounds
  const width = 500;
  const height = 180;
  const padding = 20;

  // 1. Loss scale
  const validValLosses = valLossesToPlot.filter((v): v is number => v !== null);
  const maxLoss = Math.max(...lossesToPlot, ...validValLosses, 1);
  const minLoss = Math.min(...lossesToPlot, ...validValLosses, 0);
  const lossRange = maxLoss - minLoss || 1;

  // 2. Secondary scale (Accuracy or MSE)
  const validValSecondaries = valSecondariesToPlot.filter((v): v is number => v !== null);
  const maxSecondary = isRegression
    ? Math.max(...secondariesToPlot, ...validValSecondaries, 1)
    : 1.0; // Accuracy caps visually at 100%
  const minSecondary = 0.0;
  const secondaryRange = maxSecondary - minSecondary || 1;

  const getPointsString = (data: (number | null)[], minVal: number, range: number) => {
    if (data.length === 0) return '';
    if (data.length === 1) {
      const val = data[0] ?? 0;
      const x1 = padding;
      const x2 = width - padding;
      const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
      return `${x1},${y} ${x2},${y}`;
    }
    return data
      .map((val, idx) => {
        if (val === null) return null;
        const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
        return `${x},${y}`;
      })
      .filter(p => p !== null)
      .join(' ');
  };

  const lossPoints = getPointsString(lossesToPlot, minLoss, lossRange);
  const valLossPoints = getPointsString(valLossesToPlot, minLoss, lossRange);
  const closedLossPoints = lossPoints ? `${lossPoints} ${width - padding},${height - padding} ${padding},${height - padding}` : '';
  const closedValLossPoints = valLossPoints ? `${valLossPoints} ${width - padding},${height - padding} ${padding},${height - padding}` : '';

  const secondaryPoints = getPointsString(secondariesToPlot, minSecondary, secondaryRange);
  const valSecondaryPoints = getPointsString(valSecondariesToPlot, minSecondary, secondaryRange);
  const closedSecondaryPoints = secondaryPoints ? `${secondaryPoints} ${width - padding},${height - padding} ${padding},${height - padding}` : '';
  const closedValSecondaryPoints = valSecondaryPoints ? `${valSecondaryPoints} ${width - padding},${height - padding} ${padding},${height - padding}` : '';

  // Get active status details
  const getStatusIcon = () => {
    switch (trainingStatus) {
      case 'running':
        return <Activity size={16} className="text-[#40d3b6] animate-pulse" />;
      case 'paused':
        return <Pause size={16} className="text-yellow-400" />;
      case 'completed':
        return <CheckCircle2 size={16} className="text-emerald-400" />;
      case 'failed':
        return <AlertOctagon size={16} className="text-red-400" />;
      default:
        return <Hourglass size={16} className="text-muted-foreground" />;
    }
  };

  const speedDisplay = stepsPerSec !== null && stepsPerSec > 0
    ? `${stepsPerSec.toFixed(1)} steps/s`
    : '0.0 steps/s';

  const stepsLeft = totalSteps && currentStep
    ? Math.max(0, totalSteps - currentStep)
    : 0;

  // Chart hover interaction handlers
  const handleChartMouseMove = (
    e: React.MouseEvent<SVGSVGElement>,
    dataLength: number,
    setHoveredIdx: (idx: number | null) => void,
    setTooltipPos: (pos: { x: number; y: number } | null) => void
  ) => {
    if (dataLength <= 1) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const svgX = (mouseX / rect.width) * width;
    const chartWidth = width - padding * 2;
    const rawIdx = ((svgX - padding) / chartWidth) * (dataLength - 1);
    const idx = Math.min(dataLength - 1, Math.max(0, Math.round(rawIdx)));

    setHoveredIdx(idx);
    setTooltipPos({
      x: Math.min(rect.width - 150, Math.max(10, mouseX - 70)),
      y: Math.max(10, mouseY - 70)
    });
  };

  return (
    <div className="space-y-5 max-w-5xl select-none">
      
      {/* 1. OVERALL PROGRESS CARD */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xl">
        <div className="flex justify-between items-center mb-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Overall Training Progress</span>
            <span className="text-xs font-black text-foreground uppercase mt-0.5">
              {currentStep ?? 0} / {totalSteps ?? 'Calculating...'} total steps
            </span>
          </div>
          <span className="text-sm font-black text-[#40d3b6]">
            {overallPercent.toFixed(1)}%
          </span>
        </div>

        {/* Glowing Progress Bar */}
        <div className="w-full h-2.5 bg-foreground/60 rounded-full overflow-hidden border border-border relative">
          <div
            className="h-full bg-gradient-to-r from-primary to-[#40d3b6] shadow-glow transition-all duration-300"
            style={{ width: `${overallPercent}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-2">
          <span>Epoch {epochMetrics.length} of {epochs}</span>
          {stepsLeft > 0 && <span>{stepsLeft.toLocaleString()} steps remaining</span>}
        </div>
      </div>

      {/* 2. FOUR-COLUMN STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Status card */}
        <div className="bg-card border border-border rounded-xl p-3 flex flex-col justify-between h-18">
          <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Training Status</span>
          <div className="flex items-center gap-2 mt-1">
            {getStatusIcon()}
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              {trainingStatus}
            </span>
          </div>
          <span className="text-[9px] text-muted-foreground/60 uppercase font-semibold">
            SSE: {sseConnectionState}
          </span>
        </div>

        {/* Elapsed time card */}
        <div className="bg-card border border-border rounded-xl p-3 flex flex-col justify-between h-18">
          <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Time Elapsed</span>
          <span className="text-lg font-black font-mono text-foreground mt-0.5 leading-tight">
            {formatDuration(elapsedTime)}
          </span>
          <span className="text-[9px] text-muted-foreground/60 uppercase font-semibold">
            from run launch
          </span>
        </div>

        {/* Remaining time (ETA) card */}
        <div className="bg-card border border-border rounded-xl p-3 flex flex-col justify-between h-18">
          <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Estimated Time Left</span>
          <span className="text-lg font-black font-mono text-foreground mt-0.5 leading-tight">
            {trainingStatus === 'running' ? formatDuration(etaSeconds) : '--:--'}
          </span>
          <span className="text-[9px] text-muted-foreground/60 uppercase font-semibold">
            {trainingStatus === 'running' && etaSeconds !== null ? 'based on current speed' : 'estimating speed...'}
          </span>
        </div>

        {/* Training Speed card */}
        <div className="bg-card border border-border rounded-xl p-3 flex flex-col justify-between h-18">
          <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Processing Rate</span>
          <span className="text-lg font-black font-mono text-foreground mt-0.5 leading-tight">
            {speedDisplay}
          </span>
          <span className="text-[9px] text-muted-foreground/60 uppercase font-semibold">
            tensors throughput
          </span>
        </div>
      </div>

      {/* 3. CHART CONTROLS & VIEWER MODE TOGGLE */}
      <div className="flex justify-between items-center bg-foreground/40 border border-border rounded-xl p-2.5">
        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-1">Metrics Charts Visualization</span>
        
        {/* Toggle sliding button group */}
        <div className="flex bg-foreground/60 border border-border rounded-lg p-0.5 h-8 items-center select-none text-[10px] font-black uppercase tracking-widest">
          <button
            onClick={() => setChartMode('steps')}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              plotSteps
                ? 'bg-primary/20 text-[#40d3b6] border border-primary/10 shadow-[0_0_8px_rgba(108,60,225,0.1)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Live Steps
          </button>
          <button
            onClick={() => setChartMode('epochs')}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              !plotSteps
                ? 'bg-primary/20 text-[#40d3b6] border border-primary/10 shadow-[0_0_8px_rgba(108,60,225,0.1)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Epochs
          </button>
        </div>
      </div>

      {/* 4. METRICS DUAL CHARTS DISPLAY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Loss chart */}
        <div className="bg-card p-4 rounded-xl border border-border flex flex-col justify-between relative overflow-visible">
          <div className="flex justify-between items-center mb-2">
            <div className="flex flex-col">
              <span className="text-xs font-black text-foreground uppercase tracking-wider">Loss Curve</span>
              <span className="text-[9px] text-muted-foreground/50 uppercase tracking-widest font-extrabold">
                {plotSteps ? 'Step-Level Training Loss' : 'Epoch-Level (Train & Val)'}
              </span>
            </div>
            <div className="flex gap-3 text-xs font-mono font-bold">
              <span className="text-primary">Train: {lossesToPlot[lossesToPlot.length - 1]?.toFixed(4) ?? '0.0000'}</span>
              {!plotSteps && epochValLosses[epochValLosses.length - 1] !== null && (
                <span className="text-amber-500">Val: {epochValLosses[epochValLosses.length - 1]?.toFixed(4)}</span>
              )}
            </div>
          </div>
          <div className="relative w-full h-36">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-full cursor-crosshair overflow-visible"
              onMouseMove={(e) => handleChartMouseMove(e, lossesToPlot.length, setLossHoveredIdx, setLossTooltipPos)}
              onMouseLeave={() => { setLossHoveredIdx(null); setLossTooltipPos(null); }}
            >
              <defs>
                <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e8fd3" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#1e8fd3" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="valLossGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
              <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />

              {/* Area fills (Train Loss) */}
              {closedLossPoints && (
                <polygon points={closedLossPoints} fill="url(#lossGrad)" stroke="none" />
              )}
              {/* Area fills (Val Loss) */}
              {!plotSteps && closedValLossPoints && (
                <polygon points={closedValLossPoints} fill="url(#valLossGrad)" stroke="none" />
              )}

              {/* Training Loss Path */}
              {lossPoints && (
                <polyline fill="none" stroke="#1e8fd3" strokeWidth="2" points={lossPoints} strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Validation Loss Path */}
              {!plotSteps && valLossPoints && (
                <polyline fill="none" stroke="#f59e0b" strokeWidth="2" points={valLossPoints} strokeDasharray="4 2" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Interactive Hover Guides & Indicator Circles */}
              {lossHoveredIdx !== null && lossesToPlot.length > 0 && (() => {
                const xVal = padding + (lossHoveredIdx / (lossesToPlot.length - 1)) * (width - padding * 2);
                const trainYVal = height - padding - ((lossesToPlot[lossHoveredIdx] - minLoss) / lossRange) * (height - padding * 2);
                const valY = !plotSteps && valLossesToPlot[lossHoveredIdx] !== null
                  ? height - padding - (((valLossesToPlot[lossHoveredIdx] as number) - minLoss) / lossRange) * (height - padding * 2)
                  : null;

                return (
                  <>
                    {/* Vertical dashed guide line */}
                    <line x1={xVal} y1={padding} x2={xVal} y2={height - padding} stroke="rgba(108,60,225,0.4)" strokeWidth="1" strokeDasharray="2 2" />
                    
                    {/* Train loss hover circle */}
                    <circle cx={xVal} cy={trainYVal} r="4" fill="#1e8fd3" stroke="white" strokeWidth="1" />
                    
                    {/* Val loss hover circle */}
                    {valY !== null && (
                      <circle cx={xVal} cy={valY} r="4" fill="#f59e0b" stroke="white" strokeWidth="1" />
                    )}
                  </>
                );
              })()}
            </svg>

            {/* Custom Interactive Tooltip card */}
            {lossHoveredIdx !== null && lossTooltipPos && (
              <div 
                className="absolute bg-card/95 border border-border rounded-lg p-2.5 shadow-2xl z-50 text-[10px] pointer-events-none space-y-1 backdrop-blur-md min-w-[110px]"
                style={{ left: lossTooltipPos.x, top: lossTooltipPos.y }}
              >
                <div className="font-extrabold text-foreground uppercase tracking-wider">
                  {plotSteps ? `Step ${lossHoveredIdx + 1}` : `Epoch ${lossHoveredIdx + 1}`}
                </div>
                <div className="flex flex-col gap-0.5 text-muted-foreground font-mono">
                  <div className="flex items-center gap-1.5 justify-between">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#1e8fd3]" /> Train:</span>
                    <span className="text-foreground font-bold">{lossesToPlot[lossHoveredIdx]?.toFixed(4)}</span>
                  </div>
                  {!plotSteps && valLossesToPlot[lossHoveredIdx] !== null && (
                    <div className="flex items-center gap-1.5 justify-between">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" /> Val:</span>
                      <span className="text-foreground font-bold">{valLossesToPlot[lossHoveredIdx]?.toFixed(4)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Secondary metric chart (Accuracy or MSE) */}
        {(() => {
          const lastLoss = lossesToPlot[lossesToPlot.length - 1];
          const latestPpl = typeof lastLoss === 'number' && !isNaN(lastLoss) ? Math.exp(Math.min(lastLoss, 20)) : null;

          return (
            <div className="bg-card p-4 rounded-xl border border-border flex flex-col justify-between relative overflow-visible">
              <div className="flex justify-between items-center mb-2">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-foreground uppercase tracking-wider">
                      {isRegression ? 'Mean Squared Error (MSE)' : 'Accuracy Curve'}
                    </span>
                    {!isRegression && latestPpl !== null && (
                      <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20" title="Perplexity (exp(loss)) — standard evaluation metric for Transformers & Language Models">
                        PPL: {latestPpl < 10000 ? latestPpl.toFixed(1) : '>10000'}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-muted-foreground/50 uppercase tracking-widest font-extrabold">
                    {plotSteps 
                      ? `Step-Level Training ${isRegression ? 'MSE' : 'Accuracy'}` 
                      : `Epoch-Level Train & Val ${isRegression ? 'MSE' : 'Accuracy'}`}
                  </span>
                </div>
            <div className="flex gap-3 text-xs font-mono font-bold">
              <span className={isRegression ? 'text-primary' : 'text-emerald-400'}>
                Train: {isRegression
                  ? secondariesToPlot[secondariesToPlot.length - 1]?.toFixed(4) ?? '0.0000'
                  : `${((secondariesToPlot[secondariesToPlot.length - 1] ?? 0) * 100).toFixed(1)}%`}
              </span>
              {!plotSteps && valSecondariesToPlot[valSecondariesToPlot.length - 1] !== null && (
                <span className="text-amber-500 font-mono">
                  Val: {isRegression
                    ? (valSecondariesToPlot[valSecondariesToPlot.length - 1] as number).toFixed(4)
                    : `${((valSecondariesToPlot[valSecondariesToPlot.length - 1] as number) * 100).toFixed(1)}%`}
                </span>
              )}
            </div>
          </div>
          <div className="relative w-full h-36">
            {secondariesToPlot.length > 0 ? (
              <>
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-full cursor-crosshair overflow-visible"
                  onMouseMove={(e) => handleChartMouseMove(e, secondariesToPlot.length, setSecHoveredIdx, setSecTooltipPos)}
                  onMouseLeave={() => { setSecHoveredIdx(null); setSecTooltipPos(null); }}
                >
                  <defs>
                    <linearGradient id="secGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isRegression ? '#1e8fd3' : '#10b981'} stopOpacity="0.2" />
                      <stop offset="100%" stopColor={isRegression ? '#1e8fd3' : '#10b981'} stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="valSecGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                  <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                  <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />

                  {/* Area fills */}
                  {closedSecondaryPoints && (
                    <polygon points={closedSecondaryPoints} fill="url(#secGrad)" stroke="none" />
                  )}
                  {!plotSteps && closedValSecondaryPoints && (
                    <polygon points={closedValSecondaryPoints} fill="url(#valSecGrad)" stroke="none" />
                  )}

                  {/* Training Path */}
                  {secondaryPoints && (
                    <polyline fill="none" stroke={isRegression ? '#1e8fd3' : '#10b981'} strokeWidth="2" points={secondaryPoints} strokeLinecap="round" strokeLinejoin="round" />
                  )}

                  {/* Validation Path */}
                  {!plotSteps && valSecondaryPoints && (
                    <polyline fill="none" stroke="#f59e0b" strokeWidth="2" points={valSecondaryPoints} strokeDasharray="4 2" strokeLinecap="round" strokeLinejoin="round" />
                  )}

                  {/* Interactive Hover Guides & Circles */}
                  {secHoveredIdx !== null && secondariesToPlot.length > 0 && (() => {
                    const xVal = padding + (secHoveredIdx / (secondariesToPlot.length - 1)) * (width - padding * 2);
                    const trainYVal = height - padding - ((secondariesToPlot[secHoveredIdx] - minSecondary) / secondaryRange) * (height - padding * 2);
                    const valY = !plotSteps && valSecondariesToPlot[secHoveredIdx] !== null
                      ? height - padding - (((valSecondariesToPlot[secHoveredIdx] as number) - minSecondary) / secondaryRange) * (height - padding * 2)
                      : null;

                    return (
                      <>
                        {/* Vertical dashed guide line */}
                        <line x1={xVal} y1={padding} x2={xVal} y2={height - padding} stroke="rgba(108,60,225,0.4)" strokeWidth="1" strokeDasharray="2 2" />
                        
                        {/* Train secondary hover circle */}
                        <circle cx={xVal} cy={trainYVal} r="4" fill={isRegression ? '#1e8fd3' : '#10b981'} stroke="white" strokeWidth="1" />
                        
                        {/* Val secondary hover circle */}
                        {valY !== null && (
                          <circle cx={xVal} cy={valY} r="4" fill="#f59e0b" stroke="white" strokeWidth="1" />
                        )}
                      </>
                    );
                  })()}
                </svg>

                {/* Custom Interactive Tooltip card */}
                {secHoveredIdx !== null && secTooltipPos && (
                  <div 
                    className="absolute bg-card/95 border border-border rounded-lg p-2.5 shadow-2xl z-50 text-[10px] pointer-events-none space-y-1 backdrop-blur-md min-w-[110px]"
                    style={{ left: secTooltipPos.x, top: secTooltipPos.y }}
                  >
                    <div className="font-extrabold text-foreground uppercase tracking-wider">
                      {plotSteps ? `Step ${secHoveredIdx + 1}` : `Epoch ${secHoveredIdx + 1}`}
                    </div>
                    <div className="flex flex-col gap-0.5 text-muted-foreground font-mono">
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Train:</span>
                        <span className="text-foreground font-bold">
                          {isRegression
                            ? secondariesToPlot[secHoveredIdx]?.toFixed(4)
                            : `${((secondariesToPlot[secHoveredIdx] ?? 0) * 100).toFixed(1)}%`}
                        </span>
                      </div>
                      {!plotSteps && valSecondariesToPlot[secHoveredIdx] !== null && (
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" /> Val:</span>
                          <span className="text-foreground font-bold">
                            {isRegression
                              ? (valSecondariesToPlot[secHoveredIdx] as number).toFixed(4)
                              : `${((valSecondariesToPlot[secHoveredIdx] as number) * 100).toFixed(1)}%`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-[10px] text-muted-foreground/30 uppercase font-bold tracking-widest select-none">
                Requires active training steps
            </div>
          );
        })()}

      </div>
    </div>
  );
}
