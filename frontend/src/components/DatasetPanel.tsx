import { useEffect, useState } from 'react';
import { useWeaveStore } from '../store/useWeaveStore';
import { api } from '../services/api';
import { 
  Database, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronRight, 
  Plus, Trash2, ArrowUp, ArrowDown, ToggleLeft, ToggleRight, Settings 
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { DatasetCatalogEntry, TransformCatalogEntry } from '../types';

export function DatasetPanel() {
  const {
    datasetConfig,
    inferredDatasetShape,
    isInferringDatasetShape,
    setDatasetConfig,
    setDatasetSource,
    addTransform,
    removeTransform,
    reorderTransforms,
    updateTransformParam,
    setDataLoaderConfig,
    datasetDownloadStatus,
    datasetDownloadProgress,
    checkDatasetStatus,
    downloadDataset
  } = useWeaveStore();

  const [datasetsCatalog, setDatasetsCatalog] = useState<DatasetCatalogEntry[]>([]);
  const [transformsCatalog, setTransformsCatalog] = useState<TransformCatalogEntry[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Accordion state
  const [showDataLoader, setShowDataLoader] = useState(false);
  const [expandedTransformIndex, setExpandedTransformIndex] = useState<number | null>(null);
  const [addTransformOpen, setAddTransformOpen] = useState(false);

  // Validation response state
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Path Scanner state
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Dataset Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    samples: any[];
    total_size: number;
    modality: string;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handleScanPath = async (path: string, modality?: string) => {
    if (!path) return;
    setScanStatus('scanning');
    setScanError(null);
    setScanResult(null);
    try {
      const res = await api.engine.scanDataset(path, modality);
      if (res.status === 'success') {
        setScanStatus('success');
        setScanResult(res.result);
      } else {
        setScanStatus('error');
        setScanError(res.message || 'Scanning failed.');
      }
    } catch (err: any) {
      setScanStatus('error');
      setScanError(err.message || 'Error occurred while scanning path.');
    }
  };

  const handleFetchPreview = async () => {
    if (!datasetConfig) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await api.engine.previewDataset(datasetConfig, 6);
      if (res.status === 'success') {
        let detectedModality = 'image';
        if (datasetConfig.source === 'custom') {
          detectedModality = datasetConfig.modality || 'image';
        }
        setPreviewResult({
          samples: res.samples || [],
          total_size: res.total_size || 0,
          modality: detectedModality
        });
      } else {
        setPreviewError(res.message || 'Failed to preview dataset.');
      }
    } catch (err: any) {
      setPreviewError(err.message || 'Error loading dataset preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (showPreview) {
      handleFetchPreview();
    }
  }, [showPreview, datasetConfig]);

  // Reset scan and preview result on config/modality changes
  const resetScanAndPreview = () => {
    setScanStatus('idle');
    setScanResult(null);
    setScanError(null);
    setPreviewResult(null);
    setPreviewError(null);
  };

  const renderScanResults = () => {
    if (scanStatus === 'idle') return null;
    return (
      <div className="mt-2 text-[10px] select-none font-mono">
        {scanResult && (
          <div className="p-3 bg-[#40d3b6]/5 border border-[#40d3b6]/15 rounded-xl text-[#40d3b6] leading-relaxed">
            <div className="font-extrabold uppercase tracking-widest text-[9px] mb-1.5 border-b border-[#40d3b6]/10 pb-0.5">Scan Complete</div>
            {scanResult.num_classes !== undefined && (
              <div>Classes ({scanResult.num_classes}): {scanResult.classes?.slice(0, 5).join(', ')}{scanResult.classes?.length > 5 ? '...' : ''}</div>
            )}
            {scanResult.total_images !== undefined && <div>Total Images: {scanResult.total_images}</div>}
            {scanResult.total_files !== undefined && <div>Total Files: {scanResult.total_files}</div>}
            {scanResult.num_rows !== undefined && <div>Total Rows: {scanResult.num_rows}</div>}
            {scanResult.columns !== undefined && <div className="truncate">Cols: {scanResult.columns.join(', ')}</div>}
          </div>
        )}
        {scanError && (
          <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl text-red-400">
            ❌ Scan failed: {scanError}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    async function loadCatalogs() {
      try {
        setLoadingCatalog(true);
        const [datasetsRes, transformsRes] = await Promise.all([
          api.engine.getDatasetsCatalog(),
          api.engine.getTransformsCatalog()
        ]);
        setDatasetsCatalog(datasetsRes.datasets || []);
        setTransformsCatalog(transformsRes.transforms || []);
        setCatalogError(null);
      } catch (err: any) {
        console.error("Failed to load catalogs:", err);
        setCatalogError("Failed to load catalog schemas from engine.");
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalogs();
  }, []);

  // Check statuses of catalog datasets when they load
  useEffect(() => {
    if (datasetsCatalog.length > 0) {
      datasetsCatalog.forEach((dataset) => {
        checkDatasetStatus(dataset.name);
      });
    }
  }, [datasetsCatalog, checkDatasetStatus]);

  const selectedName = datasetConfig && datasetConfig.source === 'predefined' ? (datasetConfig as any).name : null;

  // Check selected predefined dataset status when it changes
  useEffect(() => {
    if (selectedName) {
      checkDatasetStatus(selectedName);
    }
  }, [selectedName, checkDatasetStatus]);

  // Validate configuration against engine
  const handleValidateConfig = async () => {
    if (!datasetConfig) return;
    try {
      setIsValidating(true);
      const res = await api.engine.validateDataset({ dataset_config: datasetConfig });
      setValidationResult(res);
    } catch (err: any) {
      setValidationResult({
        valid: false,
        errors: [err.message || "Failed to validate dataset config."],
        warnings: []
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Smart defaults for predefined dataset changes
  const handlePredefinedDatasetSelect = (datasetName: string) => {
    if (!datasetConfig || datasetConfig.source !== 'predefined') return;
    
    resetScanAndPreview();

    // Choose appropriate default transforms
    let defaultTransforms: any[] = [{ type: 'ToTensor' }];
    if (datasetName === 'MNIST' || datasetName === 'FashionMNIST') {
      defaultTransforms = [
        { type: 'ToTensor' },
        { type: 'Normalize', mean: [0.1307], std: [0.3081] }
      ];
    } else if (datasetName === 'CIFAR10' || datasetName === 'CIFAR100') {
      defaultTransforms = [
        { type: 'RandomHorizontalFlip', p: 0.5 },
        { type: 'ToTensor' },
        { type: 'Normalize', mean: [0.485, 0.456, 0.406], std: [0.229, 0.224, 0.225] }
      ];
    } else if (datasetName === 'SVHN') {
      defaultTransforms = [
        { type: 'ToTensor' },
        { type: 'Normalize', mean: [0.4377, 0.4438, 0.4728], std: [0.198, 0.201, 0.197] }
      ];
    }

    setDatasetConfig({
      ...datasetConfig,
      name: datasetName,
      transforms: defaultTransforms
    });
  };

  // Switch custom modality fields
  const handleCustomModalityChange = (modality: 'image' | 'text' | 'tabular' | 'audio') => {
    if (!datasetConfig || datasetConfig.source !== 'custom') return;

    resetScanAndPreview();

    setDatasetConfig({
      ...datasetConfig,
      modality,
      root: modality === 'image' || modality === 'audio' ? '' : undefined,
      file_path: modality === 'text' || modality === 'tabular' ? '' : undefined,
      label_source: modality === 'image' || modality === 'audio' ? 'folder' : undefined,
      file_pattern: modality === 'image' ? '*.jpg' : undefined,
      text_column: modality === 'text' ? 'text' : undefined,
      target_column: modality === 'tabular' ? 'target' : undefined,
      feature_columns: modality === 'tabular' ? [] : undefined,
      categorical_columns: modality === 'tabular' ? [] : undefined,
      sample_rate: modality === 'audio' ? 16000 : undefined,
      max_duration_sec: modality === 'audio' ? 1.0 : undefined,
      n_mels: modality === 'audio' ? 64 : undefined,
      transforms: [{ type: 'ToTensor' }]
    });
  };

  // Helper to parse inputs back into appropriate formats
  const handleParamChange = (tIdx: number, paramName: string, valueStr: string, schemaType: string) => {
    let value: any = valueStr;
    
    if (schemaType === 'float' || schemaType === 'int') {
      const parsed = parseFloat(valueStr);
      value = isNaN(parsed) ? 0 : parsed;
    } else if (schemaType === 'tuple_float' || schemaType === 'list_float' || schemaType === 'int_or_list_int') {
      // Check if it looks like a list
      if (valueStr.includes(',')) {
        value = valueStr.split(',').map(s => {
          const parsed = parseFloat(s.trim());
          return isNaN(parsed) ? 0 : parsed;
        });
      } else {
        const parsed = parseFloat(valueStr);
        value = isNaN(parsed) ? 0 : parsed;
      }
    } else if (valueStr === 'true') {
      value = true;
    } else if (valueStr === 'false') {
      value = false;
    }

    updateTransformParam(tIdx, paramName, value);
  };

  // Render parameters editor for an expanded transform row
  const renderTransformParamsEditor = (t: any, index: number) => {
    const catalogItem = transformsCatalog.find(tc => tc.name === t.type);
    if (!catalogItem || !catalogItem.params || Object.keys(catalogItem.params).length === 0) {
      return (
        <div className="text-[10px] text-muted-foreground italic px-2 py-1 bg-white/5 rounded-lg">
          No parameters config needed.
        </div>
      );
    }

    return (
      <div className="space-y-2.5 p-3 bg-white/[0.03] border border-white/5 rounded-xl mt-2 select-none">
        {Object.entries(catalogItem.params).map(([pName, pSchema]: [string, any]) => {
          const currentValue = t[pName] !== undefined ? t[pName] : pSchema.default;
          const valueString = Array.isArray(currentValue) ? currentValue.join(', ') : (currentValue ?? '');

          return (
            <div key={pName} className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold text-[#40d3b6] uppercase tracking-wide">
                  {pName}
                </span>
                <span className="text-[8px] text-muted-foreground italic">
                  {pSchema.type} {pSchema.required ? '(req)' : ''}
                </span>
              </div>
              <input
                type="text"
                value={valueString}
                onChange={(e) => handleParamChange(index, pName, e.target.value, pSchema.type)}
                className="w-full text-[11px] bg-black/40 border border-primary/20 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#40d3b6] font-mono text-white nodrag"
                placeholder={pSchema.description || `Enter value`}
              />
              <span className="text-[9px] text-muted-foreground/60 leading-tight">
                {pSchema.description}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loadingCatalog) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground select-none">
        <Loader2 className="w-8 h-8 animate-spin text-[#40d3b6]" />
        <span className="text-xs font-semibold tracking-wider">LOADING DATASET CATALOG...</span>
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-red-400 select-none p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 animate-pulse" />
        <span className="text-xs font-bold tracking-wider uppercase leading-relaxed">{catalogError}</span>
        <Button onClick={() => window.location.reload()} className="mt-4 text-[10px] uppercase font-black tracking-wider bg-primary/10 border border-primary/20 hover:bg-primary/20 text-[#40d3b6] hover:text-white rounded-xl cursor-pointer">
          Retry Connection
        </Button>
      </div>
    );
  }


  // Pre-initialize datasetConfig if it is null
  if (!datasetConfig) {
    return (
      <div className="flex-1 flex flex-col justify-center px-6 py-10 select-none bg-[#07070a]/90 overflow-y-auto no-scrollbar">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center border border-primary/15 mb-4 shadow-[0_0_15px_rgba(64,211,182,0.05)]">
            <Database className="w-6 h-6 text-[#40d3b6]" />
          </div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Configure Dataset Pipeline</h3>
          <p className="text-[10px] text-muted-foreground mt-2 max-w-[240px] leading-relaxed">
            Choose a data ingestion source to feed your visual model canvas and compute batch shape propagation.
          </p>
        </div>

        <div className="space-y-3.5">
          <button
            onClick={() => setDatasetSource('predefined')}
            className="w-full text-left p-4 rounded-xl border border-primary/10 bg-primary/5 hover:bg-primary/10 hover:border-[#40d3b6]/40 transition-all flex items-start gap-4 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-[#40d3b6] shrink-0 border border-primary/15 group-hover:scale-105 transition-transform">
              <Database size={16} />
            </div>
            <div>
              <h4 className="text-[10px] font-black text-white uppercase tracking-wider mb-0.5">Predefined Catalogs</h4>
              <p className="text-[9px] text-muted-foreground leading-relaxed">MNIST, FashionMNIST, CIFAR-10, and CIFAR-100 built-in benchmarks.</p>
            </div>
          </button>

          <button
            onClick={() => setDatasetSource('image_folder')}
            className="w-full text-left p-4 rounded-xl border border-primary/10 bg-primary/5 hover:bg-primary/10 hover:border-[#40d3b6]/40 transition-all flex items-start gap-4 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-[#40d3b6] shrink-0 border border-primary/15 group-hover:scale-105 transition-transform">
              <Settings size={16} />
            </div>
            <div>
              <h4 className="text-[10px] font-black text-white uppercase tracking-wider mb-0.5">Local Image Folder</h4>
              <p className="text-[9px] text-muted-foreground leading-relaxed">Scan any local filesystem directory of structured raw image classes.</p>
            </div>
          </button>

          <button
            onClick={() => setDatasetSource('custom')}
            className="w-full text-left p-4 rounded-xl border border-primary/10 bg-primary/5 hover:bg-primary/10 hover:border-[#40d3b6]/40 transition-all flex items-start gap-4 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-[#40d3b6] shrink-0 border border-primary/15 group-hover:scale-105 transition-transform">
              <Plus size={16} />
            </div>
            <div>
              <h4 className="text-[10px] font-black text-white uppercase tracking-wider mb-0.5">Custom Ingestion</h4>
              <p className="text-[9px] text-muted-foreground leading-relaxed">Configure tabular CSV files, audio samples, or text data streams.</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  const { source } = datasetConfig;

  return (
    <div className="flex flex-col h-full bg-[#07070a]/90 select-none overflow-y-auto no-scrollbar pb-10">
      
      {/* 2a. Header */}
      <div className="p-5 flex flex-col gap-3 shrink-0 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-[#40d3b6]" />
            <span className="text-xs font-black text-white uppercase tracking-widest">
              Dataset Config
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {isInferringDatasetShape ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#40d3b6]" />
              ) : inferredDatasetShape ? (
                <span className="px-2 py-0.5 rounded-full bg-[#40d3b6]/10 border border-[#40d3b6]/30 text-[#40d3b6] text-[9px] font-black font-mono">
                  {datasetConfig.dataloader?.batch_size || 32} × {inferredDatasetShape.join(' × ')}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[9px] font-black">
                  SHAPE UNKNOWN
                </span>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDatasetConfig(null)}
              className="h-6 w-6 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
              title="Reset dataset configuration"
            >
              <Trash2 size={12} />
            </Button>
          </div>
        </div>

        {/* 2b. Source Type Selector */}
        <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 border border-primary/10 rounded-xl">
          {(['predefined', 'image_folder', 'custom'] as const).map((src) => {
            const labelMap = {
              predefined: 'Predefined',
              image_folder: 'Images Dir',
              custom: 'Custom'
            };
            const isActive = source === src;
            return (
              <button
                key={src}
                onClick={() => setDatasetSource(src)}
                className={`py-1.5 text-[10px] font-black tracking-wide uppercase transition-all rounded-lg ${
                  isActive 
                    ? 'bg-primary/20 text-[#40d3b6] border border-primary/30 shadow-[0_0_8px_rgba(64,211,182,0.1)]' 
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                {labelMap[src]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 p-5 space-y-6">
        
        {/* 2c. Predefined Source View */}
        {source === 'predefined' && (
          <div className="space-y-4">
            <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest block">
              Predefined Source Catalog
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {datasetsCatalog.map((dataset) => {
                const isSelected = datasetConfig.name === dataset.name;
                const status = datasetDownloadStatus[dataset.name] || 'not_downloaded';
                return (
                  <div
                    key={dataset.name}
                    onClick={() => handlePredefinedDatasetSelect(dataset.name)}
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between h-20 transition-all ${
                      isSelected 
                        ? 'border-[#40d3b6]/60 bg-[#40d3b6]/5 shadow-[0_0_12px_rgba(64,211,182,0.08)]' 
                        : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-black tracking-wide text-white">{dataset.name}</span>
                        {status === 'downloaded' && (
                          <span className="px-1 py-0.5 text-[6.5px] font-black uppercase tracking-wider rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Downloaded</span>
                        )}
                        {(status === 'downloading' || status === 'starting') && (
                          <span className="px-1 py-0.5 text-[6.5px] font-black uppercase tracking-wider rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">Downloading</span>
                        )}
                        {status === 'not_downloaded' && (
                          <span className="px-1 py-0.5 text-[6.5px] font-black uppercase tracking-wider rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Ready to DL</span>
                        )}
                        {status === 'failed' && (
                          <span className="px-1 py-0.5 text-[6.5px] font-black uppercase tracking-wider rounded bg-red-500/10 text-red-400 border border-red-500/20">Failed</span>
                        )}
                      </div>
                      <span className="text-[8px] text-muted-foreground truncate leading-snug">{dataset.description}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-primary/80 font-bold">
                        {dataset.shape?.join('×')}
                      </span>
                      <span className="text-[8px] text-muted-foreground/80 font-black">
                        {dataset.num_classes} CLS {dataset.size ? `• ${dataset.size}` : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Download Status & Trigger Panel */}
            {(() => {
              const selectedName = (datasetConfig as any).name;
              const status = datasetDownloadStatus[selectedName] || 'not_downloaded';
              const progress = datasetDownloadProgress[selectedName];
              
              return (
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                        Status for {selectedName}
                      </span>
                      <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                        {status === 'downloaded' && (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                            Already Downloaded
                          </>
                        )}
                        {(status === 'downloading' || status === 'starting') && (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                            Downloading Dataset...
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
                            Download Failed (Click to Retry)
                          </>
                        )}
                      </span>
                    </div>

                    {status === 'not_downloaded' && (
                      <Button
                        onClick={() => downloadDataset(selectedName)}
                        size="sm"
                        className="h-7 text-[10px] bg-[#40d3b6] hover:bg-[#34bda2] text-black font-extrabold px-3 rounded-lg"
                      >
                        Download Dataset
                      </Button>
                    )}
                    {status === 'failed' && (
                      <Button
                        onClick={() => downloadDataset(selectedName)}
                        size="sm"
                        variant="destructive"
                        className="h-7 text-[10px] font-extrabold px-3 rounded-lg"
                      >
                        Retry Download
                      </Button>
                    )}
                  </div>

                  {(status === 'downloading' || status === 'starting') && progress && (
                    <div className="space-y-1.5">
                      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
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
              );
            })()}

            <div className="flex flex-col gap-1.5 mt-4">
              <span className="text-[10px] text-[#40d3b6] font-extrabold uppercase tracking-wider">
                Split
              </span>
              <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 border border-primary/10 rounded-xl w-40">
                {(['train', 'test'] as const).map((split) => (
                  <button
                    key={split}
                    onClick={() => setDatasetConfig({ ...datasetConfig, split })}
                    className={`py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                      datasetConfig.split === split 
                        ? 'bg-primary/15 text-[#40d3b6]' 
                        : 'text-muted-foreground hover:text-white'
                    }`}
                  >
                    {split}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2d. Image Folder Source View */}
        {source === 'image_folder' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                Root Directory
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={datasetConfig.root}
                  onChange={(e) => setDatasetConfig({ ...datasetConfig, root: e.target.value })}
                  className="flex-1 text-xs bg-black/40 border border-primary/20 rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                  placeholder="e.g. /home/datasets/my_images"
                />
                <Button 
                  onClick={() => handleScanPath(datasetConfig.root || '', 'image')} 
                  disabled={scanStatus === 'scanning'}
                  className="bg-primary/10 border border-primary/20 hover:bg-primary/20 text-[#40d3b6] rounded-xl text-xs px-3 font-bold shrink-0"
                >
                  {scanStatus === 'scanning' ? <Loader2 size={12} className="animate-spin" /> : 'Scan'}
                </Button>
              </div>
              {renderScanResults()}
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
                value={datasetConfig.split_ratio}
                onChange={(e) => setDatasetConfig({ ...datasetConfig, split_ratio: parseFloat(e.target.value) })}
                className="w-full accent-[#40d3b6] focus:outline-none nodrag"
              />
            </div>
          </div>
        )}

        {/* 2e. Custom Source View */}
        {source === 'custom' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                Modality
              </label>
              <div className="grid grid-cols-4 gap-1 bg-black/40 p-1 border border-primary/10 rounded-xl">
                {(['image', 'text', 'tabular', 'audio'] as const).map((m) => {
                  const isActive = datasetConfig.modality === m;
                  return (
                    <button
                      key={m}
                      onClick={() => handleCustomModalityChange(m)}
                      className={`py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                        isActive 
                          ? 'bg-primary/15 text-[#40d3b6]' 
                          : 'text-muted-foreground hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modality Specific Fields */}
            {datasetConfig.modality === 'image' && (
              <div className="space-y-3.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[#40d3b6] font-extrabold uppercase">Root Path</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={datasetConfig.root || ''}
                      onChange={(e) => setDatasetConfig({ ...datasetConfig, root: e.target.value })}
                      className="flex-1 text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                      placeholder="Image folder path"
                    />
                    <Button 
                      onClick={() => handleScanPath(datasetConfig.root || '', 'image')} 
                      disabled={scanStatus === 'scanning'}
                      className="bg-primary/10 border border-primary/20 hover:bg-primary/20 text-[#40d3b6] rounded-xl text-xs px-3 h-8 font-bold shrink-0"
                    >
                      {scanStatus === 'scanning' ? <Loader2 size={12} className="animate-spin" /> : 'Scan'}
                    </Button>
                  </div>
                  {renderScanResults()}
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[#40d3b6] font-extrabold uppercase">Label Source</span>
                  <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 border border-primary/10 rounded-xl w-44">
                    {(['folder', 'csv'] as const).map((src) => (
                      <button
                        key={src}
                        onClick={() => setDatasetConfig({ ...datasetConfig, label_source: src })}
                        className={`py-0.5 text-[9px] font-black uppercase rounded-md transition-all ${
                          datasetConfig.label_source === src ? 'bg-primary/20 text-[#40d3b6]' : 'text-muted-foreground hover:text-white'
                        }`}
                      >
                        {src === 'folder' ? 'Subfolders' : 'CSV Index'}
                      </button>
                    ))}
                  </div>
                </div>

                {datasetConfig.label_source === 'csv' && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-muted-foreground uppercase">Label Index CSV Path</span>
                      <input
                        type="text"
                        value={datasetConfig.label_file || ''}
                        onChange={(e) => setDatasetConfig({ ...datasetConfig, label_file: e.target.value })}
                        className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                        placeholder="Path to labels.csv"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-muted-foreground uppercase">Image Col</span>
                        <input
                          type="text"
                          value={datasetConfig.image_column || ''}
                          onChange={(e) => setDatasetConfig({ ...datasetConfig, image_column: e.target.value })}
                          className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                          placeholder="image_path"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-muted-foreground uppercase">Label Col</span>
                        <input
                          type="text"
                          value={datasetConfig.label_column || ''}
                          onChange={(e) => setDatasetConfig({ ...datasetConfig, label_column: e.target.value })}
                          className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                          placeholder="label"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-muted-foreground uppercase">File Glob Pattern</span>
                  <input
                    type="text"
                    value={datasetConfig.file_pattern || '*.jpg'}
                    onChange={(e) => setDatasetConfig({ ...datasetConfig, file_pattern: e.target.value })}
                    className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] font-mono text-white nodrag"
                    placeholder="*.jpg"
                  />
                </div>
              </div>
            )}

            {datasetConfig.modality === 'text' && (
              <div className="space-y-3.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[#40d3b6] font-extrabold uppercase">CSV/Text File Path</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={datasetConfig.file_path || ''}
                      onChange={(e) => setDatasetConfig({ ...datasetConfig, file_path: e.target.value })}
                      className="flex-1 text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                      placeholder="Path to dataset file"
                    />
                    <Button 
                      onClick={() => handleScanPath(datasetConfig.file_path || '', 'text')} 
                      disabled={scanStatus === 'scanning'}
                      className="bg-primary/10 border border-primary/20 hover:bg-primary/20 text-[#40d3b6] rounded-xl text-xs px-3 h-8 font-bold shrink-0"
                    >
                      {scanStatus === 'scanning' ? <Loader2 size={12} className="animate-spin" /> : 'Scan'}
                    </Button>
                  </div>
                  {renderScanResults()}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-muted-foreground uppercase">Text Column</span>
                  <input
                    type="text"
                    value={datasetConfig.text_column || ''}
                    onChange={(e) => setDatasetConfig({ ...datasetConfig, text_column: e.target.value })}
                    className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                    placeholder="text_col"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase">Vocab Size</span>
                    <input
                      type="number"
                      value={datasetConfig.vocab_size || 30000}
                      onChange={(e) => setDatasetConfig({ ...datasetConfig, vocab_size: parseInt(e.target.value) || 0 })}
                      className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase">Max Token Len</span>
                    <input
                      type="number"
                      value={datasetConfig.max_length || 512}
                      onChange={(e) => setDatasetConfig({ ...datasetConfig, max_length: parseInt(e.target.value) || 0 })}
                      className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                    />
                  </div>
                </div>
              </div>
            )}

            {datasetConfig.modality === 'tabular' && (
              <div className="space-y-3.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[#40d3b6] font-extrabold uppercase">CSV File Path</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={datasetConfig.file_path || ''}
                      onChange={(e) => setDatasetConfig({ ...datasetConfig, file_path: e.target.value })}
                      className="flex-1 text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                      placeholder="Path to tabular file"
                    />
                    <Button 
                      onClick={() => handleScanPath(datasetConfig.file_path || '', 'tabular')} 
                      disabled={scanStatus === 'scanning'}
                      className="bg-primary/10 border border-primary/20 hover:bg-primary/20 text-[#40d3b6] rounded-xl text-xs px-3 h-8 font-bold shrink-0"
                    >
                      {scanStatus === 'scanning' ? <Loader2 size={12} className="animate-spin" /> : 'Scan'}
                    </Button>
                  </div>
                  {renderScanResults()}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-muted-foreground uppercase">Target Column</span>
                  <input
                    type="text"
                    value={datasetConfig.target_column || ''}
                    onChange={(e) => setDatasetConfig({ ...datasetConfig, target_column: e.target.value })}
                    className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                    placeholder="target_column"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-muted-foreground uppercase">Feature Columns (comma-separated)</span>
                  <input
                    type="text"
                    value={datasetConfig.feature_columns?.join(', ') || ''}
                    onChange={(e) => setDatasetConfig({ 
                      ...datasetConfig, 
                      feature_columns: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                    })}
                    className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                    placeholder="feat1, feat2, feat3"
                  />
                </div>
              </div>
            )}

            {datasetConfig.modality === 'audio' && (
              <div className="space-y-3.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[#40d3b6] font-extrabold uppercase">Audio Folder Path</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={datasetConfig.root || ''}
                      onChange={(e) => setDatasetConfig({ ...datasetConfig, root: e.target.value })}
                      className="flex-1 text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                      placeholder="Root directory of audio files"
                    />
                    <Button 
                      onClick={() => handleScanPath(datasetConfig.root || '', 'audio')} 
                      disabled={scanStatus === 'scanning'}
                      className="bg-primary/10 border border-primary/20 hover:bg-primary/20 text-[#40d3b6] rounded-xl text-xs px-3 h-8 font-bold shrink-0"
                    >
                      {scanStatus === 'scanning' ? <Loader2 size={12} className="animate-spin" /> : 'Scan'}
                    </Button>
                  </div>
                  {renderScanResults()}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase">Sample Rate</span>
                    <input
                      type="number"
                      value={datasetConfig.sample_rate || 16000}
                      onChange={(e) => setDatasetConfig({ ...datasetConfig, sample_rate: parseInt(e.target.value) || 0 })}
                      className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase">Max Duration (s)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={datasetConfig.max_duration_sec || 1.0}
                      onChange={(e) => setDatasetConfig({ ...datasetConfig, max_duration_sec: parseFloat(e.target.value) || 0 })}
                      className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-muted-foreground uppercase">Mel Bands (n_mels)</span>
                  <input
                    type="number"
                    value={datasetConfig.n_mels || 64}
                    onChange={(e) => setDatasetConfig({ ...datasetConfig, n_mels: parseInt(e.target.value) || 0 })}
                    className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Validate config manually */}
        <div className="pt-2">
          <Button
            onClick={handleValidateConfig}
            disabled={isValidating}
            className="w-full flex items-center justify-center gap-2 bg-[#40d3b6]/10 border border-[#40d3b6]/25 hover:bg-[#40d3b6]/20 text-[#40d3b6] rounded-xl text-xs py-2 transition-all font-bold"
          >
            {isValidating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle size={14} />
            )}
            Validate Configuration
          </Button>

          {validationResult && (
            <div className={`mt-3 p-3.5 rounded-xl border text-[11px] select-none leading-relaxed ${
              validationResult.valid 
                ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' 
                : 'border-red-500/30 bg-red-500/5 text-red-400'
            }`}>
              <div className="font-bold flex items-center gap-1.5 mb-1 text-xs">
                {validationResult.valid ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                {validationResult.valid ? "Configuration Valid!" : "Configuration Errors Found"}
              </div>
              
              {!validationResult.valid && (
                <ul className="list-disc list-inside space-y-1 mt-2.5 max-h-24 overflow-y-auto pl-1">
                  {validationResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
              {validationResult.warnings.length > 0 && (
                <div className="mt-2 text-amber-400">
                  <div className="font-bold uppercase tracking-wider text-[9px] mb-1">Warnings:</div>
                  <ul className="list-disc list-inside space-y-0.5 max-h-16 overflow-y-auto pl-1">
                    {validationResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator className="bg-primary/10" />

        {/* 2f. Transforms Pipeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
              Transforms Pipeline
            </span>

            {/* Add transform dropdown trigger */}
            <div className="relative">
              <Button
                onClick={() => setAddTransformOpen(!addTransformOpen)}
                size="icon"
                className="w-6 h-6 rounded-lg bg-primary/10 hover:bg-primary/20 text-[#40d3b6] hover:text-white border border-primary/20 transition-all cursor-pointer"
              >
                <Plus size={14} />
              </Button>

              {addTransformOpen && (
                <div className="absolute right-0 top-7 w-48 bg-card border border-primary/20 rounded-xl shadow-2xl z-50 overflow-hidden text-left flex flex-col p-1.5">
                  <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest px-2.5 py-1">
                    Select Transform
                  </span>
                  
                  <div className="max-h-56 overflow-y-auto no-scrollbar py-1 space-y-2">
                    {/* Geometry Group */}
                    <div className="space-y-0.5">
                      <div className="text-[8px] text-[#40d3b6] font-bold uppercase tracking-wider px-2">Geometry</div>
                      {transformsCatalog.filter(t => t.category === 'geometry').map(t => (
                        <button
                          key={t.name}
                          onClick={() => {
                            addTransform({ type: t.name });
                            setAddTransformOpen(false);
                          }}
                          className="w-full text-[10px] text-foreground/90 hover:text-white hover:bg-primary/15 rounded-lg px-2.5 py-1 text-left"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>

                    {/* Augmentation Group */}
                    <div className="space-y-0.5">
                      <div className="text-[8px] text-purple-400 font-bold uppercase tracking-wider px-2">Augmentation</div>
                      {transformsCatalog.filter(t => t.category === 'augmentation').map(t => (
                        <button
                          key={t.name}
                          onClick={() => {
                            addTransform({ type: t.name });
                            setAddTransformOpen(false);
                          }}
                          className="w-full text-[10px] text-foreground/90 hover:text-white hover:bg-primary/15 rounded-lg px-2.5 py-1 text-left"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>

                    {/* Conversion Group */}
                    <div className="space-y-0.5">
                      <div className="text-[8px] text-cyan-400 font-bold uppercase tracking-wider px-2">Conversion</div>
                      {transformsCatalog.filter(t => t.category === 'conversion').map(t => (
                        <button
                          key={t.name}
                          onClick={() => {
                            addTransform({ type: t.name });
                            setAddTransformOpen(false);
                          }}
                          className="w-full text-[10px] text-foreground/90 hover:text-white hover:bg-primary/15 rounded-lg px-2.5 py-1 text-left"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>

                    {/* Normalization Group */}
                    <div className="space-y-0.5">
                      <div className="text-[8px] text-pink-400 font-bold uppercase tracking-wider px-2">Normalization</div>
                      {transformsCatalog.filter(t => t.category === 'normalization').map(t => (
                        <button
                          key={t.name}
                          onClick={() => {
                            addTransform({ type: t.name });
                            setAddTransformOpen(false);
                          }}
                          className="w-full text-[10px] text-foreground/90 hover:text-white hover:bg-primary/15 rounded-lg px-2.5 py-1 text-left"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transform Rows List */}
          <div className="space-y-2.5">
            {datasetConfig.transforms.length === 0 ? (
              <div className="text-[10px] text-muted-foreground italic bg-white/[0.01] border border-dashed border-white/5 rounded-xl p-4 text-center">
                No active transforms. Click + to add some.
              </div>
            ) : (
              datasetConfig.transforms.map((t, idx) => {
                const isExpanded = expandedTransformIndex === idx;
                
                // Construct brief summary text
                const paramSummary = Object.entries(t)
                  .filter(([k]) => k !== 'type')
                  .map(([k, v]) => `${k}=${Array.isArray(v) ? `[${v.join(',')}]` : v}`)
                  .join(' ');

                return (
                  <div
                    key={idx}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', idx.toString());
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                      if (!isNaN(fromIdx) && fromIdx !== idx) {
                        reorderTransforms(fromIdx, idx);
                      }
                    }}
                    className={`border rounded-xl transition-all ${
                      isExpanded 
                        ? 'border-primary/30 bg-[#0d0d15]/50' 
                        : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between p-3.5 cursor-pointer">
                      
                      {/* Drag Handle */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0" onClick={() => setExpandedTransformIndex(isExpanded ? null : idx)}>
                        <span className="text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing font-mono font-black select-none text-xs leading-none mr-0.5 shrink-0">
                          ⠿
                        </span>
                        
                        <div className="flex flex-col gap-0.5 truncate min-w-0">
                          <span className="text-[11px] font-black text-white uppercase tracking-wide">
                            {t.type}
                          </span>
                          {paramSummary && (
                            <span className="text-[9px] font-mono text-muted-foreground truncate max-w-[150px]">
                              {paramSummary}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Row actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Order controls */}
                        <button
                          disabled={idx === 0}
                          onClick={() => reorderTransforms(idx, idx - 1)}
                          className="w-5 h-5 rounded-md hover:bg-white/5 disabled:opacity-25 text-muted-foreground hover:text-white flex items-center justify-center transition-colors"
                        >
                          <ArrowUp size={11} />
                        </button>
                        <button
                          disabled={idx === datasetConfig.transforms.length - 1}
                          onClick={() => reorderTransforms(idx, idx + 1)}
                          className="w-5 h-5 rounded-md hover:bg-white/5 disabled:opacity-25 text-muted-foreground hover:text-white flex items-center justify-center transition-colors"
                        >
                          <ArrowDown size={11} />
                        </button>

                        <button
                          onClick={() => removeTransform(idx)}
                          className="w-6 h-6 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 flex items-center justify-center transition-colors ml-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-white/5 pt-2">
                        {renderTransformParamsEditor(t, idx)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <Separator className="bg-primary/10" />

        {/* 2g. DataLoader Settings (Collapsible) */}
        <div className="border border-white/5 bg-white/[0.01] rounded-xl overflow-hidden">
          <button
            onClick={() => setShowDataLoader(!showDataLoader)}
            className="w-full flex items-center justify-between p-4 text-xs font-black text-white hover:text-[#40d3b6] tracking-wider uppercase transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Settings size={14} className="text-primary/70" />
              <span>DataLoader Config</span>
            </div>
            {showDataLoader ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {showDataLoader && (
            <div className="p-4 border-t border-white/5 space-y-4 select-none">
              
              {/* Batch Size */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-extrabold text-white/90 uppercase tracking-wider">
                  Batch Size
                </span>
                <input
                  type="number"
                  min="1"
                  max="1024"
                  value={datasetConfig.dataloader?.batch_size ?? 32}
                  onChange={(e) => setDataLoaderConfig({ batch_size: parseInt(e.target.value) || 32 })}
                  className="w-20 text-[11px] bg-black/40 border border-primary/20 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#40d3b6] text-right font-mono text-white nodrag"
                />
              </div>

              {/* Shuffle */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-extrabold text-white/90 uppercase tracking-wider">
                  Shuffle
                </span>
                <button
                  onClick={() => setDataLoaderConfig({ shuffle: !(datasetConfig.dataloader?.shuffle ?? true) })}
                  className="text-muted-foreground hover:text-white transition-colors"
                >
                  {(datasetConfig.dataloader?.shuffle ?? true) ? (
                    <ToggleRight size={28} className="text-[#40d3b6]" />
                  ) : (
                    <ToggleLeft size={28} />
                  )}
                </button>
              </div>

              {/* Num Workers */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-extrabold text-white/90 uppercase tracking-wider">
                  Num Workers
                </span>
                <input
                  type="number"
                  min="0"
                  max="32"
                  value={datasetConfig.dataloader?.num_workers ?? 4}
                  onChange={(e) => setDataLoaderConfig({ num_workers: parseInt(e.target.value) || 0 })}
                  className="w-20 text-[11px] bg-black/40 border border-primary/20 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#40d3b6] text-right font-mono text-white nodrag"
                />
              </div>

              {/* Pin Memory */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-extrabold text-white/90 uppercase tracking-wider">
                  Pin Memory
                </span>
                <button
                  onClick={() => setDataLoaderConfig({ pin_memory: !(datasetConfig.dataloader?.pin_memory ?? true) })}
                  className="text-muted-foreground hover:text-white transition-colors"
                >
                  {(datasetConfig.dataloader?.pin_memory ?? true) ? (
                    <ToggleRight size={28} className="text-[#40d3b6]" />
                  ) : (
                    <ToggleLeft size={28} />
                  )}
                </button>
              </div>

              {/* Drop Last */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-extrabold text-white/90 uppercase tracking-wider">
                  Drop Last
                </span>
                <button
                  onClick={() => setDataLoaderConfig({ drop_last: !(datasetConfig.dataloader?.drop_last ?? false) })}
                  className="text-muted-foreground hover:text-white transition-colors"
                >
                  {(datasetConfig.dataloader?.drop_last ?? false) ? (
                    <ToggleRight size={28} className="text-[#40d3b6]" />
                  ) : (
                    <ToggleLeft size={28} />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2h. Dataset Preview Drawer */}
        <div className="border border-white/5 bg-white/[0.01] rounded-xl overflow-hidden mt-4">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="w-full flex items-center justify-between p-4 text-xs font-black text-white hover:text-[#40d3b6] tracking-wider uppercase transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Database size={14} className="text-primary/70" />
              <span>Dataset Preview</span>
            </div>
            {showPreview ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {showPreview && (
            <div className="p-4 border-t border-white/5 space-y-4 max-h-[300px] overflow-y-auto no-scrollbar select-none text-left">
              {previewLoading && (
                <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                  <Loader2 className="w-4 h-4 animate-spin text-[#40d3b6]" />
                  Loading samples...
                </div>
              )}

              {previewError && (
                <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg leading-relaxed">
                  ❌ {previewError}
                </div>
              )}

              {!previewLoading && !previewError && previewResult && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground font-bold uppercase">
                    <span>Total Size: {previewResult.total_size} samples</span>
                    <span>Modality: {previewResult.modality}</span>
                  </div>

                  {previewResult.samples.length === 0 ? (
                    <div className="text-[10px] text-muted-foreground italic text-center py-4">
                      No sample records returned.
                    </div>
                  ) : previewResult.modality === 'image' ? (
                    /* Image Grid Preview */
                    <div className="grid grid-cols-3 gap-2">
                      {previewResult.samples.map((sample, idx) => (
                        <div key={idx} className="relative aspect-square bg-black/40 border border-primary/10 rounded-lg overflow-hidden flex flex-col justify-end">
                          {sample.thumbnail ? (
                            <img src={sample.thumbnail} className="absolute inset-0 w-full h-full object-cover" alt={`sample-${idx}`} />
                          ) : (
                            <span className="text-[8px] text-muted-foreground text-center mb-auto mt-auto">No Img</span>
                          )}
                          <span className="bg-black/80 px-1 py-0.5 text-[8px] font-mono text-[#40d3b6] z-10 truncate text-center">
                            L: {sample.label !== undefined ? sample.label : 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : previewResult.modality === 'tabular' ? (
                    /* Tabular List Preview */
                    <div className="space-y-1.5 font-mono text-[9px] max-h-48 overflow-y-auto">
                      {previewResult.samples.map((sample, idx) => (
                        <div key={idx} className="p-2 bg-black/30 border border-primary/10 rounded-lg flex flex-col gap-0.5">
                          <div className="flex justify-between font-bold text-white border-b border-primary/5 pb-1">
                            <span>Record #{idx + 1}</span>
                            <span className="text-[#40d3b6]">Target: {sample.label}</span>
                          </div>
                          <div className="text-muted-foreground/90 pt-1 leading-normal">
                            {Array.isArray(sample.features) ? (
                              <div className="truncate">Features: [{sample.features.slice(0, 8).join(', ')}{sample.features.length > 8 ? '...' : ''}]</div>
                            ) : (
                              <div className="break-all">{JSON.stringify(sample.features || sample)}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : previewResult.modality === 'text' ? (
                    /* Text Snippets Preview */
                    <div className="space-y-1.5 font-mono text-[9px] max-h-48 overflow-y-auto font-sans">
                      {previewResult.samples.map((sample, idx) => (
                        <div key={idx} className="p-2 bg-black/30 border border-primary/10 rounded-lg flex flex-col gap-1">
                          <div className="flex justify-between font-bold text-white border-b border-primary/5 pb-1">
                            <span>Text sample #{idx + 1}</span>
                            <span className="text-[#40d3b6]">Label: {sample.label}</span>
                          </div>
                          <div className="text-muted-foreground/90 whitespace-pre-wrap leading-relaxed select-text">
                            {sample.text || JSON.stringify(sample)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* General/Audio waveform stats preview */
                    <div className="space-y-1.5 font-mono text-[9px]">
                      {previewResult.samples.map((sample, idx) => (
                        <div key={idx} className="p-2 bg-black/30 border border-primary/10 rounded-lg">
                          <div className="font-bold text-white mb-1">Sample #{idx + 1} (Label: {sample.label})</div>
                          <div className="text-muted-foreground leading-normal pl-1 space-y-0.5">
                            {Object.entries(sample).filter(([k]) => k !== 'label').map(([k, v]) => (
                              <div key={k} className="truncate">{k}: {JSON.stringify(v)}</div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
