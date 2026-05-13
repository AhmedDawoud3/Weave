import { Activity, Clock, Target, TrendingDown, Zap, Timer } from 'lucide-react';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
}

function MetricCard({ icon, label, value, subValue, color }: MetricCardProps) {
  return (
    <div className="bg-slate-700/50 rounded-lg p-3 flex items-start gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-semibold text-white truncate">{value}</p>
        {subValue && (
          <p className="text-xs text-slate-500">{subValue}</p>
        )}
      </div>
    </div>
  );
}

interface TrainingMetricsProps {
  currentEpoch: number;
  totalEpochs: number;
  trainLoss: number;
  valLoss?: number;
  trainAccuracy: number;
  valAccuracy?: number;
  timePerEpoch: number;
  eta: string;
  isRunning: boolean;
}

function TrainingMetrics({
  currentEpoch,
  totalEpochs,
  trainLoss,
  valLoss,
  trainAccuracy,
  valAccuracy,
  timePerEpoch,
  eta,
  isRunning,
}: TrainingMetricsProps) {
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds <= 0) return '--';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Epoch Progress */}
      <MetricCard
        icon={<Activity className="w-4 h-4 text-blue-400" />}
        label="Epoch"
        value={`${currentEpoch} / ${totalEpochs}`}
        subValue={isRunning ? 'Training...' : currentEpoch === totalEpochs ? 'Complete' : 'Idle'}
        color="bg-blue-500/20"
      />
      
      {/* Training Loss */}
      <MetricCard
        icon={<TrendingDown className="w-4 h-4 text-red-400" />}
        label="Train Loss"
        value={trainLoss > 0 ? trainLoss.toFixed(4) : '--'}
        subValue={valLoss ? `Val: ${valLoss.toFixed(4)}` : undefined}
        color="bg-red-500/20"
      />
      
      {/* Training Accuracy */}
      <MetricCard
        icon={<Target className="w-4 h-4 text-emerald-400" />}
        label="Train Accuracy"
        value={trainAccuracy > 0 ? `${trainAccuracy.toFixed(1)}%` : '--'}
        subValue={valAccuracy ? `Val: ${valAccuracy.toFixed(1)}%` : undefined}
        color="bg-emerald-500/20"
      />
      
      {/* Time per Epoch */}
      <MetricCard
        icon={<Timer className="w-4 h-4 text-amber-400" />}
        label="Time/Epoch"
        value={formatTime(timePerEpoch)}
        color="bg-amber-500/20"
      />
      
      {/* ETA */}
      <MetricCard
        icon={<Clock className="w-4 h-4 text-purple-400" />}
        label="ETA"
        value={eta}
        color="bg-purple-500/20"
      />
      
      {/* Status */}
      <MetricCard
        icon={<Zap className="w-4 h-4 text-cyan-400" />}
        label="Status"
        value={isRunning ? 'Running' : 'Stopped'}
        color="bg-cyan-500/20"
      />
    </div>
  );
}

export default TrainingMetrics;
