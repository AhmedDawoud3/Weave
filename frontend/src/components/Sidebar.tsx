import { LayoutDashboard, Database, Sliders, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useWeaveStore } from '../store/useWeaveStore';

interface SidebarProps {
  onNavigateDashboard: () => void;
}

export function Sidebar({ onNavigateDashboard }: SidebarProps) {
  const { datasetConfig, inferredDatasetShape, setActiveTab } = useWeaveStore();

  return (
    <div className="w-80 border-r border-primary/10 bg-card/25 backdrop-blur-md flex flex-col h-full overflow-hidden select-none">
      {/* Brand Header */}
      <div className="p-6 pb-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2" onClick={onNavigateDashboard}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-[#1e8fd3] flex items-center justify-center border border-primary/25 cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-black text-[#40d3b6] tracking-wider cursor-pointer">WEAVE</h1>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onNavigateDashboard}
          className="hover:bg-primary/15 text-muted-foreground hover:text-[#40d3b6] rounded-xl transition-all cursor-pointer"
        >
          <LayoutDashboard size={18} />
        </Button>
      </div>

      <div className="px-6 shrink-0">
        <Separator className="bg-primary/10 my-3" />
      </div>

      {/* Dataset Summary Box */}
      <div className="flex-1 p-6 space-y-5 overflow-y-auto no-scrollbar">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
          <Database size={13} className="text-[#40d3b6]" />
          Active Ingestion
        </div>

        {!datasetConfig ? (
          <div className="p-5 border border-dashed border-white/5 bg-white/[0.01] rounded-2xl text-center space-y-4">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              No dataset is currently configured for this project. Setup a dataset to run training or propagate shapes.
            </p>
            <Button
              onClick={() => setActiveTab('dataset')}
              className="w-full bg-primary/10 border border-primary/20 hover:bg-primary text-white hover:text-black font-extrabold text-[10px] uppercase tracking-wider h-8 rounded-xl flex items-center justify-center gap-1"
            >
              Configure Dataset <ArrowRight size={12} />
            </Button>
          </div>
        ) : (
          (() => {
            const isPredefined = datasetConfig.source === 'predefined';
            const isImageFolder = datasetConfig.source === 'image_folder';
            const isCustom = datasetConfig.source === 'custom';
            const customConfig = isCustom ? (datasetConfig as any) : null;
            const isTextPredefined = isPredefined && datasetConfig.name === 'AG_NEWS_SUBSET';
            const modality = isTextPredefined ? 'text' : (isPredefined ? 'image' : (isImageFolder ? 'image' : (customConfig?.modality || 'image')));
            
            return (
              <div className="bg-[#07070a]/65 border border-primary/15 rounded-2xl p-4.5 space-y-4.5 shadow-[0_0_20px_rgba(64,211,182,0.02)]">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] text-[#40d3b6] font-extrabold uppercase tracking-wide block mb-1">
                      Source: {datasetConfig.source}
                    </span>
                    <h3 className="text-sm font-black text-white capitalize leading-tight">
                      {isPredefined ? datasetConfig.name : (isCustom ? customConfig.modality : 'Image Folder')}
                    </h3>
                  </div>
                  <span className="text-[8px] bg-primary/10 text-primary border border-primary/20 rounded-md px-1.5 py-0.5 font-bold uppercase tracking-wider">
                    {modality}
                  </span>
                </div>

                <Separator className="bg-white/5" />

                <div className="space-y-2 text-[10px] font-mono text-muted-foreground">
                  {isPredefined && (
                    <div className="flex justify-between">
                      <span>Split Name:</span>
                      <span className="text-white font-bold uppercase">{datasetConfig.split}</span>
                    </div>
                  )}
                  {isImageFolder && (
                    <div className="flex flex-col gap-0.5">
                      <span>Root Path:</span>
                      <span className="text-white truncate font-bold text-[9px]">{datasetConfig.root}</span>
                    </div>
                  )}
                  {isCustom && (
                    <div className="flex flex-col gap-0.5">
                      <span>Path / Folder:</span>
                      <span className="text-white truncate font-bold text-[9px]">
                        {customConfig.file_path || customConfig.root || 'Not set'}
                      </span>
                    </div>
                  )}

                  {modality === 'text' ? (
                    <>
                      <div className="flex justify-between mt-1">
                        <span>Tokenizer:</span>
                        <span className="text-white font-bold uppercase">{(datasetConfig as any).tokenizer || 'bpe'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vocab Size:</span>
                        <span className="text-white font-bold">{(datasetConfig as any).vocab_size || 10000}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Seq Length:</span>
                        <span className="text-white font-bold">{(datasetConfig as any).max_length || 128}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between mt-1">
                      <span>Transforms:</span>
                      <span className="text-white font-bold">{(datasetConfig as any).transforms?.length || 0} active</span>
                    </div>
                  )}

                  <Separator className="bg-white/5 my-2" />

                  <div className="flex justify-between text-xs mt-1.5 items-center">
                    <span className="text-muted-foreground uppercase text-[9px] font-bold">Tensor Shape:</span>
                    <span className="text-[#40d3b6] font-bold text-[11px] font-mono">
                      {inferredDatasetShape ? inferredDatasetShape.join('×') : 'Unknown'}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => setActiveTab('dataset')}
                  className="w-full bg-primary/10 border border-primary/20 hover:bg-primary text-white hover:text-black font-extrabold text-[10px] uppercase tracking-wider h-8 rounded-xl flex items-center justify-center gap-1 mt-2"
                >
                  Edit Config <Sliders size={12} className="ml-0.5" />
                </Button>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
