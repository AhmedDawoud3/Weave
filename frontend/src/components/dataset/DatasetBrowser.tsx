import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { DatasetCatalogEntry } from '../../types';

interface DatasetBrowserProps {
  datasetConfig: any;
  datasetsCatalog: DatasetCatalogEntry[];
  datasetDownloadStatus: Record<string, string>;
  datasetDownloadProgress: Record<string, any>;
  activePredefinedCategory: string;
  setActivePredefinedCategory: (cat: string) => void;
  onSelectDataset: (name: string) => void;
  onDownloadDataset: (name: string) => void;
  onConfigChange: (config: any) => void;
}

export function DatasetBrowser({
  datasetConfig,
  datasetsCatalog,
  datasetDownloadStatus,
  datasetDownloadProgress,
  activePredefinedCategory,
  setActivePredefinedCategory,
  onSelectDataset,
  onDownloadDataset,
  onConfigChange
}: DatasetBrowserProps) {
  const selectedName = datasetConfig && datasetConfig.source === 'predefined' ? datasetConfig.name : null;
  const status = selectedName ? (datasetDownloadStatus[selectedName] || 'not_downloaded') : 'not_downloaded';
  const progress = selectedName ? datasetDownloadProgress[selectedName] : null;
  const selectedDatasetEntry = datasetsCatalog.find(d => d.name === selectedName);

  const categories = ['FAMOUS', ...Array.from(new Set(datasetsCatalog.map(d => d.category || 'FAMOUS'))).filter(c => c !== 'FAMOUS' && c !== '')];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest block">
          Predefined Datasets
        </label>
        {categories.length > 1 && (
          <div className="flex gap-1 bg-black/45 p-0.5 border border-border rounded-lg">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActivePredefinedCategory(cat)}
                className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md transition-all ${
                  activePredefinedCategory === cat 
                    ? 'bg-primary/25 text-[#40d3b6] font-extrabold shadow-[0_0_8px_rgba(108,60,225,0.15)]' 
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {datasetsCatalog
          .filter(d => (d.category || 'FAMOUS') === activePredefinedCategory)
          .map((dataset) => {
            const isSelected = selectedName === dataset.name;
            const dsStatus = datasetDownloadStatus[dataset.name] || 'not_downloaded';
            return (
              <div
                key={dataset.name}
                onClick={() => onSelectDataset(dataset.name)}
                className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between h-20 transition-all ${
                  isSelected 
                    ? 'border-accent/60 bg-accent/5 shadow-glow' 
                    : 'border-border bg-black/10 hover:bg-black/20'
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-black text-white">{dataset.name}</span>
                    {dsStatus === 'downloaded' && (
                      <span className="px-1 py-0.5 text-[8px] font-black uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Downloaded</span>
                    )}
                    {(dsStatus === 'downloading' || dsStatus === 'starting') && (
                      <span className="px-1 py-0.5 text-[8px] font-black uppercase tracking-wider rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">Downloading</span>
                    )}
                    {dsStatus === 'not_downloaded' && (
                      <span className="px-1 py-0.5 text-[8px] font-black uppercase tracking-wider rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Ready</span>
                    )}
                    {dsStatus === 'failed' && (
                      <span className="px-1 py-0.5 text-[8px] font-black uppercase tracking-wider rounded bg-red-500/10 text-red-400 border border-red-500/20">Failed</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate">{dataset.description}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-primary/80 font-bold">
                    {dataset.shape?.join('×')}
                  </span>
                  <span className="text-[10px] text-muted-foreground/80 font-black">
                    {dataset.num_classes} CLS {dataset.size ? `• ${dataset.size}` : ''}
                  </span>
                </div>
              </div>
            );
          })}
      </div>

      {selectedName && (
        <div className="p-4 rounded-xl border border-border bg-black/10 space-y-4">
          {selectedDatasetEntry && (
            <div className="bg-black/20 border border-border rounded-xl p-3 space-y-2.5">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-black text-white">{selectedDatasetEntry.name}</span>
                  <p className="text-[10px] text-muted-foreground leading-normal">{selectedDatasetEntry.description}</p>
                </div>
                <span className="text-[10px] bg-accent/15 text-accent border border-accent/20 rounded-md px-1.5 py-0.5 font-bold uppercase tracking-wider">
                  {selectedDatasetEntry.modality}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 border-t border-border pt-2 text-[10px] font-mono">
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-[8px] uppercase font-sans">Input Shape</span>
                  <span className="text-white font-bold">{selectedDatasetEntry.shape?.join('×') || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-[8px] uppercase font-sans">Classes</span>
                  <span className="text-white font-bold">{selectedDatasetEntry.num_classes || 'N/A'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-[8px] uppercase font-sans">Size</span>
                  <span className="text-white font-bold">{selectedDatasetEntry.size || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                Download Status
              </span>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                {status === 'downloaded' && (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                    Already Downloaded
                  </>
                )}
                {(status === 'downloading' || status === 'starting') && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                    Downloading...
                  </>
                )}
                {status === 'not_downloaded' && (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                    Not Downloaded
                  </>
                )}
                {status === 'failed' && (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_8px_#f87171]" />
                    Download Failed
                  </>
                )}
              </span>
            </div>

            {status === 'not_downloaded' && (
              <Button
                onClick={() => onDownloadDataset(selectedName)}
                size="sm"
                className="h-8 text-xs bg-accent hover:bg-accent/90 text-white font-bold px-3 rounded-lg shadow-glow"
              >
                Download Dataset
              </Button>
            )}
            {status === 'failed' && (
              <Button
                onClick={() => onDownloadDataset(selectedName)}
                size="sm"
                variant="destructive"
                className="h-8 text-xs font-bold px-3 rounded-lg"
              >
                Retry Download
              </Button>
            )}
          </div>

          {(status === 'downloading' || status === 'starting') && progress && (
            <div className="space-y-1.5">
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-border">
                <div 
                  className="bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>{Math.round(progress.percent)}%</span>
                {progress.total_bytes > 0 && (
                  <span>
                    {(progress.bytes_downloaded / (1024 * 1024)).toFixed(1)} MB / {(progress.total_bytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5 mt-4">
        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Split</span>
        <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 border border-border rounded-xl w-36">
          {(['train', 'test'] as const).map((split) => (
            <button
              key={split}
              onClick={() => onConfigChange({ ...datasetConfig, split })}
              className={`py-1 text-[10px] font-black uppercase rounded-md transition-all ${
                datasetConfig.split === split 
                  ? 'bg-primary/20 text-[#40d3b6] font-bold shadow-[0_0_8px_rgba(108,60,225,0.15)]' 
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              {split}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
