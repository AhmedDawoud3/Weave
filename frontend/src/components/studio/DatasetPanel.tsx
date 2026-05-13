import { useEffect } from 'react';
import { Database, FolderOpen, Box, Loader2, AlertCircle, Download, CheckCircle2 } from 'lucide-react';
import { useShapeStore, formatShape } from '../../store/shapeStore';

export interface DatasetConfig {
  datasetName: string;
  customPath: string;
  batchSize: number;
  shuffle: boolean;
  normalize: boolean;
  numWorkers: number;
}

interface DatasetPanelProps {
  config: DatasetConfig;
  onChange: (config: DatasetConfig) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function DatasetPanel({ config, onChange, isExpanded, onToggleExpand }: DatasetPanelProps) {
  // Shape store for fetching and displaying dataset shape
  const { 
    datasetInputShape, 
    datasetNumClasses, 
    isLoadingShape, 
    shapeError,
    fetchDatasetShape,
    downloadStatus,
    isCheckingDownloadStatus,
    checkDatasetStatus,
    downloadDataset,
  } = useShapeStore();

  const handleChange = (field: keyof DatasetConfig, value: string | number | boolean) => {
    onChange({ ...config, [field]: value });
  };

  const isCustomDataset = config.datasetName === 'Custom (ImageFolder)';
  const isImageNet = config.datasetName === 'ImageNet';

  // Check download status when dataset changes
  useEffect(() => {
    if (config.datasetName && !isCustomDataset) {
      checkDatasetStatus(config.datasetName);
    }
  }, [config.datasetName, isCustomDataset, checkDatasetStatus]);

  // Fetch shape when dataset changes (only if downloaded or custom)
  useEffect(() => {
    const customPath = isCustomDataset ? config.customPath : undefined;
    // Only fetch if we have a valid dataset name (and path for custom)
    // For standard datasets, only fetch if downloaded
    const isDownloaded = downloadStatus?.isDownloaded || isCustomDataset;
    if (config.datasetName && (!isCustomDataset || customPath) && isDownloaded) {
      fetchDatasetShape(config.datasetName, customPath);
    }
  }, [config.datasetName, config.customPath, isCustomDataset, fetchDatasetShape, downloadStatus?.isDownloaded]);

  const handleDownload = () => {
    if (config.datasetName && !isCustomDataset && !isImageNet) {
      downloadDataset(config.datasetName);
    }
  };

  // Determine if dataset is ready to use
  const isDatasetReady = isCustomDataset || downloadStatus?.isDownloaded;

  return (
    <div className="flex flex-col border-b border-slate-700">
      {/* Sticky Tab Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="sticky top-0 z-10 flex items-center justify-between gap-2 p-4 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer border-b border-slate-700"
      >
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-white">Dataset Configuration</h2>
        </div>
        <span className="text-slate-400 text-xl">{isExpanded ? '−' : '+'}</span>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-4 flex flex-col gap-4">
          {/* Dataset Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="datasetName" className="text-sm font-medium text-slate-300">
              Dataset Name
            </label>
            <select
              id="datasetName"
              value={config.datasetName}
              onChange={(e) => handleChange('datasetName', e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="MNIST">MNIST</option>
              <option value="CIFAR-10">CIFAR-10</option>
              <option value="CIFAR-100">CIFAR-100</option>
              <option value="FashionMNIST">FashionMNIST</option>
              <option value="ImageNet">ImageNet</option>
              <option value="Custom (ImageFolder)">Custom (ImageFolder)</option>
            </select>
          </div>

          {/* Custom Path (shown only for ImageFolder) */}
          {isCustomDataset && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-yellow-500" />
                <label htmlFor="customPath" className="text-sm font-medium text-slate-300">
                  Dataset Path
                </label>
              </div>
              <input
                type="text"
                id="customPath"
                value={config.customPath}
                onChange={(e) => handleChange('customPath', e.target.value)}
                placeholder="/path/to/your/dataset"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500">
                Path to folder with subdirectories for each class (ImageFolder format)
              </p>
            </div>
          )}

          {/* Download Status Panel (for standard datasets) */}
          {!isCustomDataset && (
            <div className="flex flex-col gap-2 p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-slate-300">Download Status</span>
                </div>
                {isCheckingDownloadStatus && (
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                )}
              </div>

              {/* Downloaded state */}
              {downloadStatus?.isDownloaded && !downloadStatus.isDownloading && (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Dataset downloaded and ready</span>
                </div>
              )}

              {/* Downloading state */}
              {downloadStatus?.isDownloading && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm text-blue-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Downloading...</span>
                  </div>
                  {downloadStatus.downloadProgress && (
                    <div className="px-2 py-1.5 bg-slate-800 rounded text-xs text-slate-300 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                      {downloadStatus.downloadProgress}
                    </div>
                  )}
                </div>
              )}

              {/* Not downloaded state */}
              {!downloadStatus?.isDownloaded && !downloadStatus?.isDownloading && !isCheckingDownloadStatus && (
                <div className="flex flex-col gap-2">
                  {isImageNet ? (
                    <div className="flex items-center gap-2 text-xs text-amber-400">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>ImageNet must be downloaded manually due to its size</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm text-amber-400">
                        <AlertCircle className="w-4 h-4" />
                        <span>Dataset not downloaded</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download {config.datasetName}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Error state */}
              {downloadStatus?.error && !downloadStatus.isDownloading && (
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span>{downloadStatus.error}</span>
                </div>
              )}
            </div>
          )}

          {/* Input Shape Display (only shown when dataset is ready) */}
          {isDatasetReady && (
            <div className="flex flex-col gap-1.5 p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-slate-300">Input Shape</span>
                {isLoadingShape && (
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                )}
              </div>
              
              {shapeError && !datasetInputShape && (
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="w-3 h-3" />
                  <span>{shapeError}</span>
                </div>
              )}
              
              {datasetInputShape && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Shape:</span>
                    <code className="px-1.5 py-0.5 bg-slate-800 rounded text-blue-300 font-mono text-xs">
                      {formatShape(datasetInputShape)}
                    </code>
                  </div>
                  {datasetNumClasses && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Classes:</span>
                      <code className="px-1.5 py-0.5 bg-slate-800 rounded text-emerald-300 font-mono text-xs">
                        {datasetNumClasses}
                      </code>
                    </div>
                  )}
                </div>
              )}
              
              {!datasetInputShape && !isLoadingShape && !shapeError && (
                <p className="text-xs text-slate-500">
                  Detecting input shape...
                </p>
              )}
            </div>
          )}

          {/* Batch Size */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="batchSize" className="text-sm font-medium text-slate-300">
              Batch Size
            </label>
            <input
              type="number"
              id="batchSize"
              value={config.batchSize}
              onChange={(e) => handleChange('batchSize', parseInt(e.target.value, 10) || config.batchSize)}
              min={1}
              max={512}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Num Workers */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="numWorkers" className="text-sm font-medium text-slate-300">
              Num Workers
            </label>
            <input
              type="number"
              id="numWorkers"
              value={config.numWorkers}
              onChange={(e) => handleChange('numWorkers', parseInt(e.target.value, 10) || config.numWorkers)}
              min={0}
              max={16}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Pre-processing Options */}
          <fieldset className="flex flex-col gap-3 pt-2">
            <legend className="text-sm font-medium text-slate-300 mb-2">Pre-processing</legend>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.shuffle}
                onChange={(e) => handleChange('shuffle', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-800"
              />
              <span className="text-sm text-slate-300">Shuffle Data</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.normalize}
                onChange={(e) => handleChange('normalize', e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-800"
              />
              <span className="text-sm text-slate-300">Normalize</span>
            </label>
          </fieldset>

          <p className="text-xs text-slate-500 pt-2 border-t border-slate-700">
            Configure your dataset and pre-processing options here.
          </p>
        </div>
      )}
    </div>
  );
}

export default DatasetPanel;
