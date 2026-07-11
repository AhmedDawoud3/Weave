import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

interface CustomDatasetFormProps {
  datasetConfig: any;
  onConfigChange: (config: any) => void;
  scanStatus: 'idle' | 'scanning' | 'success' | 'error';
  scanResult: any;
  scanError: string | null;
  onScanPath: (path: string, modality?: string) => void;
  onModalityChange: (modality: 'image' | 'text' | 'tabular' | 'audio') => void;
}

export function CustomDatasetForm({
  datasetConfig,
  onConfigChange,
  scanStatus,
  scanResult,
  scanError,
  onScanPath,
  onModalityChange
}: CustomDatasetFormProps) {
  const { source } = datasetConfig;
  const modality = source === 'image_folder' ? 'image' : datasetConfig.modality;

  return (
    <div className="space-y-5">
      {source === 'image_folder' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
              Root Folder
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={datasetConfig.root || ''}
                onChange={(e) => onConfigChange({ ...datasetConfig, root: e.target.value })}
                className="flex-1 text-xs bg-foreground/[0.45] border border-border rounded-xl px-3 py-2 focus:outline-none focus:border-primary text-foreground nodrag"
                placeholder="e.g. /home/datasets/images"
              />
              <Button 
                onClick={() => onScanPath(datasetConfig.root || '', 'image')} 
                disabled={scanStatus === 'scanning'}
                className="bg-primary/10 border border-primary/20 hover:bg-primary/20 text-[#40d3b6] rounded-xl text-xs px-3 font-bold shrink-0 h-9"
              >
                {scanStatus === 'scanning' ? <Loader2 size={12} className="animate-spin" /> : 'Scan'}
              </Button>
            </div>
            {scanStatus !== 'idle' && (
              <div className="mt-2 text-[10px] font-mono bg-white/[0.02] border border-border p-3 rounded-xl">
                {scanResult && (
                  <div className="text-xs text-[#40d3b6] leading-relaxed">
                    <div className="font-extrabold uppercase text-[9px] mb-1">Scan Success</div>
                    {scanResult.num_classes !== undefined && <div>Classes: {scanResult.num_classes}</div>}
                    {scanResult.total_images !== undefined && <div>Images: {scanResult.total_images}</div>}
                  </div>
                )}
                {scanError && <div className="text-red-400">❌ Error: {scanError}</div>}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                Split Ratio
              </label>
              <span className="text-[10px] text-[#40d3b6] font-mono font-bold">
                {Math.round(datasetConfig.split_ratio * 100)}% Train / {Math.round((1 - datasetConfig.split_ratio) * 100)}% Test
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={datasetConfig.split_ratio || 0.8}
              onChange={(e) => onConfigChange({ ...datasetConfig, split_ratio: parseFloat(e.target.value) })}
              className="w-full accent-primary focus:outline-none nodrag cursor-pointer"
            />
          </div>
        </div>
      )}

      {source === 'custom' && (
        <div className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
              Custom Modality
            </label>
            <div className="grid grid-cols-4 gap-1 bg-foreground/40 p-1 border border-border rounded-xl">
              {(['image', 'text', 'tabular', 'audio'] as const).map((m) => {
                const isActive = modality === m;
                return (
                  <button
                    key={m}
                    onClick={() => onModalityChange(m)}
                    className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                      isActive 
                        ? 'bg-primary/20 text-[#40d3b6] shadow-[0_0_8px_rgba(108,60,225,0.15)]' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {modality === 'image' && (
            <div className="space-y-3.5 pt-1">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-[#40d3b6] font-extrabold uppercase">Images Directory</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={datasetConfig.root || ''}
                    onChange={(e) => onConfigChange({ ...datasetConfig, root: e.target.value })}
                    className="flex-1 text-xs bg-foreground/[0.45] border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary nodrag"
                    placeholder="Path to root folder"
                  />
                  <Button 
                    onClick={() => onScanPath(datasetConfig.root || '', 'image')} 
                    disabled={scanStatus === 'scanning'}
                    className="bg-primary/10 border border-primary/20 text-[#40d3b6] rounded-xl text-xs px-3 h-9 font-bold"
                  >
                    {scanStatus === 'scanning' ? <Loader2 size={12} className="animate-spin" /> : 'Scan'}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Labels Schema</span>
                <div className="grid grid-cols-2 gap-1 bg-foreground/40 p-1 border border-border rounded-xl w-44">
                  {(['folder', 'csv'] as const).map((src) => (
                    <button
                      key={src}
                      onClick={() => onConfigChange({ ...datasetConfig, label_source: src })}
                      className={`py-1 text-[10px] font-black uppercase rounded-md transition-all ${
                        datasetConfig.label_source === src ? 'bg-primary/20 text-[#40d3b6]' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {src === 'folder' ? 'Subfolders' : 'CSV Index'}
                    </button>
                  ))}
                </div>
              </div>

              {datasetConfig.label_source === 'csv' && (
                <div className="space-y-3 p-3 bg-white/[0.02] border border-border rounded-xl">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">CSV Index File Path</span>
                    <input
                      type="text"
                      value={datasetConfig.label_file || ''}
                      onChange={(e) => onConfigChange({ ...datasetConfig, label_file: e.target.value })}
                      className="text-xs bg-foreground/[0.45] border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary nodrag"
                      placeholder="Path to annotations.csv"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Image Col</span>
                      <input
                        type="text"
                        value={datasetConfig.image_column || ''}
                        onChange={(e) => onConfigChange({ ...datasetConfig, image_column: e.target.value })}
                        className="text-xs bg-foreground/[0.45] border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary nodrag"
                        placeholder="image_path"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Label Col</span>
                      <input
                        type="text"
                        value={datasetConfig.label_column || ''}
                        onChange={(e) => onConfigChange({ ...datasetConfig, label_column: e.target.value })}
                        className="text-xs bg-foreground/[0.45] border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary nodrag"
                        placeholder="label"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">File Extension Glob</span>
                <input
                  type="text"
                  value={datasetConfig.file_pattern || '*.jpg'}
                  onChange={(e) => onConfigChange({ ...datasetConfig, file_pattern: e.target.value })}
                  className="text-xs bg-foreground/[0.45] border border-border rounded-xl px-3 py-1.5 text-foreground font-mono focus:outline-none focus:border-primary nodrag"
                />
              </div>
            </div>
          )}

          {modality === 'text' && (
            <div className="space-y-4 pt-1">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-[#40d3b6] font-extrabold uppercase">CSV file path</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={datasetConfig.file_path || ''}
                    onChange={(e) => onConfigChange({ ...datasetConfig, file_path: e.target.value })}
                    className="flex-1 text-xs bg-foreground/[0.45] border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary nodrag"
                    placeholder="Path to CSV dataset"
                  />
                  <Button 
                    onClick={() => onScanPath(datasetConfig.file_path || '', 'text')} 
                    disabled={scanStatus === 'scanning'}
                    className="bg-primary/10 border border-primary/20 text-[#40d3b6] rounded-xl text-xs px-3 h-9 font-bold font-sans"
                  >
                    {scanStatus === 'scanning' ? <Loader2 size={12} className="animate-spin" /> : 'Scan'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Text Column</span>
                  <input
                    type="text"
                    value={datasetConfig.text_column || 'text'}
                    onChange={(e) => onConfigChange({ ...datasetConfig, text_column: e.target.value })}
                    className="text-xs bg-foreground/[0.45] border border-border rounded-xl px-3 py-1.5 text-foreground focus:outline-none focus:border-primary nodrag"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Label Column</span>
                  <input
                    type="text"
                    value={datasetConfig.label_column || 'label'}
                    onChange={(e) => onConfigChange({ ...datasetConfig, label_column: e.target.value })}
                    className="text-xs bg-foreground/[0.45] border border-border rounded-xl px-3 py-1.5 text-foreground focus:outline-none focus:border-primary nodrag"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-3 space-y-3">
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Tokenizer Specs</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Vocab Size</span>
                    <input
                      type="number"
                      value={datasetConfig.vocab_size || 30000}
                      onChange={(e) => onConfigChange({ ...datasetConfig, vocab_size: parseInt(e.target.value) })}
                      className="text-xs bg-foreground/[0.45] border border-border rounded-xl px-3 py-1.5 text-foreground focus:outline-none focus:border-primary nodrag"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Max Seq Length</span>
                    <input
                      type="number"
                      value={datasetConfig.max_length || 512}
                      onChange={(e) => onConfigChange({ ...datasetConfig, max_length: parseInt(e.target.value) })}
                      className="text-xs bg-foreground/[0.45] border border-border rounded-xl px-3 py-1.5 text-foreground focus:outline-none focus:border-primary nodrag"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 bg-white/[0.01] px-1.5 rounded-md">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Lowercase Text</span>
                  <button
                    type="button"
                    className={`nodrag text-[10px] px-2 py-0.5 rounded font-bold border transition-all cursor-pointer ${
                      datasetConfig.lowercase !== false ? 'bg-primary/20 border-primary/45 text-primary' : 'bg-foreground/5 border-border text-neutral-400'
                    }`}
                    onClick={() => onConfigChange({ ...datasetConfig, lowercase: datasetConfig.lowercase !== false ? false : true })}
                  >
                    {datasetConfig.lowercase !== false ? 'true' : 'false'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {modality === 'tabular' && (
            <div className="space-y-4 pt-1">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-[#40d3b6] font-extrabold uppercase font-sans">CSV File Path</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={datasetConfig.file_path || ''}
                    onChange={(e) => onConfigChange({ ...datasetConfig, file_path: e.target.value })}
                    className="flex-1 text-xs bg-foreground/[0.45] border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary nodrag"
                    placeholder="Path to tabular file"
                  />
                  <Button 
                    onClick={() => onScanPath(datasetConfig.file_path || '', 'tabular')} 
                    disabled={scanStatus === 'scanning'}
                    className="bg-primary/10 border border-primary/20 text-[#40d3b6] rounded-xl text-xs px-3 h-9 font-bold font-sans"
                  >
                    {scanStatus === 'scanning' ? <Loader2 size={12} className="animate-spin" /> : 'Scan'}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Target Column</span>
                <input
                  type="text"
                  value={datasetConfig.target_column || ''}
                  onChange={(e) => onConfigChange({ ...datasetConfig, target_column: e.target.value })}
                  className="text-xs bg-foreground/[0.45] border border-border rounded-xl px-3 py-1.5 text-foreground focus:outline-none focus:border-primary nodrag"
                  placeholder="Column to predict"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Feature Columns (CSV List)</span>
                <input
                  type="text"
                  value={datasetConfig.feature_columns ? datasetConfig.feature_columns.join(', ') : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const cols = val.split(',').map(s => s.trim()).filter(s => s !== '');
                    onConfigChange({ ...datasetConfig, feature_columns: cols });
                  }}
                  className="text-xs bg-foreground/[0.45] border border-border rounded-xl px-3 py-1.5 text-foreground focus:outline-none focus:border-primary nodrag"
                  placeholder="Optional: col1, col2 (empty for all)"
                />
              </div>
            </div>
          )}

          {modality === 'audio' && (
            <div className="space-y-4 pt-1">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-[#40d3b6] font-extrabold uppercase">Audio Directory</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={datasetConfig.root || ''}
                    onChange={(e) => onConfigChange({ ...datasetConfig, root: e.target.value })}
                    className="flex-1 text-xs bg-foreground/[0.45] border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary nodrag"
                    placeholder="Path to audio root folder"
                  />
                  <Button 
                    onClick={() => onScanPath(datasetConfig.root || '', 'audio')} 
                    disabled={scanStatus === 'scanning'}
                    className="bg-primary/10 border border-primary/20 text-[#40d3b6] rounded-xl text-xs px-3 h-9 font-bold"
                  >
                    {scanStatus === 'scanning' ? <Loader2 size={12} className="animate-spin" /> : 'Scan'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Sample Rate (Hz)</span>
                  <input
                    type="number"
                    value={datasetConfig.sample_rate || 16000}
                    onChange={(e) => onConfigChange({ ...datasetConfig, sample_rate: parseInt(e.target.value) })}
                    className="text-xs bg-foreground/[0.45] border border-border rounded-xl px-3 py-1.5 text-foreground focus:outline-none focus:border-primary nodrag"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Max Duration (s)</span>
                  <input
                    type="number"
                    value={datasetConfig.max_duration || 5}
                    onChange={(e) => onConfigChange({ ...datasetConfig, max_duration: parseFloat(e.target.value) })}
                    className="text-xs bg-foreground/[0.45] border border-border rounded-xl px-3 py-1.5 text-foreground focus:outline-none focus:border-primary nodrag"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Scanner details for custom source */}
          {scanStatus !== 'idle' && (
            <div className="mt-2 text-[10px] font-mono bg-white/[0.02] border border-border p-3 rounded-xl select-none">
              {scanResult && (
                <div className="text-xs text-[#40d3b6] leading-relaxed">
                  <div className="font-extrabold uppercase text-[9px] mb-1">Scan Success</div>
                  {scanResult.num_samples !== undefined && <div>Samples: {scanResult.num_samples}</div>}
                  {scanResult.num_features !== undefined && <div>Features: {scanResult.num_features}</div>}
                  {scanResult.shape !== undefined && <div>Feature Shape: {JSON.stringify(scanResult.shape)}</div>}
                  {scanResult.num_classes !== undefined && <div>Classes: {scanResult.num_classes}</div>}
                </div>
              )}
              {scanError && <div className="text-red-400">❌ Error: {scanError}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
