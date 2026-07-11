import { Sliders, FileText, Plus, ChevronDown, ChevronRight, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { TransformCatalogEntry } from '../../types';

interface TransformPipelineProps {
  datasetConfig: any;
  setDatasetConfig: (config: any) => void;
  transformsCatalog: TransformCatalogEntry[];
  expandedTransformIndex: number | null;
  setExpandedTransformIndex: (idx: number | null) => void;
  addTransformOpen: boolean;
  setAddTransformOpen: (open: boolean) => void;
  onAddTransform: (t: any) => void;
  onRemoveTransform: (idx: number) => void;
  onReorderTransforms: (idx1: number, idx2: number) => void;
  onParamChange: (tIdx: number, paramName: string, valueStr: string, typeHint: string) => void;
  showLivePreview: boolean;
  setShowLivePreview: (show: boolean) => void;
}

export function TransformPipeline({
  datasetConfig,
  setDatasetConfig,
  transformsCatalog,
  expandedTransformIndex,
  setExpandedTransformIndex,
  addTransformOpen,
  setAddTransformOpen,
  onAddTransform,
  onRemoveTransform,
  onReorderTransforms,
  onParamChange,
  showLivePreview,
  setShowLivePreview
}: TransformPipelineProps) {
  const modality = datasetConfig.source === 'predefined'
    ? 'image' // Default for predefined if not specified
    : (datasetConfig.source === 'image_folder' ? 'image' : datasetConfig.modality);

  function renderTransformParamsEditor(t: any, index: number) {
    const catalogItem = transformsCatalog.find(tc => tc.name === t.type);
    if (!catalogItem || !catalogItem.params || Object.keys(catalogItem.params).length === 0) {
      return (
        <div className="text-[10px] text-muted-foreground italic px-2.5 py-1.5 bg-foreground/5 rounded-lg mt-2 select-none border border-border">
          No parameters configuration required.
        </div>
      );
    }

    return (
      <div className="space-y-3.5 p-3.5 bg-foreground/30 border border-border rounded-xl mt-3 select-none">
        {Object.entries(catalogItem.params).map(([pName, pSchema]: [string, any]) => {
          const currentValue = t[pName] !== undefined ? t[pName] : pSchema.default;
          const valueString = Array.isArray(currentValue) ? currentValue.join(', ') : (currentValue ?? '');

          return (
            <div key={pName} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold text-[#40d3b6] uppercase tracking-wide">
                  {pName}
                </span>
                <span className="text-[8px] text-muted-foreground italic uppercase tracking-wider">
                  {pSchema.type} {pSchema.required ? '(required)' : ''}
                </span>
              </div>
              <input
                type="text"
                value={valueString}
                onChange={(e) => onParamChange(index, pName, e.target.value, pSchema.type)}
                className="w-full text-xs bg-foreground/[0.45] border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary font-mono text-foreground nodrag"
                placeholder={pSchema.description || `Enter value`}
              />
              <span className="text-[10px] text-muted-foreground/60 leading-snug">
                {pSchema.description}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex-1 border-r border-sidebar-border flex flex-col bg-sidebar-accent overflow-y-auto no-scrollbar">
      <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Sliders size={18} className="text-primary" />
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-primary">
            {modality === 'text' ? 'Tokenizer Configuration' : 'Augmentations Pipeline'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {modality !== 'text' && (
            <span className="text-[10px] bg-primary/10 text-primary border border-primary/15 rounded-lg px-2 py-0.5 font-bold mr-1">
              Active: {datasetConfig.transforms?.length || 0}
            </span>
          )}
          <Button
            onClick={() => setShowLivePreview(!showLivePreview)}
            className={`h-7 text-[9px] uppercase font-black tracking-wider px-2 rounded-lg transition-all ${
              showLivePreview 
                ? 'bg-foreground/5 hover:bg-foreground/10 text-muted-foreground border border-border' 
                : 'bg-[#40d3b6] hover:bg-[#34bda2] text-black font-extrabold shadow-glow'
            }`}
          >
            {showLivePreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {modality === 'text' ? (
          /* TEXT MODALITY: Dedicated Tokenizer Block */
          <div className="bg-foreground/[0.15] border border-border rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-[#40d3b6]" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">Custom Tokenizer</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Tokenizer Type</span>
              <select
                value={datasetConfig.tokenizer || 'bpe'}
                onChange={(e) => setDatasetConfig({ ...datasetConfig, tokenizer: e.target.value })}
                className="w-full text-xs bg-foreground/[0.45] border border-border rounded-xl px-3 py-2 text-foreground outline-none focus:border-primary cursor-pointer"
              >
                <option value="bpe">BPE (Byte-Pair Encoding)</option>
                <option value="whitespace">Whitespace Split</option>
                <option value="char">Character Split</option>
              </select>
              <span className="text-[10px] text-muted-foreground/60 italic leading-snug">
                BPE trains a subword vocabulary, whitespace splits on words, character splits on characters.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Vocab Size Limit</span>
                <input
                  type="number"
                  value={datasetConfig.vocab_size || 30000}
                  onChange={(e) => setDatasetConfig({ ...datasetConfig, vocab_size: parseInt(e.target.value) || 30000 })}
                  className="text-xs bg-foreground/[0.45] border border-border rounded-xl px-3 py-1.5 text-foreground outline-none focus:border-primary nodrag"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Max Seq Length</span>
                <input
                  type="number"
                  value={datasetConfig.max_length || 512}
                  onChange={(e) => setDatasetConfig({ ...datasetConfig, max_length: parseInt(e.target.value) || 512 })}
                  className="text-xs bg-foreground/[0.45] border border-border rounded-xl px-3 py-1.5 text-foreground outline-none focus:border-primary nodrag"
                />
              </div>
            </div>

            <Separator className="bg-border" />

            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Text Preprocessing</span>
              
              <div className="flex items-center justify-between py-2 border-b border-border/20">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-foreground uppercase">Convert Lowercase</span>
                  <span className="text-[8px] text-muted-foreground leading-tight">Normalize text casing</span>
                </div>
                <input
                  type="checkbox"
                  checked={datasetConfig.lowercase ?? true}
                  onChange={(e) => setDatasetConfig({ ...datasetConfig, lowercase: e.target.checked })}
                  className="accent-primary cursor-pointer w-4 h-4"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-foreground uppercase">Strip Punctuation</span>
                  <span className="text-[8px] text-muted-foreground leading-tight">Remove punctuation tokens</span>
                </div>
                <input
                  type="checkbox"
                  checked={datasetConfig.remove_punctuation ?? false}
                  onChange={(e) => setDatasetConfig({ ...datasetConfig, remove_punctuation: e.target.checked })}
                  className="accent-primary cursor-pointer w-4 h-4"
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
                className="bg-primary/10 border border-primary/20 hover:bg-primary/20 text-[#40d3b6] text-[10px] uppercase font-black tracking-wider px-3 h-7 rounded-lg shadow-sm"
              >
                <Plus size={12} className="mr-1" /> Add Transform
              </Button>
            </div>

            {/* Add transform list catalog dropdown drawer */}
            {addTransformOpen && (
              <div className="p-3 bg-foreground/[0.15] border border-border rounded-2xl space-y-2.5 max-h-56 overflow-y-auto no-scrollbar shadow-inner">
                <div className="text-[9px] text-[#40d3b6] font-black uppercase tracking-wider mb-1">Select Augmentation</div>
                {transformsCatalog.map((tc) => (
                  <button
                    key={tc.name}
                    onClick={() => {
                      const defaultParams: any = {};
                      Object.entries(tc.params).forEach(([k, schema]: [string, any]) => {
                        defaultParams[k] = schema.default;
                      });
                      onAddTransform({ type: tc.name, ...defaultParams });
                      setAddTransformOpen(false);
                    }}
                    className="w-full text-left p-2 hover:bg-primary/10 hover:text-foreground rounded-xl text-xs flex justify-between items-center transition-all group"
                  >
                    <span className="font-bold text-foreground/80 group-hover:text-foreground">{tc.name}</span>
                    <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wide bg-foreground/5 px-2 py-0.5 rounded-md group-hover:bg-primary/20 group-hover:text-[#40d3b6]">{tc.category}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Active Pipeline List */}
            <div className="space-y-3">
              {!datasetConfig.transforms || datasetConfig.transforms.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground italic bg-foreground/10 border border-dashed border-border rounded-2xl">
                  No transforms applied. Dataset returns raw samples.
                </div>
              ) : (
                datasetConfig.transforms.map((t: any, index: number) => {
                  const isExpanded = expandedTransformIndex === index;
                  return (
                    <div key={index} className="bg-foreground/[0.15] border border-border rounded-2xl p-4.5 select-none transition-all hover:border-primary/25">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setExpandedTransformIndex(isExpanded ? null : index)}
                          className="flex items-center gap-2 hover:opacity-85 text-left focus:outline-none"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span className="text-xs font-black tracking-wide text-foreground uppercase">{t.type}</span>
                        </button>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => index > 0 && onReorderTransforms(index, index - 1)}
                            disabled={index === 0}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground cursor-pointer"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => index < datasetConfig.transforms.length - 1 && onReorderTransforms(index, index + 1)}
                            disabled={index === datasetConfig.transforms.length - 1}
                            className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground cursor-pointer"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            onClick={() => onRemoveTransform(index)}
                            className="text-muted-foreground hover:text-red-400 cursor-pointer"
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
  );
}
