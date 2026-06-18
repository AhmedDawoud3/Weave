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
    setDataLoaderConfig
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
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
        <Database className="w-12 h-12 text-[#40d3b6]/40 mb-4" />
        <h3 className="text-sm font-bold text-white mb-2">Configure Input Pipeline</h3>
        <p className="text-xs text-muted-foreground max-w-[240px] mb-6 leading-relaxed">
          Set up a predefined dataset, load a folder of images, or configure custom modalities to seed your model canvas.
        </p>
        <div className="flex flex-col gap-2.5 w-full">
          <Button onClick={() => setDatasetSource('predefined')} className="w-full bg-primary/10 border border-primary/20 hover:bg-primary/20 text-[#40d3b6] hover:text-white rounded-xl">
            Predefined Dataset (MNIST, CIFAR)
          </Button>
          <Button onClick={() => setDatasetSource('image_folder')} className="w-full bg-primary/10 border border-primary/20 hover:bg-primary/20 text-[#40d3b6] hover:text-white rounded-xl">
            Image Folder Path
          </Button>
          <Button onClick={() => setDatasetSource('custom')} className="w-full bg-primary/10 border border-primary/20 hover:bg-primary/20 text-[#40d3b6] hover:text-white rounded-xl">
            Custom Tabular / Text / Audio
          </Button>
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
                      <span className="text-[11px] font-black tracking-wide text-white">{dataset.name}</span>
                      <span className="text-[8px] text-muted-foreground truncate leading-snug">{dataset.description}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-primary/80 font-bold">
                        {dataset.shape?.join('×')}
                      </span>
                      <span className="text-[8px] text-muted-foreground/80 font-black">
                        {dataset.num_classes} CLS
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

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
              </div>
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
                  <input
                    type="text"
                    value={datasetConfig.root || ''}
                    onChange={(e) => setDatasetConfig({ ...datasetConfig, root: e.target.value })}
                    className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                    placeholder="Image folder path"
                  />
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
                  <input
                    type="text"
                    value={datasetConfig.file_path || ''}
                    onChange={(e) => setDatasetConfig({ ...datasetConfig, file_path: e.target.value })}
                    className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                    placeholder="Path to dataset file"
                  />
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
                  <input
                    type="text"
                    value={datasetConfig.file_path || ''}
                    onChange={(e) => setDatasetConfig({ ...datasetConfig, file_path: e.target.value })}
                    className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                    placeholder="Path to tabular file"
                  />
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
                  <input
                    type="text"
                    value={datasetConfig.root || ''}
                    onChange={(e) => setDatasetConfig({ ...datasetConfig, root: e.target.value })}
                    className="text-xs bg-black/40 border border-primary/20 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#40d3b6] text-white nodrag"
                    placeholder="Root directory of audio files"
                  />
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
      </div>
    </div>
  );
}
