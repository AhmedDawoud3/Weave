import { Handle, Position, type NodeProps } from 'reactflow';
import { Card } from "@/components/ui/card";
import { AlertTriangle } from 'lucide-react';
import type { NodeData } from '../types';

export function LayerNode({ data, selected }: NodeProps<NodeData> & { selected?: boolean }) {
  const isError = !!data.error;
  const shape = data.outputShape;

  // Render quick summary parameters depending on type
  const renderParamSummary = () => {
    const p = data.params;
    switch (data.type) {
      case 'Conv2d':
      case 'ConvTranspose2d':
        return (
          <>
            <div className="flex justify-between">
              <span>Ch (In/Out):</span>
              <span className="text-primary font-bold">{p.in_channels || 0} → {p.out_channels || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Kernel/Stride:</span>
              <span className="text-primary font-bold">{p.kernel_size || 0} / {p.stride || 1}</span>
            </div>
          </>
        );
      case 'Linear':
        return (
          <>
            <div className="flex justify-between">
              <span>In/Out Features:</span>
              <span className="text-primary font-bold">{p.in_features || 0} → {p.out_features || 0}</span>
            </div>
          </>
        );
      case 'Dropout':
      case 'Dropout2d':
        return (
          <>
            <div className="flex justify-between">
              <span>Drop Rate:</span>
              <span className="text-primary font-bold">{p.p !== undefined ? p.p : 0.5}</span>
            </div>
          </>
        );
      case 'BatchNorm2d':
        return (
          <>
            <div className="flex justify-between">
              <span>Features:</span>
              <span className="text-primary font-bold">{p.num_features || 0}</span>
            </div>
          </>
        );
      case 'MaxPool2d':
      case 'AvgPool2d':
        return (
          <>
            <div className="flex justify-between">
              <span>Kernel/Stride:</span>
              <span className="text-primary font-bold">{p.kernel_size || 0} / {p.stride || 1}</span>
            </div>
          </>
        );
      case 'Softmax':
      case 'Concat':
        return (
          <>
            <div className="flex justify-between">
              <span>Dimension:</span>
              <span className="text-primary font-bold">{p.dim !== undefined ? p.dim : -1}</span>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative group">
      {/* Target handle on top */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-2.5 h-2.5 !bg-primary border-2 border-[#0a0a0c] !z-50 rounded-full"
      />

      <Card className={`p-4 min-w-[170px] bg-card/65 backdrop-blur-xl border transition-all duration-300 shadow-xl rounded-xl relative z-10 ${
        isError 
          ? 'border-red-500/40 hover:border-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.05)]' 
          : selected 
            ? 'border-primary shadow-[0_0_20px_rgba(64,211,182,0.1)]' 
            : 'border-primary/20 hover:border-primary/50'
      }`}>
        {/* Layer Type */}
        <div className="text-[9px] font-extrabold text-primary/70 mb-1 tracking-widest text-center uppercase">
          {data.type}
        </div>

        {/* Node Custom Name */}
        <div className="text-xs font-bold text-center text-foreground uppercase line-clamp-1 mb-2">
          {data.label}
        </div>
        
        {/* parameter quick summary */}
        <div className="space-y-1 text-[9px] text-muted-foreground border-t border-primary/5 pt-2">
          {renderParamSummary()}
        </div>

        {/* Output Tensor Dimensions */}
        {shape && (
          <div className="mt-2 text-[9px] text-[#40d3b6] bg-primary/5 border border-primary/10 rounded-md p-1.5 text-center font-bold tracking-tight">
            Shape: [{shape.join(', ')}]
          </div>
        )}

        {/* Compile Error Message */}
        {isError && (
          <div className="mt-2 text-[8px] text-red-400 bg-red-500/5 border border-red-500/10 rounded-md p-1.5 flex items-start gap-1">
            <AlertTriangle className="shrink-0 mt-0.5" size={10} />
            <span className="line-clamp-2">{data.error}</span>
          </div>
        )}
      </Card>

      {/* Source handle on bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2.5 h-2.5 !bg-primary border-2 border-[#0a0a0c] !z-50 rounded-full"
      />
    </div>
  );
}