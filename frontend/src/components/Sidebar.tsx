import { DragEvent } from 'react';
import { LayoutDashboard, Box } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import type { LayerType } from '../types';

interface SidebarProps {
  onNavigateDashboard: () => void;
}

const LAYER_TYPES: LayerType[] = ['CONV2D', 'LINEAR', 'DROPOUT'];

export function Sidebar({ onNavigateDashboard }: SidebarProps) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>, type: LayerType) => {
    e.dataTransfer.setData('application/reactflow', type);
  };

  return (
    <div className="w-80 border-r border-white/5 bg-card/20 p-6 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#40d3b6] cursor-pointer" onClick={onNavigateDashboard}>WEAVE</h1>
        <Button variant="ghost" size="icon" onClick={onNavigateDashboard} className="hover:bg-[#40d3b6]/10 text-muted-foreground hover:text-[#40d3b6]">
          <LayoutDashboard size={20} />
        </Button>
      </div>
      <Separator className="bg-white/5" />
      <div className="space-y-4">
        <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Components</Label>
        {LAYER_TYPES.map(l => (
          <div
            key={l}
            onDragStart={(e) => handleDragStart(e, l)}
            draggable
            className="p-4 bg-white/5 border border-white/5 cursor-grab active:cursor-grabbing hover:border-[#40d3b6]/30 transition-all text-xs font-bold tracking-widest uppercase flex items-center"
          >
            <Box size={14} className="mr-2 text-[#40d3b6]/50" /> {l}
          </div>
        ))}
      </div>
    </div>
  );
}
