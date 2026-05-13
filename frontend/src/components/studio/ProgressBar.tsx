interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'purple' | 'amber';
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const colorClasses = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  purple: 'bg-purple-500',
  amber: 'bg-amber-500',
};

const bgColorClasses = {
  blue: 'bg-blue-500/20',
  green: 'bg-emerald-500/20',
  purple: 'bg-purple-500/20',
  amber: 'bg-amber-500/20',
};

function ProgressBar({
  current,
  total,
  label,
  showPercentage = true,
  size = 'md',
  color = 'blue',
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  
  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-sm font-medium text-slate-300">{label}</span>
          )}
          {showPercentage && (
            <span className="text-sm font-medium text-slate-400">
              {percentage}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full rounded-full ${bgColorClasses[color]} ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} rounded-full ${colorClasses[color]} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {total > 0 && (
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-slate-500">
            {current.toLocaleString()} / {total.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

export default ProgressBar;
