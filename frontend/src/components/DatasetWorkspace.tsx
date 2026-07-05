import { useEffect, useState } from 'react';
import { useWeaveStore } from '../store/useWeaveStore';
import { api } from '../services/api';
import { 
  Database, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronRight, ChevronLeft,
  Plus, Trash2, ArrowUp, ArrowDown, Settings, Eye, RefreshCw, FileText, Table, Music, Image as ImageIcon, Sparkles, Sliders
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { DatasetCatalogEntry, TransformCatalogEntry } from '../types';

export function DatasetWorkspace() {
  const store = useWeaveStore();
  const datasetConfig = store.datasetConfig as any;
  const {
    inferredDatasetShape,
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
  } = store;

  const [datasetsCatalog, setDatasetsCatalog] = useState<DatasetCatalogEntry[]>([]);
  const [transformsCatalog, setTransformsCatalog] = useState<TransformCatalogEntry[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [activePredefinedCategory, setActivePredefinedCategory] = useState<string>('FAMOUS');
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [previewSampleIndex, setPreviewSampleIndex] = useState(0);

  // Accordion/Section state
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
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    samples: any[];
    total_size: number;
    modality: string;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Fetch catalogs on mount
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

  // Check selected predefined dataset status when it changes
  useEffect(() => {
    if (datasetConfig && datasetConfig.source === 'predefined' && (datasetConfig as any).name) {
      checkDatasetStatus((datasetConfig as any).name);
    }
  }, [datasetConfig, checkDatasetStatus]);

  // Fetch preview automatically whenever configuration changes
  const handleFetchPreview = async () => {
    if (!datasetConfig) return;

    const isPredefined = datasetConfig.source === 'predefined';
    const isDownloaded = isPredefined ? (datasetDownloadStatus[(datasetConfig as any).name] === 'downloaded') : true;

    if (!isDownloaded) {
      setPreviewResult(null);
      setPreviewError("Dataset is not downloaded yet. Please download it using the 'Download Dataset' button in the configuration panel.");
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await api.engine.previewDataset(datasetConfig, 4);
      if (res.status === 'success') {
        let detectedModality = 'image';
        if (datasetConfig.source === 'custom') {
          detectedModality = datasetConfig.modality || 'image';
        } else {
          const entry = datasetsCatalog.find(d => d.name === datasetConfig.name);
          detectedModality = entry?.modality || 'image';
        }
        setPreviewResult({
          samples: res.samples || [],
          total_size: res.total_size || 0,
          modality: detectedModality
        });
        setPreviewSampleIndex(0);
      } else {
        setPreviewError(res.message || 'Failed to preview dataset.');
      }
    } catch (err: any) {
      setPreviewError(err.message || 'Error loading dataset preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const currentStatus = datasetConfig && datasetConfig.source === 'predefined'
    ? (datasetDownloadStatus[(datasetConfig as any).name] || 'not_downloaded')
    : 'downloaded';

  useEffect(() => {
    if (datasetConfig) {
      handleFetchPreview();
    }
  }, [datasetConfig, currentStatus]);

  // Scan folder / file paths
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

  // Reset scanner / validator on config modifications
  const resetScanAndPreview = () => {
    setScanStatus('idle');
    setScanResult(null);
    setScanError(null);
    setValidationResult(null);
  };

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

  // Predefined defaults setup
  const handlePredefinedDatasetSelect = (datasetName: string) => {
    if (!datasetConfig || datasetConfig.source !== 'predefined') return;
    
    resetScanAndPreview();

    if (datasetName === 'AG_NEWS_SUBSET') {
      setDatasetConfig({
        ...datasetConfig,
        name: datasetName,
        transforms: [],
        tokenizer: 'bpe',
        vocab_size: 10000,
        max_length: 128,
        lowercase: true,
        remove_punctuation: false
      });
      return;
    }

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
    }
    
    setDatasetConfig({
      ...datasetConfig,
      name: datasetName,
      transforms: defaultTransforms
    });
  };

  // Custom modality helper defaults
  const handleCustomModalityChange = (m: 'image' | 'text' | 'tabular' | 'audio') => {
    if (!datasetConfig || datasetConfig.source !== 'custom') return;
    resetScanAndPreview();

    let transforms: any[] = [];
    if (m === 'image') {
      transforms = [{ type: 'ToTensor' }];
    }

    setDatasetConfig({
      ...datasetConfig,
      modality: m,
      transforms,
      root: '',
      file_path: '',
      label_source: m === 'image' ? 'folder' : undefined,
      tokenizer: m === 'text' ? 'bpe' : undefined,
      vocab_size: m === 'text' ? 30000 : undefined,
      max_length: m === 'text' ? 512 : undefined,
      lowercase: m === 'text' ? true : undefined,
      remove_punctuation: m === 'text' ? false : undefined,
    });
  };

  const handleParamChange = (tIdx: number, paramName: string, valueStr: string, typeHint: string) => {
    let value: any = valueStr;
    if (typeHint === 'int') {
      const parsed = parseInt(valueStr);
      value = isNaN(parsed) ? 0 : parsed;
    } else if (typeHint === 'float') {
      const parsed = parseFloat(valueStr);
      value = isNaN(parsed) ? 0.0 : parsed;
    } else if (typeHint.includes('tuple') || typeHint.includes('list')) {
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

  if (loadingCatalog) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#070709] h-full gap-3 text-muted-foreground select-none">
        <Loader2 className="w-10 h-10 animate-spin text-[#40d3b6]" />
        <span className="text-sm font-extrabold tracking-widest text-[#40d3b6]/80 uppercase">Loading Dataset Workspace...</span>
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#070709] h-full gap-4 text-red-400 select-none p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 animate-pulse" />
        <span className="text-sm font-black tracking-widest uppercase leading-relaxed">{catalogError}</span>
        <Button onClick={() => window.location.reload()} className="bg-primary/10 border border-primary/20 hover:bg-primary text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all">
          RETRY CONNECTION
        </Button>
      </div>
    );
  }

  // Pre-initialize datasetConfig if it is null on loading
  if (!datasetConfig) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center select-none bg-[#07070a] p-10 h-full">
        <div className="flex flex-col items-center text-center max-w-md">
          <div className="w-16 h-16 bg-primary/5 rounded-3xl flex items-center justify-center border border-primary/15 mb-5 shadow-[0_0_30px_rgba(64,211,182,0.08)]">
            <Database className="w-8 h-8 text-[#40d3b6]" />
          </div>
          <h3 className="text-lg font-black text-white uppercase tracking-wider">Initialize Dataset Pipeline</h3>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Choose a data ingestion strategy to supply samples, manage augmentation pipelines, and propagate tensor shapes to the visual model.
          </p>
          <div className="grid grid-cols-3 gap-3 w-full mt-8">
            <button
              onClick={() => setDatasetSource('predefined')}
              className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] hover:border-primary/20 text-xs font-black uppercase text-white hover:text-[#40d3b6] transition-all flex flex-col items-center gap-2"
            >
              <Sparkles size={18} className="text-primary" />
              Predefined
            </button>
            <button
              onClick={() => setDatasetSource('image_folder')}
              className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] hover:border-primary/20 text-xs font-black uppercase text-white hover:text-[#40d3b6] transition-all flex flex-col items-center gap-2"
            >
              <ImageIcon size={18} className="text-sky-400" />
              Img Folder
            </button>
            <button
              onClick={() => setDatasetSource('custom')}
              className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] hover:border-primary/20 text-xs font-black uppercase text-white hover:text-[#40d3b6] transition-all flex flex-col items-center gap-2"
            >
              <Sliders size={18} className="text-[#40d3b6]" />
              Custom
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { source } = datasetConfig;
  const activeCatalogEntry = datasetsCatalog.find(d => d.name === datasetConfig.name);
  const modality = datasetConfig.source === 'predefined'
    ? (activeCatalogEntry?.modality || 'image')
    : (datasetConfig.source === 'image_folder' ? 'image' : datasetConfig.modality);

  return (
    <div className="flex-1 flex overflow-hidden min-h-0 bg-[#070709] w-full text-white">
      
      {/* COLUMN 1: INGESTION CONFIG */}
      <div className="w-[380px] shrink-0 border-r border-primary/10 flex flex-col bg-card/10 overflow-y-auto no-scrollbar">
        <div className="p-5 border-b border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database size={18} className="text-[#40d3b6]" />
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#40d3b6]">Data Ingestion</h2>
          </div>
          {inferredDatasetShape && (
            <span className="text-[10px] font-mono bg-primary/10 text-primary border border-primary/15 rounded-lg px-2 py-0.5 font-bold">
              Shape: {inferredDatasetShape.join('×')}
            </span>
          )}
        </div>

        <div className="p-5 space-y-6">
          {/* Source Tabs */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Ingestion Method</span>
            <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 border border-primary/10 rounded-xl">
              {(['predefined', 'image_folder', 'custom'] as const).map((src) => {
                const labelMap = {
                  predefined: 'Predefined',
                  image_folder: 'Img Folder',
                  custom: 'Custom'
                };
                const isActive = source === src;
                return (
                  <button
                    key={src}
                    onClick={() => setDatasetSource(src)}
                    className={`py-2 text-[9px] font-black uppercase transition-all rounded-lg ${
                      isActive 
                        ? 'bg-primary/20 text-[#40d3b6] border border-primary/30' 
                        : 'text-muted-foreground hover:text-white'
                    }`}
                  >
                    {labelMap[src]}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="bg-primary/5" />

          {/* Source Specific Configuration */}
          {source === 'predefined' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest block">
                  Predefined Datasets
                </label>
                {/* Category tab selector */}
                {(() => {
                  const categories = ['FAMOUS', ...Array.from(new Set(datasetsCatalog.map(d => d.category || 'FAMOUS'))).filter(c => c !== 'FAMOUS' && c !== '')];
                  if (categories.length <= 1) return null;
                  return (
                    <div className="flex gap-1 bg-black/45 p-0.5 border border-white/5 rounded-lg">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setActivePredefinedCategory(cat)}
                          className={`px-2 py-0.5 text-[8.5px] font-black uppercase rounded-md transition-all ${
                            activePredefinedCategory === cat 
                              ? 'bg-primary/25 text-[#40d3b6] font-extrabold' 
                              : 'text-muted-foreground hover:text-white'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {datasetsCatalog
                  .filter(d => (d.category || 'FAMOUS') === activePredefinedCategory)
                  .map((dataset) => {
                    const isSelected = datasetConfig && datasetConfig.source === 'predefined' && datasetConfig.name === dataset.name;
                    const status = datasetDownloadStatus[dataset.name] || 'not_downloaded';
                    return (
                      <div
                        key={dataset.name}
                        onClick={() => handlePredefinedDatasetSelect(dataset.name)}
                        className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between h-20 transition-all ${
                          isSelected 
                            ? 'border-[#40d3b6]/60 bg-[#40d3b6]/5 shadow-[0_0_12px_rgba(64,211,182,0.08)]' 
                            : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[10px] font-black text-white">{dataset.name}</span>
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
                          <span className="text-[8px] text-muted-foreground truncate">{dataset.description}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-mono text-primary/80 font-bold">
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
                const selectedName = datasetConfig && datasetConfig.source === 'predefined' ? (datasetConfig as any).name : null;
                if (!selectedName) return null;
                const status = datasetDownloadStatus[selectedName] || 'not_downloaded';
                const progress = datasetDownloadProgress[selectedName];
                const selectedDatasetEntry = datasetsCatalog.find(d => d.name === selectedName);
                
                return (
                  <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-4">
                    {/* Rich Dataset Info Panel */}
                    {selectedDatasetEntry && (
                      <div className="bg-black/30 border border-white/5 rounded-xl p-3 space-y-2.5">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-black text-white">{selectedDatasetEntry.name}</span>
                            <p className="text-[9px] text-muted-foreground leading-normal">{selectedDatasetEntry.description}</p>
                          </div>
                          <span className="text-[7.5px] bg-[#40d3b6]/10 text-[#40d3b6] border border-[#40d3b6]/20 rounded-md px-1.5 py-0.5 font-bold uppercase tracking-wider">
                            {selectedDatasetEntry.modality}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-2 text-[9px] font-mono">
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-[8px] uppercase font-sans">Input Shape</span>
                            <span className="text-white font-bold">{selectedDatasetEntry.shape?.join('×') || 'N/A'}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-[8px] uppercase font-sans">Classes</span>
                            <span className="text-white font-bold">{selectedDatasetEntry.num_classes || 'N/A'}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-muted-foreground text-[8px] uppercase font-sans">Download Size</span>
                            <span className="text-white font-bold">{selectedDatasetEntry.size || 'N/A'}</span>
                          </div>
                        </div>

                        {selectedDatasetEntry.tags && selectedDatasetEntry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1.5 border-t border-white/5">
                            {selectedDatasetEntry.tags.map(t => (
                              <span key={t} className="px-1.5 py-0.5 text-[7px] font-medium rounded-full bg-white/5 text-muted-foreground border border-white/10 uppercase tracking-wide">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
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
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Split</span>
                <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 border border-primary/10 rounded-xl w-36">
                  {(['train', 'test'] as const).map((split) => (
                    <button
                      key={split}
                      onClick={() => setDatasetConfig({ ...datasetConfig, split })}
                      className={`py-1 text-[9px] font-black uppercase rounded-md transition-all ${
                        datasetConfig.split === split 
                          ? 'bg-primary/20 text-[#40d3b6]' 
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
                    onChange={(e) => setDatasetConfig({ ...datasetConfig, root: e.target.value })}
                    className="flex-1 text-xs bg-black/40 border border-primary/20 rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                    placeholder="e.g. /home/datasets/images"
                  />
                  <Button 
                    onClick={() => handleScanPath(datasetConfig.root || '', 'image')} 
                    disabled={scanStatus === 'scanning'}
                    className="bg-primary/10 border border-primary/20 hover:bg-primary/20 text-[#40d3b6] rounded-xl text-xs px-3 font-bold shrink-0"
                  >
                    {scanStatus === 'scanning' ? <Loader2 size={12} className="animate-spin" /> : 'Scan'}
                  </Button>
                </div>
                {scanStatus !== 'idle' && (
                  <div className="mt-2 text-[10px] font-mono bg-white/[0.02] border border-white/5 p-3 rounded-xl">
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
                  value={datasetConfig.split_ratio}
                  onChange={(e) => setDatasetConfig({ ...datasetConfig, split_ratio: parseFloat(e.target.value) })}
                  className="w-full accent-[#40d3b6] focus:outline-none nodrag"
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
                <div className="grid grid-cols-4 gap-1 bg-black/40 p-1 border border-primary/10 rounded-xl">
                  {(['image', 'text', 'tabular', 'audio'] as const).map((m) => {
                    const isActive = modality === m;
                    return (
                      <button
                        key={m}
                        onClick={() => handleCustomModalityChange(m)}
                        className={`py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${
                          isActive 
                            ? 'bg-primary/20 text-[#40d3b6]' 
                            : 'text-muted-foreground hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modality Fields */}
              {modality === 'image' && (
                <div className="space-y-3.5 pt-1">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] text-[#40d3b6] font-extrabold uppercase">Images Directory</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={datasetConfig.root || ''}
                        onChange={(e) => setDatasetConfig({ ...datasetConfig, root: e.target.value })}
                        className="flex-1 text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-2 text-white nodrag"
                        placeholder="Path to root folder"
                      />
                      <Button 
                        onClick={() => handleScanPath(datasetConfig.root || '', 'image')} 
                        disabled={scanStatus === 'scanning'}
                        className="bg-primary/10 border border-primary/20 text-[#40d3b6] rounded-xl text-xs px-3 h-8 font-bold"
                      >
                        {scanStatus === 'scanning' ? <Loader2 size={12} className="animate-spin" /> : 'Scan'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] text-muted-foreground uppercase">Labels Schema</span>
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
                    <div className="space-y-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] text-muted-foreground uppercase">CSV Index File Path</span>
                        <input
                          type="text"
                          value={datasetConfig.label_file || ''}
                          onChange={(e) => setDatasetConfig({ ...datasetConfig, label_file: e.target.value })}
                          className="text-xs bg-black/40 border border-primary/20 rounded-lg px-2.5 py-1.5 text-white nodrag"
                          placeholder="Path to annotations.csv"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] text-muted-foreground uppercase">Image Col</span>
                          <input
                            type="text"
                            value={datasetConfig.image_column || ''}
                            onChange={(e) => setDatasetConfig({ ...datasetConfig, image_column: e.target.value })}
                            className="text-xs bg-black/40 border border-primary/20 rounded-lg px-2.5 py-1.5 text-white nodrag"
                            placeholder="image_path"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] text-muted-foreground uppercase">Label Col</span>
                          <input
                            type="text"
                            value={datasetConfig.label_column || ''}
                            onChange={(e) => setDatasetConfig({ ...datasetConfig, label_column: e.target.value })}
                            className="text-xs bg-black/40 border border-primary/20 rounded-lg px-2.5 py-1.5 text-white nodrag"
                            placeholder="label"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase">File Extension Glob</span>
                    <input
                      type="text"
                      value={datasetConfig.file_pattern || '*.jpg'}
                      onChange={(e) => setDatasetConfig({ ...datasetConfig, file_pattern: e.target.value })}
                      className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 text-white font-mono nodrag"
                    />
                  </div>
                </div>
              )}

              {modality === 'text' && (
                <div className="space-y-3.5 pt-1">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] text-[#40d3b6] font-extrabold uppercase">Text File (CSV/TXT)</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={datasetConfig.file_path || ''}
                        onChange={(e) => setDatasetConfig({ ...datasetConfig, file_path: e.target.value })}
                        className="flex-1 text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-2 text-white nodrag"
                        placeholder="Path to text corpus"
                      />
                      <Button 
                        onClick={() => handleScanPath(datasetConfig.file_path || '', 'text')} 
                        disabled={scanStatus === 'scanning'}
                        className="bg-primary/10 border border-primary/20 text-[#40d3b6] rounded-xl text-xs px-3 h-8 font-bold"
                      >
                        {scanStatus === 'scanning' ? <Loader2 size={12} className="animate-spin" /> : 'Scan'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase">Text Column</span>
                    <input
                      type="text"
                      value={datasetConfig.text_column || ''}
                      onChange={(e) => setDatasetConfig({ ...datasetConfig, text_column: e.target.value })}
                      className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 text-white nodrag"
                      placeholder="e.g. review_text"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase">Target Label Column (Optional)</span>
                    <input
                      type="text"
                      value={datasetConfig.target_column || ''}
                      onChange={(e) => setDatasetConfig({ ...datasetConfig, target_column: e.target.value })}
                      className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 text-white nodrag"
                      placeholder="e.g. sentiment"
                    />
                  </div>
                </div>
              )}

              {modality === 'tabular' && (
                <div className="space-y-3.5 pt-1">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] text-[#40d3b6] font-extrabold uppercase">CSV File Path</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={datasetConfig.file_path || ''}
                        onChange={(e) => setDatasetConfig({ ...datasetConfig, file_path: e.target.value })}
                        className="flex-1 text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-2 text-white nodrag"
                        placeholder="Path to dataset.csv"
                      />
                      <Button 
                        onClick={() => handleScanPath(datasetConfig.file_path || '', 'tabular')} 
                        disabled={scanStatus === 'scanning'}
                        className="bg-primary/10 border border-primary/20 text-[#40d3b6] rounded-xl text-xs px-3 h-8 font-bold"
                      >
                        {scanStatus === 'scanning' ? <Loader2 size={12} className="animate-spin" /> : 'Scan'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase">Target Column</span>
                    <input
                      type="text"
                      value={datasetConfig.target_column || ''}
                      onChange={(e) => setDatasetConfig({ ...datasetConfig, target_column: e.target.value })}
                      className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 text-white nodrag"
                      placeholder="e.g. median_house_value"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase">Feature Columns (Comma Separated)</span>
                    <input
                      type="text"
                      value={datasetConfig.feature_columns?.join(', ') || ''}
                      onChange={(e) => setDatasetConfig({ 
                        ...datasetConfig, 
                        feature_columns: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                      })}
                      className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 text-white nodrag"
                      placeholder="feat1, feat2, feat3"
                    />
                  </div>
                </div>
              )}

              {modality === 'audio' && (
                <div className="space-y-3.5 pt-1">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] text-[#40d3b6] font-extrabold uppercase">Audio Folder Path</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={datasetConfig.root || ''}
                        onChange={(e) => setDatasetConfig({ ...datasetConfig, root: e.target.value })}
                        className="flex-1 text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-2 text-white nodrag"
                        placeholder="Path to audio root"
                      />
                      <Button 
                        onClick={() => handleScanPath(datasetConfig.root || '', 'audio')} 
                        disabled={scanStatus === 'scanning'}
                        className="bg-primary/10 border border-primary/20 text-[#40d3b6] rounded-xl text-xs px-3 h-8 font-bold"
                      >
                        {scanStatus === 'scanning' ? <Loader2 size={12} className="animate-spin" /> : 'Scan'}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-muted-foreground uppercase">Sample Rate</span>
                      <input
                        type="number"
                        value={datasetConfig.sample_rate || 16000}
                        onChange={(e) => setDatasetConfig({ ...datasetConfig, sample_rate: parseInt(e.target.value) || 0 })}
                        className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 text-white nodrag"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-muted-foreground uppercase">Max Duration (s)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={datasetConfig.max_duration_sec || 1.0}
                        onChange={(e) => setDatasetConfig({ ...datasetConfig, max_duration_sec: parseFloat(e.target.value) || 0 })}
                        className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 text-white nodrag"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase">Mel Frequency Bands (n_mels)</span>
                    <input
                      type="number"
                      value={datasetConfig.n_mels || 64}
                      onChange={(e) => setDatasetConfig({ ...datasetConfig, n_mels: parseInt(e.target.value) || 0 })}
                      className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 text-white nodrag"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {scanStatus !== 'idle' && source !== 'image_folder' && (
            <div className="mt-2 text-[10px] font-mono bg-white/[0.02] border border-white/5 p-3 rounded-xl select-text">
              {scanResult && (
                <div className="text-xs text-[#40d3b6] leading-relaxed">
                  <div className="font-extrabold uppercase text-[9px] mb-1.5 border-b border-[#40d3b6]/10 pb-0.5">Scan Complete</div>
                  {scanResult.num_classes !== undefined && <div>Classes: {scanResult.num_classes}</div>}
                  {scanResult.total_images !== undefined && <div>Images: {scanResult.total_images}</div>}
                  {scanResult.total_files !== undefined && <div>Files: {scanResult.total_files}</div>}
                  {scanResult.num_rows !== undefined && <div>Rows: {scanResult.num_rows}</div>}
                  {scanResult.columns !== undefined && <div className="truncate">Cols: {scanResult.columns.join(', ')}</div>}
                </div>
              )}
              {scanError && <div className="text-red-400">❌ Scan failed: {scanError}</div>}
            </div>
          )}

          <Separator className="bg-primary/5" />

          {/* Dataloader Config Box */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden select-none">
            <button
              onClick={() => setShowDataLoader(!showDataLoader)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-all"
            >
              <div className="flex items-center gap-2">
                <Settings size={15} className="text-muted-foreground" />
                <span className="text-xs font-extrabold uppercase tracking-wider">Data Loader config</span>
              </div>
              {showDataLoader ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {showDataLoader && (
              <div className="p-4 pt-0 space-y-3 bg-black/10">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-muted-foreground uppercase">Batch Size</span>
                    <input
                      type="number"
                      value={datasetConfig.dataloader?.batch_size ?? 32}
                      onChange={(e) => setDataLoaderConfig({ batch_size: parseInt(e.target.value) || 32 })}
                      className="text-xs bg-black/40 border border-primary/20 rounded-lg px-2.5 py-1.5 text-white nodrag"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] text-muted-foreground uppercase">Num Workers</span>
                    <input
                      type="number"
                      value={datasetConfig.dataloader?.num_workers ?? 4}
                      onChange={(e) => setDataLoaderConfig({ num_workers: parseInt(e.target.value) || 4 })}
                      className="text-xs bg-black/40 border border-primary/20 rounded-lg px-2.5 py-1.5 text-white nodrag"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-[9px] text-muted-foreground uppercase">Shuffle data</span>
                  <input
                    type="checkbox"
                    checked={datasetConfig.dataloader?.shuffle ?? true}
                    onChange={(e) => setDataLoaderConfig({ shuffle: e.target.checked })}
                    className="accent-[#40d3b6] cursor-pointer nodrag"
                  />
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleValidateConfig}
            disabled={isValidating}
            className="w-full flex items-center justify-center gap-2 bg-[#40d3b6]/10 border border-[#40d3b6]/25 hover:bg-[#40d3b6]/20 text-[#40d3b6] rounded-xl text-xs py-2.5 font-bold transition-all"
          >
            {isValidating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
            VALIDATE CONFIGURATION
          </Button>

          {validationResult && (
            <div className="text-[10px] font-mono p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 font-extrabold uppercase">
                {validationResult.valid ? (
                  <span className="text-[#40d3b6]">✔️ Schema Valid</span>
                ) : (
                  <span className="text-red-400">❌ Schema Invalid</span>
                )}
              </div>
              {validationResult.errors.map((err, i) => (
                <div key={i} className="text-red-400">error: {err}</div>
              ))}
              {validationResult.warnings.map((warn, i) => (
                <div key={i} className="text-yellow-400">warning: {warn}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* COLUMN 2: TRANSFORMS PIPELINE / TOKENIZER CONFIG */}
      <div className="flex-1 border-r border-primary/10 flex flex-col bg-card/5 overflow-y-auto no-scrollbar">
        <div className="p-5 border-b border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders size={18} className="text-primary" />
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-primary">
              {modality === 'text' ? 'Tokenizer Configuration' : 'Augmentations Pipeline'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {modality !== 'text' && (
              <span className="text-[9px] bg-primary/10 text-primary border border-primary/15 rounded-lg px-2 py-0.5 font-bold mr-1">
                Active: {datasetConfig.transforms?.length || 0}
              </span>
            )}
            <Button
              onClick={() => setShowLivePreview(!showLivePreview)}
              className={`h-6 text-[8px] uppercase font-black tracking-wider px-2 rounded-lg transition-all ${
                showLivePreview 
                  ? 'bg-white/5 hover:bg-white/10 text-muted-foreground border border-white/10' 
                  : 'bg-[#40d3b6] hover:bg-[#34bda2] text-black font-extrabold shadow-[0_0_8px_rgba(64,211,182,0.15)]'
              }`}
            >
              {showLivePreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {modality === 'text' ? (
            /* TEXT MODALITY: Dedicated Tokenizer Block */
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-[#40d3b6]" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">Custom Tokenizer</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Tokenizer Type</span>
                <select
                  value={datasetConfig.tokenizer || 'bpe'}
                  onChange={(e) => setDatasetConfig({ ...datasetConfig, tokenizer: e.target.value })}
                  className="w-full text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-2 text-white outline-none focus:border-[#40d3b6]"
                >
                  <option value="bpe">BPE (Byte-Pair Encoding)</option>
                  <option value="whitespace">Whitespace Split</option>
                  <option value="char">Character Split</option>
                </select>
                <span className="text-[9px] text-muted-foreground/60 italic leading-snug">
                  BPE trains a subword vocabulary, whitespace splits on words, character splits on characters.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-muted-foreground uppercase">Vocab Size Limit</span>
                  <input
                    type="number"
                    value={datasetConfig.vocab_size || 30000}
                    onChange={(e) => setDatasetConfig({ ...datasetConfig, vocab_size: parseInt(e.target.value) || 30000 })}
                    className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 text-white outline-none focus:border-[#40d3b6]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-muted-foreground uppercase">Max Seq Length</span>
                  <input
                    type="number"
                    value={datasetConfig.max_length || 512}
                    onChange={(e) => setDatasetConfig({ ...datasetConfig, max_length: parseInt(e.target.value) || 512 })}
                    className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 text-white outline-none focus:border-[#40d3b6]"
                  />
                </div>
              </div>

              <Separator className="bg-white/5" />

              <div className="flex flex-col gap-2.5">
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Text Preprocessing</span>
                
                <div className="flex items-center justify-between py-1 border-b border-white/[0.02]">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white uppercase">Convert Lowercase</span>
                    <span className="text-[8px] text-muted-foreground leading-tight">Normalize text casing</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={datasetConfig.lowercase ?? true}
                    onChange={(e) => setDatasetConfig({ ...datasetConfig, lowercase: e.target.checked })}
                    className="accent-[#40d3b6] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white uppercase">Strip Punctuation</span>
                    <span className="text-[8px] text-muted-foreground leading-tight">Remove punctuation tokens</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={datasetConfig.remove_punctuation ?? false}
                    onChange={(e) => setDatasetConfig({ ...datasetConfig, remove_punctuation: e.target.checked })}
                    className="accent-[#40d3b6] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* NON-TEXT MODALITIES: Transforms pipeline builder */
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Transforms Pipeline</span>
                <Button 
                  onClick={() => setAddTransformOpen(!addTransformOpen)}
                  className="bg-primary/10 border border-primary/20 hover:bg-primary/20 text-[#40d3b6] text-[10px] uppercase font-black tracking-wider px-3 h-7 rounded-lg"
                >
                  <Plus size={12} className="mr-1" /> Add Transform
                </Button>
              </div>

              {/* Add transform list catalog dropdown drawer */}
              {addTransformOpen && (
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2.5 max-h-56 overflow-y-auto no-scrollbar">
                  <div className="text-[9px] text-[#40d3b6] font-black uppercase tracking-wider mb-1">Select Augmentation</div>
                  {transformsCatalog.map((tc) => (
                    <button
                      key={tc.name}
                      onClick={() => {
                        const defaultParams: any = {};
                        Object.entries(tc.params).forEach(([k, schema]: [string, any]) => {
                          defaultParams[k] = schema.default;
                        });
                        addTransform({ type: tc.name, ...defaultParams });
                        setAddTransformOpen(false);
                      }}
                      className="w-full text-left p-2 hover:bg-primary/10 hover:text-white rounded-xl text-xs flex justify-between items-center transition-all group"
                    >
                      <span className="font-bold text-white/80 group-hover:text-white">{tc.name}</span>
                      <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wide bg-white/5 px-2 py-0.5 rounded-md group-hover:bg-primary/20 group-hover:text-[#40d3b6]">{tc.category}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Active Pipeline List */}
              <div className="space-y-3">
                {datasetConfig.transforms.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground italic bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                    No transforms applied. Dataset returns raw samples.
                  </div>
                ) : (
                  datasetConfig.transforms.map((t: any, index: number) => {
                    const isExpanded = expandedTransformIndex === index;
                    return (
                      <div key={index} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4.5 select-none transition-all">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setExpandedTransformIndex(isExpanded ? null : index)}
                            className="flex items-center gap-2 hover:opacity-85 text-left"
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span className="text-xs font-black tracking-wide text-white uppercase">{t.type}</span>
                          </button>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => index > 0 && reorderTransforms(index, index - 1)}
                              disabled={index === 0}
                              className="text-muted-foreground hover:text-white disabled:opacity-30 disabled:hover:text-muted-foreground"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              onClick={() => index < datasetConfig.transforms.length - 1 && reorderTransforms(index, index + 1)}
                              disabled={index === datasetConfig.transforms.length - 1}
                              className="text-muted-foreground hover:text-white disabled:opacity-30 disabled:hover:text-muted-foreground"
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              onClick={() => removeTransform(index)}
                              className="text-muted-foreground hover:text-red-400"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && renderTransformParamsEditor(t, index)}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* COLUMN 3: SIDE-BY-SIDE LIVE PREVIEW COMPARE */}
      {showLivePreview && (
        <div className="w-[320px] shrink-0 border-l border-primary/10 bg-[#0c0c0e] overflow-y-auto no-scrollbar flex flex-col min-w-0">
          <div className="p-4 border-b border-primary/10 flex items-center justify-between shrink-0 bg-[#070709]/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <Eye size={15} className="text-[#40d3b6] animate-pulse" />
              <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#40d3b6]">Live Preview</h2>
            </div>
            <Button
              onClick={handleFetchPreview}
              disabled={previewLoading}
              className="bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/45 rounded-lg h-6 text-[8px] uppercase font-black tracking-wider px-2"
            >
              {previewLoading ? <Loader2 size={10} className="animate-spin mr-1" /> : <RefreshCw size={9} className="mr-1" />}
              Refresh
            </Button>
          </div>

          <div className="p-4 flex-1 min-h-0 space-y-4">
            {previewLoading && !previewResult && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground select-none">
                <Loader2 className="w-8 h-8 animate-spin text-[#40d3b6]" />
                <span className="text-[10px] font-bold tracking-wider uppercase">Loading Previews...</span>
              </div>
            )}

            {previewError && (
              <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl text-red-400 text-[10px] flex gap-2 leading-relaxed">
                <span>⚠️</span>
                <div>
                  <span className="font-extrabold uppercase block text-[8px] mb-0.5">Preview State</span>
                  {previewError}
                </div>
              </div>
            )}

            {!previewLoading && !previewError && previewResult && (
              <div className="space-y-4">
                {previewResult.samples.length === 0 ? (
                  <div className="p-8 text-center text-[10px] text-muted-foreground italic bg-white/[0.01] border border-white/5 rounded-xl">
                    No preview samples returned. Verify paths or configurations.
                  </div>
                ) : (
                  (() => {
                    const sample = previewResult.samples[previewSampleIndex];
                    if (!sample) return null;
                    
                    return (
                      <div className="space-y-4 select-text">
                        {/* Pagination Selector */}
                        <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-xl px-3 py-1.5">
                          <Button
                            disabled={previewSampleIndex === 0}
                            onClick={() => setPreviewSampleIndex(prev => prev - 1)}
                            size="sm"
                            className="h-5 w-5 p-0 bg-white/5 hover:bg-white/10 rounded-md"
                          >
                            <ChevronLeft size={12} />
                          </Button>
                          <span className="text-[9px] font-mono font-black text-muted-foreground uppercase">
                            Sample {previewSampleIndex + 1} of {previewResult.samples.length}
                          </span>
                          <Button
                            disabled={previewSampleIndex === previewResult.samples.length - 1}
                            onClick={() => setPreviewSampleIndex(prev => prev + 1)}
                            size="sm"
                            className="h-5 w-5 p-0 bg-white/5 hover:bg-white/10 rounded-md"
                          >
                            <ChevronRight size={12} />
                          </Button>
                        </div>

                        {/* Sample Card */}
                        <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden p-4 space-y-4 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                          {/* Card Header showing Label */}
                          <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground border-b border-white/5 pb-2">
                            <span>Sample details</span>
                            <span className="text-[#40d3b6] font-mono font-extrabold bg-[#40d3b6]/10 px-1.5 py-0.5 rounded border border-[#40d3b6]/15">
                              Label: {sample.label}
                            </span>
                          </div>

                          {/* Vertical stack */}
                          <div className="space-y-4">
                            {/* PART A: RAW (BEFORE) */}
                            <div className="space-y-1.5">
                              <div className="text-[9px] font-black uppercase text-muted-foreground/80 tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                                Original (Raw)
                              </div>
                              
                              {previewResult.modality === 'image' && (
                                <div className="aspect-square bg-black/40 border border-white/5 rounded-xl flex items-center justify-center overflow-hidden p-2 relative max-w-[240px] mx-auto">
                                  {sample.raw.thumbnail ? (
                                    <img src={sample.raw.thumbnail} alt="Raw image" className="max-h-full max-w-full object-contain rounded-lg shadow-md" />
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground italic">Raw preview unavailable</span>
                                  )}
                                </div>
                              )}

                              {previewResult.modality === 'text' && (
                                <div className="bg-black/40 border border-white/5 rounded-xl p-3 min-h-[70px] text-[11px] leading-relaxed text-white/90 font-sans break-words whitespace-pre-wrap select-all">
                                  {sample.raw.text || <span className="text-muted-foreground italic">No text content</span>}
                                </div>
                              )}

                              {previewResult.modality === 'tabular' && (
                                <div className="bg-black/40 border border-white/5 rounded-xl p-3 min-h-[70px] text-[10px] font-mono text-white/95 space-y-1 overflow-y-auto max-h-[120px] no-scrollbar select-all">
                                  {sample.raw.features && typeof sample.raw.features === 'object' ? (
                                    Object.entries(sample.raw.features).map(([k, v]: [string, any]) => (
                                      <div key={k} className="flex justify-between border-b border-white/[0.02] pb-0.5">
                                        <span className="text-muted-foreground truncate mr-2">{k}:</span>
                                        <span className="text-white truncate font-bold">{typeof v === 'number' ? v.toFixed(3) : String(v)}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-muted-foreground italic">No features</span>
                                  )}
                                </div>
                              )}

                              {previewResult.modality === 'audio' && (
                                <div className="bg-black/40 border border-white/5 rounded-xl p-3 min-h-[70px] text-[10px] font-mono text-muted-foreground space-y-1 select-all">
                                  <div className="text-white font-extrabold uppercase text-[8px] flex items-center gap-1.5"><Music size={11} /> Waveform Stats</div>
                                  <div className="space-y-0.5 bg-[#050507] border border-white/5 rounded p-1 text-[9px]">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Mean Power:</span><span>{sample.raw.mean?.toFixed(4) || '0'}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Min Amp:</span><span>{sample.raw.min?.toFixed(4) || '0'}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Max Amp:</span><span>{sample.raw.max?.toFixed(4) || '0'}</span></div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Arrow connector */}
                            <div className="flex flex-col items-center gap-0.5 select-none">
                              <ArrowDown size={12} className="text-[#40d3b6] animate-pulse" />
                              <span className="text-[7.5px] uppercase tracking-wider text-[#40d3b6]/80 font-black">Applied Pipeline</span>
                            </div>

                            {/* PART B: TRANSFORMED (AFTER) */}
                            <div className="space-y-1.5">
                              <div className="text-[9px] font-black uppercase text-[#40d3b6] tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#40d3b6]" />
                                Transformed
                              </div>

                              {previewResult.modality === 'image' && (
                                <div className="aspect-square bg-black/40 border border-[#40d3b6]/20 rounded-xl flex items-center justify-center overflow-hidden p-2 relative max-w-[240px] mx-auto">
                                  {sample.transformed.thumbnail ? (
                                    <img src={sample.transformed.thumbnail} alt="Transformed image" className="max-h-full max-w-full object-contain rounded-lg shadow-md" />
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground italic">Processed preview unavailable</span>
                                  )}
                                </div>
                              )}

                              {previewResult.modality === 'text' && (
                                <div className="bg-black/40 border border-[#40d3b6]/20 rounded-xl p-3 min-h-[70px] text-[11px] leading-relaxed text-[#40d3b6] font-mono break-words whitespace-pre-wrap select-all">
                                  {Array.isArray(sample.transformed.tokens) 
                                    ? sample.transformed.tokens.join(', ') 
                                    : (sample.transformed.text || <span className="text-muted-foreground italic">No tokens</span>)}
                                </div>
                              )}

                              {previewResult.modality === 'tabular' && (
                                <div className="bg-black/40 border border-[#40d3b6]/20 rounded-xl p-3 min-h-[70px] text-[10px] font-mono text-[#40d3b6] space-y-1 overflow-y-auto max-h-[120px] no-scrollbar select-all">
                                  {sample.transformed.features ? (
                                    `[${sample.transformed.features.map((n: number) => n.toFixed(4)).join(', ')}]`
                                  ) : (
                                    <span className="text-muted-foreground italic">No transformed features</span>
                                  )}
                                </div>
                              )}

                              {previewResult.modality === 'audio' && (
                                <div className="bg-black/40 border border-[#40d3b6]/20 rounded-xl p-3 min-h-[70px] text-[10px] font-mono text-[#40d3b6] space-y-1.5 select-all">
                                  <div className="text-primary font-extrabold uppercase text-[8px] flex items-center justify-between">
                                    <span className="flex items-center gap-1.5"><Table size={11} /> Spectral Features</span>
                                    {sample.transformed.shape && (
                                      <span>Shape: {sample.transformed.shape.join('×')}</span>
                                    )}
                                  </div>
                                  <div className="space-y-0.5 bg-[#050507] border border-white/5 rounded p-1 text-[9px]">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Mean Power:</span><span>{sample.transformed.mean?.toFixed(4) || '0'}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Min Amp:</span><span>{sample.transformed.min?.toFixed(4) || '0'}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Max Amp:</span><span>{sample.transformed.max?.toFixed(4) || '0'}</span></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Extra size/modality banner */}
                        <div className="text-[8px] text-muted-foreground font-mono bg-white/[0.02] border border-white/5 p-2 rounded-xl text-center space-y-0.5">
                          <div>Total Size: <strong className="text-white">{previewResult.total_size}</strong> samples</div>
                          <div>Modality: <strong className="text-[#40d3b6] uppercase font-black">{previewResult.modality}</strong></div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );

  function renderTransformParamsEditor(t: any, index: number) {
    const catalogItem = transformsCatalog.find(tc => tc.name === t.type);
    if (!catalogItem || !catalogItem.params || Object.keys(catalogItem.params).length === 0) {
      return (
        <div className="text-[10px] text-muted-foreground italic px-2 py-1 bg-white/5 rounded-lg mt-2 select-none">
          No parameters config needed.
        </div>
      );
    }

    return (
      <div className="space-y-3.5 p-3.5 bg-black/30 border border-white/5 rounded-xl mt-3 select-none">
        {Object.entries(catalogItem.params).map(([pName, pSchema]: [string, any]) => {
          const currentValue = t[pName] !== undefined ? t[pName] : pSchema.default;
          const valueString = Array.isArray(currentValue) ? currentValue.join(', ') : (currentValue ?? '');

          return (
            <div key={pName} className="flex flex-col gap-1.5">
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
                className="w-full text-xs bg-black/40 border border-primary/20 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#40d3b6] font-mono text-white nodrag"
                placeholder={pSchema.description || `Enter value`}
              />
              <span className="text-[9px] text-muted-foreground/60 leading-snug">
                {pSchema.description}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
}
