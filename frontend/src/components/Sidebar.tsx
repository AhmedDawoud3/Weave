import { useState, DragEvent } from 'react';
import { LayoutDashboard, Cpu, Layers, Maximize, GitCommit, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { LayerType } from '../types';

interface SidebarProps {
  onNavigateDashboard: () => void;
}

interface LayerCategory {
  name: string;
  icon: any;
  types: LayerType[];
}

const CATEGORIES: LayerCategory[] = [
  {
    name: "Convolution & Pooling",
    icon: Layers,
    types: ['Conv2d', 'ConvTranspose2d', 'MaxPool2d', 'AvgPool2d', 'AdaptiveAvgPool2d']
  },
  {
    name: "Linear & Embedding",
    icon: GitCommit,
    types: ['Linear', 'Embedding']
  },
  {
    name: "Normalization",
    icon: Settings,
    types: ['BatchNorm2d', 'LayerNorm', 'GroupNorm']
  },
  {
    name: "Activations",
    icon: Cpu,
    types: ['ReLU', 'GELU', 'Sigmoid', 'Tanh', 'Softmax']
  },
  {
    name: "Shape & Regularization",
    icon: Maximize,
    types: ['Flatten', 'Reshape', 'Permute', 'Dropout', 'Dropout2d']
  },
  {
    name: "Multi-Input Operations",
    icon: Cpu,
    types: ['Add', 'Concat', 'Multiply']
  },
  {
    name: "Block Templates",
    icon: Layers,
    types: ['ResidualBlock', 'TransformerEncoder', 'MultiHeadAttention', 'ConvBNReLU', 'BottleneckBlock']
  }
];

export function Sidebar({ onNavigateDashboard }: SidebarProps) {
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    "Convolution & Pooling": true,
    "Linear & Embedding": true,
  });

  const toggleCategory = (name: string) => {
    setExpandedCats(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, type: LayerType) => {
    e.dataTransfer.setData('application/reactflow', type);
  };

  return (
    <div className="w-80 border-r border-primary/10 bg-card/25 backdrop-blur-md p-6 flex flex-col h-full overflow-y-auto select-none">
      <div className="flex items-center justify-between mb-6">
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
          className="hover:bg-primary/15 text-muted-foreground hover:text-[#40d3b6] rounded-xl transition-all"
        >
          <LayoutDashboard size={18} />
        </Button>
      </div>

      <Separator className="bg-primary/10 mb-6" />

      <div className="flex-1 space-y-4">
        <label className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest block mb-4">
          Layer Palette
        </label>
        
        <div className="space-y-3">
          {CATEGORIES.map(cat => {
            const isExpanded = expandedCats[cat.name];
            const CatIcon = cat.icon;

            return (
              <div key={cat.name} className="space-y-1">
                <button
                  onClick={() => toggleCategory(cat.name)}
                  className="w-full flex items-center justify-between py-2 text-xs font-bold text-white/80 hover:text-white transition-all text-left uppercase tracking-wider"
                >
                  <div className="flex items-center gap-2">
                    <CatIcon size={14} className="text-primary/60" />
                    <span>{cat.name}</span>
                  </div>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {isExpanded && (
                  <div className="grid grid-cols-1 gap-2 pt-1 pl-2">
                    {cat.types.map(type => (
                      <div
                        key={type}
                        onDragStart={(e) => handleDragStart(e, type)}
                        draggable
                        className="p-3 bg-primary/5 hover:bg-primary/10 border border-primary/5 hover:border-primary/30 rounded-xl cursor-grab active:cursor-grabbing transition-all text-[11px] font-extrabold tracking-wide uppercase flex items-center text-foreground/90 group"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/50 group-hover:bg-primary mr-3 transition-colors shrink-0" />
                        {type}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
