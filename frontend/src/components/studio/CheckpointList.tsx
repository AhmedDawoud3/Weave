import { Save, Download, Trash2, FileBox } from 'lucide-react';
import type { Checkpoint } from '../../store/trainingStore';

interface CheckpointListProps {
  checkpoints: Checkpoint[];
  onLoad?: (checkpoint: Checkpoint) => void;
  onDelete?: (checkpoint: Checkpoint) => void;
}

function CheckpointList({ checkpoints, onLoad, onDelete }: CheckpointListProps) {
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (checkpoints.length === 0) {
    return (
      <div className="bg-slate-700/30 rounded-lg border border-slate-600/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Save className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-300">Checkpoints</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-slate-500">
          <FileBox className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No checkpoints saved yet</p>
          <p className="text-xs mt-1">Checkpoints will appear here during training</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-700/30 rounded-lg border border-slate-600/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Save className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-medium text-slate-300">
          Checkpoints ({checkpoints.length})
        </h3>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {checkpoints.map((checkpoint, index) => (
          <div
            key={`${checkpoint.path}-${index}`}
            className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3 hover:bg-slate-800 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">
                  Epoch {checkpoint.epoch}
                </span>
                <span className="text-xs text-slate-500">
                  {formatTime(checkpoint.timestamp)}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-400">
                  Loss: <span className="text-red-400">{checkpoint.loss.toFixed(4)}</span>
                </span>
                {checkpoint.accuracy !== undefined && (
                  <span className="text-xs text-slate-400">
                    Acc: <span className="text-emerald-400">{checkpoint.accuracy.toFixed(1)}%</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              {onLoad && (
                <button
                  type="button"
                  onClick={() => onLoad(checkpoint)}
                  className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                  title="Load checkpoint"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(checkpoint)}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  title="Delete checkpoint"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CheckpointList;
