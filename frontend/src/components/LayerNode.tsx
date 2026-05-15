import { Handle, Position, type NodeProps } from 'reactflow';
import { Card } from "@/components/ui/card";
import type { NodeData } from '../types';

export function LayerNode({ data }: NodeProps<NodeData>) {
  return (
    <div className="relative group">
      {/* 1. نقطة الاستقبال (بالأعلى) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-primary border-2 border-background !z-50"
      />

      <Card className="p-4 min-w-[150px] bg-card/80 backdrop-blur-md border-primary/20 hover:border-primary/50 transition-all shadow-lg">
        <div className="text-[10px] font-bold text-primary mb-1 tracking-widest text-center uppercase">
          {data.type}
        </div>
        <div className="text-sm font-bold text-center text-foreground">
          {data.label}
        </div>
        
        <div className="mt-2 space-y-1 text-[9px] text-muted-foreground border-t border-primary/10 pt-2">
          <div className="flex justify-between">
            <span>Units:</span>
            <span className="text-primary">{data.params?.units || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Act:</span>
            <span className="text-primary">{data.params?.activation || 'none'}</span>
          </div>
        </div>
      </Card>

      {/* 2. نقطة الإرسال (بالأسفل) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-primary border-2 border-background !z-50"
      />
    </div>
  );
}