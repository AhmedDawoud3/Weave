import { LayoutDashboard } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DatasetPanel } from './DatasetPanel';

interface SidebarProps {
  onNavigateDashboard: () => void;
}

export function Sidebar({ onNavigateDashboard }: SidebarProps) {
  return (
    <div className="w-80 border-r border-primary/10 bg-card/25 backdrop-blur-md flex flex-col h-full overflow-hidden select-none">
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

      <div className="flex-1 min-h-0 overflow-hidden">
        <DatasetPanel />
      </div>
    </div>
  );
}
