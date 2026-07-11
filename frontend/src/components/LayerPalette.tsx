import { useState, useRef, useEffect, DragEvent } from 'react';
import { useWeaveStore } from '../store/useWeaveStore';
import { Search, ChevronDown, ChevronRight, Layers, GitCommit, Settings, Cpu, Maximize, Database, LayoutDashboard, Sliders, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import type { LayerType } from '../types';

interface LayerCategory {
  name: string;
  colorClass: string;
  icon: any;
  types: LayerType[];
}

const CATEGORIES: LayerCategory[] = [
  {
    name: "Boundary",
    colorClass: "border-amber-500/20 text-amber-400 bg-amber-500/5 hover:border-amber-500/40 hover:bg-amber-500/10 hover:shadow-[0_0_10px_rgba(245,158,11,0.1)]",
    icon: GitCommit,
    types: ['InputNode', 'OutputNode']
  },
  {
    name: "Conv & Pool",
    colorClass: "border-cyan-500/20 text-cyan-400 bg-cyan-500/5 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:shadow-[0_0_10px_rgba(6,182,212,0.1)]",
    icon: Layers,
    types: ['Conv2d', 'ConvTranspose2d', 'MaxPool2d', 'AvgPool2d', 'AdaptiveAvgPool2d']
  },
  {
    name: "Linear",
    colorClass: "border-purple-500/20 text-purple-400 bg-purple-500/5 hover:border-purple-400/40 hover:bg-purple-500/10 hover:shadow-[0_0_10px_rgba(168,85,247,0.1)]",
    icon: GitCommit,
    types: ['Linear', 'Embedding']
  },
  {
    name: "Normalization",
    colorClass: "border-pink-500/20 text-pink-400 bg-pink-500/5 hover:border-pink-500/40 hover:bg-pink-500/10 hover:shadow-[0_0_10px_rgba(236,72,153,0.1)]",
    icon: Settings,
    types: ['BatchNorm2d', 'LayerNorm', 'GroupNorm']
  },
  {
    name: "Activations",
    colorClass: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:shadow-[0_0_10px_rgba(16,185,129,0.1)]",
    icon: Cpu,
    types: ['ReLU', 'GELU', 'Sigmoid', 'Tanh', 'Softmax']
  },
  {
    name: "Shape & Reg",
    colorClass: "border-blue-500/20 text-blue-400 bg-blue-500/5 hover:border-blue-500/40 hover:bg-blue-500/10 hover:shadow-[0_0_10px_rgba(59,130,246,0.1)]",
    icon: Maximize,
    types: ['Flatten', 'Reshape', 'Permute', 'Dropout', 'Dropout2d']
  },
  {
    name: "Ops",
    colorClass: "border-orange-500/20 text-orange-400 bg-orange-500/5 hover:border-orange-500/40 hover:bg-orange-500/10 hover:shadow-[0_0_10px_rgba(249,115,22,0.1)]",
    icon: Cpu,
    types: ['Add', 'Concat', 'Multiply']
  },
  {
    name: "Blocks",
    colorClass: "border-indigo-500/30 text-indigo-400 bg-indigo-500/5 hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:shadow-[0_0_10px_rgba(99,102,241,0.1)]",
    icon: Layers,
    types: ['ResidualBlock', 'TransformerEncoder', 'MultiHeadAttention', 'ConvBNReLU', 'BottleneckBlock', 'BatchNorm2dManualBlock', 'AttentionManualBlock', 'RNNManualBlock', 'CustomAutogradManualBlock']
  }
];

interface LayerPaletteProps {
  onNavigateDashboard: () => void;
}

export function LayerPalette({ onNavigateDashboard }: LayerPaletteProps) {
  const addNode = useWeaveStore((state) => state.addNode);
  const { datasetConfig, inferredDatasetShape, setActiveTab } = useWeaveStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    "Boundary": true,
    "Conv & Pool": true,
    "Blocks": true
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on "/" key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        const isEditing = document.activeElement && (
          document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA' ||
          document.activeElement.getAttribute('contenteditable') === 'true'
        );
        if (isEditing) return;
        
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, type: LayerType) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleLayerClick = (type: LayerType) => {
    addNode(type, { x: 350, y: 200 });
  };

  const toggleCategory = (name: string) => {
    setExpandedCategories(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // Filter layers based on search query
  const getFilteredLayers = () => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    const matches: Array<{ type: LayerType; category: LayerCategory }> = [];
    
    CATEGORIES.forEach(cat => {
      cat.types.forEach(t => {
        if (t.toLowerCase().includes(query)) {
          matches.push({ type: t, category: cat });
        }
      });
    });
    return matches;
  };

  const filteredMatches = getFilteredLayers();

  return (
    <div className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col h-full select-none shrink-0 relative z-30 font-sans">
      
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={onNavigateDashboard}>
          <img src="/logo_icon.svg" alt="Weave Icon" className="h-7 w-7" />
          <span className="text-sm font-black text-foreground tracking-wider">WEAVE</span>
        </div>
        <button
          onClick={onNavigateDashboard}
          className="p-1.5 hover:bg-sidebar-accent hover:text-primary rounded-lg text-muted-foreground transition-all cursor-pointer border-0 bg-transparent focus:outline-none"
        >
          <LayoutDashboard size={15} />
        </button>
      </div>

      {/* Active Ingestion Summary (Small part atop of the library) */}
      <div className="p-4 border-b border-sidebar-border shrink-0 space-y-2.5">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
          <Database size={11} className="text-primary" />
          <span>Active Ingestion</span>
        </div>
        
        {!datasetConfig ? (
          <div className="p-3 border border-dashed border-sidebar-border bg-foreground/10 rounded-xl text-center space-y-2 select-none">
            <p className="text-[10px] text-muted-foreground leading-normal">
              No dataset is configured.
            </p>
            <Button
              onClick={() => setActiveTab('dataset')}
              className="w-full bg-primary/10 hover:bg-primary text-white hover:text-primary-foreground font-black text-[10px] uppercase tracking-wider h-7 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
            >
              Configure <ArrowRight size={10} />
            </Button>
          </div>
        ) : (
          <div className="bg-foreground/[0.15] border border-sidebar-border rounded-xl p-3 space-y-2 select-none">
            <div className="flex justify-between items-center text-xs gap-2">
              <span className="text-foreground font-bold truncate flex-1 leading-tight uppercase tracking-wide">
                {datasetConfig.source === 'predefined' ? datasetConfig.name : 'Custom Dataset'}
              </span>
              <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5 font-black font-mono shrink-0">
                {inferredDatasetShape ? inferredDatasetShape.join('×') : 'Unknown'}
              </span>
            </div>
            <Button
              onClick={() => setActiveTab('dataset')}
              className="w-full bg-foreground/5 border border-sidebar-border hover:bg-primary text-white hover:text-primary-foreground font-bold text-[9px] uppercase tracking-wider h-6.5 rounded-lg flex items-center justify-center gap-0.5 cursor-pointer"
            >
              Edit config <Sliders size={10} className="ml-0.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Library Section Header */}
      <div className="p-4 pb-2 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Library</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground bg-sidebar-accent border border-sidebar-border rounded-md">
            /
          </kbd>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search layers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-sidebar-border pl-8 pr-3 h-8.5 rounded-lg text-xs text-foreground focus:outline-none focus:border-primary transition-all placeholder-muted-foreground/40"
          />
        </div>
      </div>

      {/* Layer List Scroll Container */}
      <div className="flex-1 overflow-y-auto p-3 pt-1 space-y-2 no-scrollbar">
        {filteredMatches !== null ? (
          /* Search results view */
          <div className="space-y-1">
            <div className="text-[9px] text-muted-foreground/60 uppercase font-black tracking-widest px-2.5 py-1">
              Search Results
            </div>
            {filteredMatches.length === 0 ? (
              <div className="text-xs text-muted-foreground/65 italic text-center py-4">
                No matching layers found
              </div>
            ) : (
              filteredMatches.map(({ type, category }) => (
                <div
                  key={type}
                  onDragStart={(e) => handleDragStart(e, type)}
                  onClick={() => handleLayerClick(type)}
                  draggable
                  className={`px-2.5 py-1.5 border rounded-lg text-xs font-bold tracking-wide uppercase cursor-grab active:cursor-grabbing transition-all flex items-center gap-2 select-none hover:brightness-110 hover:shadow-md ${category.colorClass}`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                  <span className="flex-1 text-left truncate">{type}</span>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Categories accordion view */
          CATEGORIES.map((cat) => {
            const isExpanded = !!expandedCategories[cat.name];
            const Icon = cat.icon;
            
            return (
              <div key={cat.name} className="space-y-1">
                <button
                  onClick={() => toggleCategory(cat.name)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-black uppercase text-left text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-all cursor-pointer border-0 bg-transparent focus:outline-none"
                >
                  <div className="flex items-center gap-2">
                    <Icon size={12} className="opacity-75" />
                    <span>{cat.name}</span>
                  </div>
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>

                {isExpanded && (
                  <div className="pl-1 space-y-1 animate-in fade-in duration-150">
                    {cat.types.map((type) => (
                      <div
                        key={type}
                        onDragStart={(e) => handleDragStart(e, type)}
                        onClick={() => handleLayerClick(type)}
                        draggable
                        className={`px-2.5 py-1.5 border rounded-lg text-xs font-bold tracking-wide uppercase cursor-grab active:cursor-grabbing transition-all flex items-center gap-2 select-none hover:brightness-110 hover:shadow-md ${cat.colorClass}`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                        <span className="flex-1 text-left truncate">{type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
