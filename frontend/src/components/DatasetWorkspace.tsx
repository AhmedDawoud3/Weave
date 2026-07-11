import { useEffect, useState } from 'react';
import { useWeaveStore } from '../store/useWeaveStore';
import { api } from '../services/api';
import { 
  Database, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronRight,
  ImageIcon, Sparkles, Sliders
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { DatasetCatalogEntry, TransformCatalogEntry } from '../types';
import { DatasetBrowser } from './dataset/DatasetBrowser';
import { CustomDatasetForm } from './dataset/CustomDatasetForm';
import { TransformPipeline } from './dataset/TransformPipeline';
import { DataPreview } from './dataset/DataPreview';
import { toast } from './ui/toaster';

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
        toast.success("Folder scanned successfully!");
      } else {
        setScanStatus('error');
        setScanError(res.message || 'Scanning failed.');
        toast.error("Scanning failed.");
      }
    } catch (err: any) {
      setScanStatus('error');
      setScanError(err.message || 'Error occurred while scanning path.');
      toast.error("Scanning failed.");
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
      if (res.valid) {
        toast.success("Configuration is valid!");
      } else {
        toast.error("Configuration has errors.");
      }
    } catch (err: any) {
      setValidationResult({
        valid: false,
        errors: [err.message || "Failed to validate dataset config."],
        warnings: []
      });
      toast.error("Validation failed.");
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
      <div className="flex-1 flex flex-col items-center justify-center bg-background h-full gap-3 text-muted-foreground select-none">
        <Loader2 className="w-10 h-10 animate-spin text-[#40d3b6]" />
        <span className="text-xs font-extrabold tracking-widest text-[#40d3b6]/80 uppercase">Loading Dataset Workspace...</span>
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background h-full gap-4 text-red-400 select-none p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 animate-pulse" />
        <span className="text-xs font-black tracking-widest uppercase leading-relaxed">{catalogError}</span>
        <Button onClick={() => window.location.reload()} className="bg-primary/10 border border-primary/20 hover:bg-primary text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all">
          RETRY CONNECTION
        </Button>
      </div>
    );
  }

  // Pre-initialize datasetConfig if it is null on loading
  if (!datasetConfig) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center select-none bg-background p-10 h-full">
        <div className="flex flex-col items-center text-center max-w-md">
          <div className="w-16 h-16 bg-primary/5 rounded-3xl flex items-center justify-center border border-border mb-5 shadow-glow">
            <Database className="w-8 h-8 text-[#40d3b6]" />
          </div>
          <h3 className="text-base font-black text-foreground uppercase tracking-wider">Initialize Dataset Pipeline</h3>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Choose a data ingestion strategy to supply samples, manage augmentation pipelines, and propagate tensor shapes to the visual model.
          </p>
          <div className="grid grid-cols-3 gap-3 w-full mt-8">
            <button
              onClick={() => setDatasetSource('predefined')}
              className="p-4 rounded-2xl border border-border bg-foreground/10 hover:bg-foreground/20 hover:border-primary/20 text-xs font-black uppercase text-foreground hover:text-[#40d3b6] transition-all flex flex-col items-center gap-2 cursor-pointer"
            >
              <Sparkles size={18} className="text-primary" />
              Predefined
            </button>
            <button
              onClick={() => setDatasetSource('image_folder')}
              className="p-4 rounded-2xl border border-border bg-foreground/10 hover:bg-foreground/20 hover:border-primary/20 text-xs font-black uppercase text-foreground hover:text-[#40d3b6] transition-all flex flex-col items-center gap-2 cursor-pointer"
            >
              <ImageIcon size={18} className="text-sky-400" />
              Img Folder
            </button>
            <button
              onClick={() => setDatasetSource('custom')}
              className="p-4 rounded-2xl border border-border bg-foreground/10 hover:bg-foreground/20 hover:border-primary/20 text-xs font-black uppercase text-foreground hover:text-[#40d3b6] transition-all flex flex-col items-center gap-2 cursor-pointer"
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

  return (
    <div className="flex-1 flex overflow-hidden min-h-0 bg-background w-full text-foreground">
      
      {/* COLUMN 1: INGESTION CONFIG */}
      <div className="w-[380px] shrink-0 border-r border-sidebar-border flex flex-col bg-sidebar overflow-y-auto no-scrollbar">
        <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
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
            <div className="grid grid-cols-3 gap-1 bg-foreground/40 p-1 border border-border rounded-xl">
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
                    className={`py-2 text-[10px] font-black uppercase transition-all rounded-lg cursor-pointer ${
                      isActive 
                        ? 'bg-primary/20 text-[#40d3b6] border border-primary/30' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {labelMap[src]}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Catalog Ingest Config or Custom mod form */}
          {source === 'predefined' ? (
            <DatasetBrowser
              datasetConfig={datasetConfig}
              datasetsCatalog={datasetsCatalog}
              datasetDownloadStatus={datasetDownloadStatus}
              datasetDownloadProgress={datasetDownloadProgress}
              activePredefinedCategory={activePredefinedCategory}
              setActivePredefinedCategory={setActivePredefinedCategory}
              onSelectDataset={handlePredefinedDatasetSelect}
              onDownloadDataset={downloadDataset}
              onConfigChange={setDatasetConfig}
            />
          ) : (
            <CustomDatasetForm
              datasetConfig={datasetConfig}
              onConfigChange={setDatasetConfig}
              scanStatus={scanStatus}
              scanResult={scanResult}
              scanError={scanError}
              onScanPath={handleScanPath}
              onModalityChange={handleCustomModalityChange}
            />
          )}

          {/* DataLoader Panel */}
          <Separator className="bg-border" />
          <div className="bg-foreground/10 border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowDataLoader(!showDataLoader)}
              className="w-full flex items-center justify-between p-4 text-xs font-black uppercase text-foreground hover:bg-white/[0.02] transition-colors focus:outline-none cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-[#40d3b6]" />
                <span>DataLoader Options</span>
              </div>
              {showDataLoader ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {showDataLoader && (
              <div className="p-4 pt-0 space-y-3 bg-foreground/10">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Batch Size</span>
                    <input
                      type="number"
                      value={datasetConfig.dataloader?.batch_size ?? 32}
                      onChange={(e) => setDataLoaderConfig({ batch_size: parseInt(e.target.value) || 32 })}
                      className="text-xs bg-foreground/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary nodrag"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Num Workers</span>
                    <input
                      type="number"
                      value={datasetConfig.dataloader?.num_workers ?? 4}
                      onChange={(e) => setDataLoaderConfig({ num_workers: parseInt(e.target.value) || 4 })}
                      className="text-xs bg-foreground/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary nodrag"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Shuffle data</span>
                  <input
                    type="checkbox"
                    checked={datasetConfig.dataloader?.shuffle ?? true}
                    onChange={(e) => setDataLoaderConfig({ shuffle: e.target.checked })}
                    className="accent-primary cursor-pointer nodrag w-4 h-4"
                  />
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleValidateConfig}
            disabled={isValidating}
            className="w-full flex items-center justify-center gap-2 bg-[#40d3b6]/10 border border-[#40d3b6]/25 hover:bg-[#40d3b6]/20 text-[#40d3b6] rounded-xl text-xs py-2.5 font-bold transition-all shadow-sm cursor-pointer"
          >
            {isValidating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
            VALIDATE CONFIGURATION
          </Button>

          {validationResult && (
            <div className="text-[10px] font-mono p-3 bg-foreground/10 border border-border rounded-xl space-y-1 select-text">
              <div className="flex items-center gap-1.5 font-extrabold uppercase mb-1">
                {validationResult.valid ? (
                  <span className="text-[#40d3b6]">✔️ Schema Valid</span>
                ) : (
                  <span className="text-red-400">❌ Schema Invalid</span>
                )}
              </div>
              {validationResult.errors.map((err, i) => (
                <div key={i} className="text-red-400 leading-normal">error: {err}</div>
              ))}
              {validationResult.warnings.map((warn, i) => (
                <div key={i} className="text-yellow-400 leading-normal">warning: {warn}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* COLUMN 2: TRANSFORMS PIPELINE / TOKENIZER CONFIG */}
      <TransformPipeline
        datasetConfig={datasetConfig}
        setDatasetConfig={setDatasetConfig}
        transformsCatalog={transformsCatalog}
        expandedTransformIndex={expandedTransformIndex}
        setExpandedTransformIndex={setExpandedTransformIndex}
        addTransformOpen={addTransformOpen}
        setAddTransformOpen={setAddTransformOpen}
        onAddTransform={addTransform}
        onRemoveTransform={removeTransform}
        onReorderTransforms={reorderTransforms}
        onParamChange={handleParamChange}
        showLivePreview={showLivePreview}
        setShowLivePreview={setShowLivePreview}
      />

      {/* COLUMN 3: SIDE-BY-SIDE LIVE PREVIEW COMPARE */}
      {showLivePreview && (
        <DataPreview
          previewLoading={previewLoading}
          previewResult={previewResult}
          previewError={previewError}
          previewSampleIndex={previewSampleIndex}
          setPreviewSampleIndex={setPreviewSampleIndex}
          onFetchPreview={handleFetchPreview}
        />
      )}

    </div>
  );
}
