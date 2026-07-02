import { useState, useRef, useEffect, DragEvent } from 'react';
import { useWeaveStore } from '../store/useWeaveStore';
import { Plus, ChevronDown, ChevronRight, Layers, GitCommit, Settings, Cpu, Maximize } from 'lucide-react';
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
    colorClass: "border-amber-500/30 text-amber-400 bg-amber-500/5 hover:border-amber-400/40 hover:bg-amber-500/10 hover:shadow-[0_0_8px_rgba(245,158,11,0.15)]",
    icon: GitCommit,
    types: ['InputNode', 'OutputNode']
  },
  {
    name: "Conv & Pool",
    colorClass: "border-cyan-500/30 text-cyan-400 bg-cyan-500/5 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:shadow-[0_0_8px_rgba(6,182,212,0.15)]",
    icon: Layers,
    types: ['Conv2d', 'ConvTranspose2d', 'MaxPool2d', 'AvgPool2d', 'AdaptiveAvgPool2d']
  },
  {
    name: "Linear",
    colorClass: "border-purple-500/30 text-purple-400 bg-purple-500/5 hover:border-purple-400/40 hover:bg-purple-500/10 hover:shadow-[0_0_8px_rgba(168,85,247,0.15)]",
    icon: GitCommit,
    types: ['Linear', 'Embedding']
  },
  {
    name: "Normalization",
    colorClass: "border-pink-500/30 text-pink-400 bg-pink-500/5 hover:border-pink-400/40 hover:bg-pink-500/10 hover:shadow-[0_0_8px_rgba(236,72,153,0.15)]",
    icon: Settings,
    types: ['BatchNorm2d', 'LayerNorm', 'GroupNorm']
  },
  {
    name: "Activations",
    colorClass: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:shadow-[0_0_8px_rgba(16,185,129,0.15)]",
    icon: Cpu,
    types: ['ReLU', 'GELU', 'Sigmoid', 'Tanh', 'Softmax', 'CustomAutograd']
  },
  {
    name: "Shape & Reg",
    colorClass: "border-blue-500/30 text-blue-400 bg-blue-500/5 hover:border-blue-400/40 hover:bg-blue-500/10 hover:shadow-[0_0_8px_rgba(59,130,246,0.15)]",
    icon: Maximize,
    types: ['Flatten', 'Reshape', 'Permute', 'Dropout', 'Dropout2d', 'Slice']
  },
  {
    name: "Ops",
    colorClass: "border-orange-500/30 text-orange-400 bg-orange-500/5 hover:border-orange-400/40 hover:bg-orange-500/10 hover:shadow-[0_0_8px_rgba(249,115,22,0.15)]",
    icon: Cpu,
    types: ['Add', 'Concat', 'Multiply', 'Sub', 'Div', 'Sqrt', 'Mean', 'Var', 'MatMul', 'Scale', 'ChannelScaleBias']
  }
];

const BLOCKS_CATEGORY: LayerCategory = {
  name: "Blocks",
  colorClass: "border-indigo-500/40 text-indigo-400 bg-indigo-500/5 hover:border-indigo-400/50 hover:bg-indigo-500/10 hover:shadow-[0_0_10px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500/25",
  icon: Layers,
  types: ['ResidualBlock', 'TransformerEncoder', 'MultiHeadAttention', 'ConvBNReLU', 'BottleneckBlock', 'BatchNorm2dManualBlock', 'AttentionManualBlock', 'RNNManualBlock', 'CustomAutogradManualBlock']
};

export function LayerPalette() {
  const addNode = useWeaveStore((state) => state.addNode);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isBlocksOpen, setIsBlocksOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        setIsLayersOpen(false);
        setIsBlocksOpen(false);
        setHoveredCategory(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, type: LayerType) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleLayerClick = (type: LayerType) => {
    // Add to canvas at default center location
    addNode(type, { x: 350, y: 200 });
    setIsLayersOpen(false);
    setIsBlocksOpen(false);
    setHoveredCategory(null);
  };

  return (
    <div 
      ref={paletteRef}
      className="h-16 w-full border-b border-primary/10 bg-[#0a0a0f]/80 backdrop-blur-md flex items-center px-6 gap-3 select-none z-35 relative shrink-0"
    >
      <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mr-4 shrink-0">
        Palette
      </div>

      {/* Add Layer Menu */}
      <div className="relative">
        <button
          onClick={() => {
            setIsLayersOpen(!isLayersOpen);
            setIsBlocksOpen(false);
          }}
          className={`px-4 py-2 border rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center gap-2 cursor-pointer ${
            isLayersOpen 
              ? 'border-[#40d3b6] text-[#40d3b6] bg-[#40d3b6]/10 shadow-[0_0_10px_rgba(64,211,182,0.15)]' 
              : 'border-white/5 bg-white/5 hover:bg-white/10 text-white'
          }`}
        >
          <Plus size={14} className="text-[#40d3b6]" />
          <span>Add Layer</span>
          <ChevronDown size={12} className={`transition-transform duration-200 ${isLayersOpen ? 'rotate-180 text-[#40d3b6]' : 'opacity-50'}`} />
        </button>

        {isLayersOpen && (
          <div className="absolute top-12 left-0 w-56 bg-[#0c0c14]/95 border border-primary/20 backdrop-blur-xl rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 mt-1 select-none animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="text-[8px] text-muted-foreground/60 uppercase font-black tracking-widest px-2.5 py-1">
              Categories
            </div>

            {CATEGORIES.map((cat) => {
              const isHovered = hoveredCategory === cat.name;
              const Icon = cat.icon;
              return (
                <div
                  key={cat.name}
                  className="relative"
                  onMouseEnter={() => setHoveredCategory(cat.name)}
                  onMouseLeave={() => setHoveredCategory(null)}
                >
                  <button
                    className={`w-full px-2.5 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2.5 text-left cursor-pointer ${
                      isHovered 
                        ? 'bg-primary/15 text-[#40d3b6]' 
                        : 'text-foreground/85 hover:text-white'
                    }`}
                  >
                    <Icon size={12} className="opacity-75" />
                    <span className="flex-1">{cat.name}</span>
                    <ChevronRight size={10} className={`opacity-50 ${isHovered ? 'text-[#40d3b6]' : ''}`} />
                  </button>

                  {isHovered && (
                    <div className="absolute left-[214px] top-0 w-52 bg-[#0c0c14]/95 border border-primary/20 backdrop-blur-xl rounded-xl shadow-2xl p-1.5 z-55 flex flex-col gap-0.5 select-none animate-in fade-in slide-in-from-left-2 duration-150">
                      <div className="text-[8px] text-muted-foreground/60 uppercase font-black tracking-widest px-2.5 py-1">
                        Drag or Click
                      </div>
                      {cat.types.map((type) => (
                        <div
                          key={type}
                          onDragStart={(e) => handleDragStart(e, type)}
                          onClick={() => handleLayerClick(type)}
                          draggable
                          className={`px-2.5 py-1.5 border rounded-lg text-[10px] font-extrabold tracking-wide uppercase cursor-grab active:cursor-grabbing transition-all flex items-center gap-2 select-none hover:brightness-110 ${cat.colorClass}`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                          <span className="flex-1 text-left">{type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Block Menu */}
      <div className="relative">
        <button
          onClick={() => {
            setIsBlocksOpen(!isBlocksOpen);
            setIsLayersOpen(false);
          }}
          className={`px-4 py-2 border rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center gap-2 cursor-pointer ${
            isBlocksOpen 
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 shadow-[0_0_10px_rgba(99,102,241,0.15)]' 
              : 'border-white/5 bg-white/5 hover:bg-white/10 text-white'
          }`}
        >
          <Layers size={14} className="text-indigo-400" />
          <span>Add Block</span>
          <ChevronDown size={12} className={`transition-transform duration-200 ${isBlocksOpen ? 'rotate-180 text-indigo-400' : 'opacity-50'}`} />
        </button>

        {isBlocksOpen && (
          <div className="absolute top-12 left-0 w-56 bg-[#0c0c14]/95 border border-primary/20 backdrop-blur-xl rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5 mt-1 select-none animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="text-[8px] text-muted-foreground/60 uppercase font-black tracking-widest px-2.5 py-1">
              Drag or Click Block
            </div>
            {BLOCKS_CATEGORY.types.map((type) => (
              <div
                key={type}
                onDragStart={(e) => handleDragStart(e, type)}
                onClick={() => handleLayerClick(type)}
                draggable
                className={`px-2.5 py-1.5 border rounded-lg text-[10px] font-extrabold tracking-wide uppercase cursor-grab active:cursor-grabbing transition-all flex items-center gap-2 select-none hover:brightness-110 ${BLOCKS_CATEGORY.colorClass}`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                <span className="flex-1 text-left">{type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
