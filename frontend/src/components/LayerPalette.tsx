import { useState, useRef, useEffect, DragEvent } from 'react';
import { useWeaveStore } from '../store/useWeaveStore';
import { Search, ChevronDown, ChevronRight, Layers, GitCommit, Settings, Cpu, Maximize } from 'lucide-react';
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
    colorClass: "border-amber-500/20 text-amber-400 bg-amber-500/5 hover:border-amber-500/40 hover:bg-amber-500/10",
    icon: GitCommit,
    types: ['InputNode', 'OutputNode']
  },
  {
    name: "Conv & Pool",
    colorClass: "border-cyan-500/20 text-cyan-400 bg-cyan-500/5 hover:border-cyan-500/40 hover:bg-cyan-500/10",
    icon: Layers,
    types: ['Conv2d', 'ConvTranspose2d', 'MaxPool2d', 'AvgPool2d', 'AdaptiveAvgPool2d']
  },
  {
    name: "Linear",
    colorClass: "border-purple-500/20 text-purple-400 bg-purple-500/5 hover:border-purple-500/40 hover:bg-purple-500/10",
    icon: GitCommit,
    types: ['Linear', 'Embedding']
  },
  {
    name: "Normalization",
    colorClass: "border-pink-500/20 text-pink-400 bg-pink-500/5 hover:border-pink-500/40 hover:bg-pink-500/10",
    icon: Settings,
    types: ['BatchNorm2d', 'LayerNorm', 'GroupNorm']
  },
  {
    name: "Activations",
    colorClass: "border-emerald-500/20 text-emerald-400 bg-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-500/10",
    icon: Cpu,
    types: ['ReLU', 'GELU', 'Sigmoid', 'Tanh', 'Softmax']
  },
  {
    name: "Shape & Reg",
    colorClass: "border-blue-500/20 text-blue-400 bg-blue-500/5 hover:border-blue-500/40 hover:bg-blue-500/10",
    icon: Maximize,
    types: ['Flatten', 'Reshape', 'Permute', 'Dropout', 'Dropout2d']
  },
  {
    name: "Ops",
    colorClass: "border-orange-500/20 text-orange-400 bg-orange-500/5 hover:border-orange-500/40 hover:bg-orange-500/10",
    icon: Cpu,
    types: ['Add', 'Concat', 'Multiply']
  },
  {
    name: "Blocks",
    colorClass: "border-indigo-500/30 text-indigo-400 bg-indigo-500/5 hover:border-indigo-500/50 hover:bg-indigo-500/10",
    icon: Layers,
    types: ['ResidualBlock', 'TransformerEncoder', 'MultiHeadAttention', 'ConvBNReLU', 'BottleneckBlock', 'BatchNorm2dManualBlock', 'AttentionManualBlock', 'RNNManualBlock', 'CustomAutogradManualBlock']
  }
];

export function LayerPalette() {
  const addNode = useWeaveStore((state) => state.addNode);
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
    <div className="w-56 border-r border-white/5 bg-[#0a0a0f]/40 backdrop-blur-md flex flex-col h-full select-none shrink-0 relative z-30 font-sans">
      
      {/* Search Header */}
      <div className="p-4 border-b border-white/5 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-[#64748b] font-black uppercase tracking-widest">Library</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[8px] font-bold text-[#475569] bg-white/5 border border-white/10 rounded-md">
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
            className="w-full bg-background border border-white/5 pl-8 pr-3 h-8.5 rounded-lg text-xs text-white focus:outline-none focus:border-primary transition-all placeholder-[#475569]"
          />
        </div>
      </div>

      {/* Layer List Scroll Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
        {filteredMatches !== null ? (
          /* Search results view */
          <div className="space-y-1">
            <div className="text-[8px] text-muted-foreground uppercase font-black tracking-widest px-2.5 py-1">
              Search Results
            </div>
            {filteredMatches.length === 0 ? (
              <div className="text-[10px] text-muted-foreground/60 italic text-center py-4">
                No matching layers found
              </div>
            ) : (
              filteredMatches.map(({ type, category }) => (
                <div
                  key={type}
                  onDragStart={(e) => handleDragStart(e, type)}
                  onClick={() => handleLayerClick(type)}
                  draggable
                  className={`px-2.5 py-1.5 border rounded-lg text-[9px] font-bold tracking-wide uppercase cursor-grab active:cursor-grabbing transition-all flex items-center gap-2 select-none hover:brightness-110 ${category.colorClass}`}
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
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] font-black uppercase text-left text-[#94a3b8] hover:bg-white/5 hover:text-white transition-all cursor-pointer"
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
                        className={`px-2.5 py-1.5 border rounded-lg text-[9px] font-bold tracking-wide uppercase cursor-grab active:cursor-grabbing transition-all flex items-center gap-2 select-none hover:brightness-110 ${cat.colorClass}`}
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
