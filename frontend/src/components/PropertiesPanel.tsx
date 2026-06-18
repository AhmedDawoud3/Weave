import { MousePointer2, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Node } from 'reactflow';
import type { NodeData, LayerParams } from '../types';

interface PropertiesPanelProps {
  selectedNode: Node<NodeData> | undefined;
  selectedNodeId: string | null;
  onUpdateNodeParams: (nodeId: string, params: Record<string, any>) => void;
  onRemoveNode: (nodeId: string) => void;
}

export function PropertiesPanel({ selectedNode, selectedNodeId, onUpdateNodeParams, onRemoveNode }: PropertiesPanelProps) {
  if (!selectedNode || !selectedNodeId) {
    return (
      <div className="w-80 border-l border-primary/10 bg-card/25 backdrop-blur-md p-8 flex flex-col items-center justify-center select-none text-muted-foreground/30">
        <MousePointer2 size={36} className="mb-4 text-primary/10 animate-pulse" />
        <p className="text-[10px] uppercase font-black tracking-widest text-center">Select a layer to configure properties</p>
      </div>
    );
  }

  const { type, params, label } = selectedNode.data;

  const handleParamChange = (key: keyof LayerParams | string, value: any) => {
    onUpdateNodeParams(selectedNodeId, { [key]: value });
  };

  const renderFields = () => {
    switch (type) {
      case 'Conv2d':
      case 'ConvTranspose2d':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Input Channels</Label>
              <Input
                type="number"
                value={params.in_channels || 3}
                onChange={(e) => handleParamChange('in_channels', Number(e.target.value))}
                className="bg-background/40 border-primary/10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Output Channels</Label>
              <Input
                type="number"
                value={params.out_channels || 16}
                onChange={(e) => handleParamChange('out_channels', Number(e.target.value))}
                className="bg-background/40 border-primary/10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Kernel Size</Label>
              <Input
                type="number"
                value={params.kernel_size || 3}
                onChange={(e) => handleParamChange('kernel_size', Number(e.target.value))}
                className="bg-background/40 border-primary/10 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Stride</Label>
                <Input
                  type="number"
                  value={params.stride || 1}
                  onChange={(e) => handleParamChange('stride', Number(e.target.value))}
                  className="bg-background/40 border-primary/10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Padding</Label>
                <Input
                  type="number"
                  value={params.padding || 0}
                  onChange={(e) => handleParamChange('padding', Number(e.target.value))}
                  className="bg-background/40 border-primary/10 rounded-xl"
                />
              </div>
            </div>
            {type === 'ConvTranspose2d' && (
              <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Output Padding</Label>
                <Input
                  type="number"
                  value={(params as any).output_padding || 0}
                  onChange={(e) => handleParamChange('output_padding', Number(e.target.value))}
                  className="bg-background/40 border-primary/10 rounded-xl"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Bias</Label>
              <Select
                value={params.bias !== false ? 'true' : 'false'}
                onValueChange={(v) => handleParamChange('bias', v === 'true')}
              >
                <SelectTrigger className="bg-background/40 border-primary/10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0e0e11] border-primary/10 text-white">
                  <SelectItem value="true">True (Add offsets)</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'Linear':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">In Features</Label>
              <Input
                type="number"
                value={(params as any).in_features || 128}
                onChange={(e) => handleParamChange('in_features', Number(e.target.value))}
                className="bg-background/40 border-primary/10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Out Features</Label>
              <Input
                type="number"
                value={(params as any).out_features || 10}
                onChange={(e) => handleParamChange('out_features', Number(e.target.value))}
                className="bg-background/40 border-primary/10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Bias</Label>
              <Select
                value={params.bias !== false ? 'true' : 'false'}
                onValueChange={(v) => handleParamChange('bias', v === 'true')}
              >
                <SelectTrigger className="bg-background/40 border-primary/10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0e0e11] border-primary/10 text-white">
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case 'MaxPool2d':
      case 'AvgPool2d':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Kernel Size</Label>
              <Input
                type="number"
                value={params.kernel_size || 2}
                onChange={(e) => handleParamChange('kernel_size', Number(e.target.value))}
                className="bg-background/40 border-primary/10 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Stride</Label>
                <Input
                  type="number"
                  value={params.stride || 2}
                  onChange={(e) => handleParamChange('stride', Number(e.target.value))}
                  className="bg-background/40 border-primary/10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Padding</Label>
                <Input
                  type="number"
                  value={params.padding || 0}
                  onChange={(e) => handleParamChange('padding', Number(e.target.value))}
                  className="bg-background/40 border-primary/10 rounded-xl"
                />
              </div>
            </div>
          </>
        );

      case 'AdaptiveAvgPool2d':
        return (
          <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Output Size (target spatial shape)</Label>
            <Input
              type="text"
              value={Array.isArray((params as any).output_size) ? JSON.stringify((params as any).output_size) : ((params as any).output_size || 1)}
              onChange={(e) => {
                const val = e.target.value;
                if (val.includes(',')) {
                  try {
                    const parsed = JSON.parse(val);
                    handleParamChange('output_size', parsed);
                  } catch {
                    const parts = val.replace(/[\[\]\s]/g, '').split(',').map(Number);
                    handleParamChange('output_size', parts);
                  }
                } else {
                  handleParamChange('output_size', Number(val));
                }
              }}
              className="bg-background/40 border-primary/10 rounded-xl"
              placeholder="e.g. 1 or [7, 7]"
            />
          </div>
        );

      case 'Dropout':
      case 'Dropout2d':
        return (
          <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Dropout Rate (p)</Label>
            <Input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={(params as any).p !== undefined ? (params as any).p : 0.5}
              onChange={(e) => handleParamChange('p', Number(e.target.value))}
              className="bg-background/40 border-primary/10 rounded-xl"
            />
          </div>
        );

      case 'BatchNorm2d':
        return (
          <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Num Features (Channels)</Label>
            <Input
              type="number"
              value={(params as any).num_features || 16}
              onChange={(e) => handleParamChange('num_features', Number(e.target.value))}
              className="bg-background/40 border-primary/10 rounded-xl"
            />
          </div>
        );

      case 'LayerNorm':
        return (
          <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Normalized Shape</Label>
            <Input
              type="text"
              value={Array.isArray((params as any).normalized_shape) ? JSON.stringify((params as any).normalized_shape) : ((params as any).normalized_shape || '')}
              onChange={(e) => {
                const val = e.target.value;
                try {
                  const parsed = JSON.parse(val);
                  handleParamChange('normalized_shape', parsed);
                } catch {
                  if (val.includes(',')) {
                    const parts = val.replace(/[\[\]\s]/g, '').split(',').map(Number);
                    handleParamChange('normalized_shape', parts);
                  } else if (!isNaN(Number(val)) && val.trim() !== '') {
                    handleParamChange('normalized_shape', Number(val));
                  } else {
                    handleParamChange('normalized_shape', val);
                  }
                }
              }}
              className="bg-background/40 border-primary/10 rounded-xl"
              placeholder="e.g. 64 or [64, 14, 14]"
            />
          </div>
        );

      case 'GroupNorm':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Num Groups</Label>
              <Input
                type="number"
                value={(params as any).num_groups || 2}
                onChange={(e) => handleParamChange('num_groups', Number(e.target.value))}
                className="bg-background/40 border-primary/10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Num Channels</Label>
              <Input
                type="number"
                value={(params as any).num_channels || 16}
                onChange={(e) => handleParamChange('num_channels', Number(e.target.value))}
                className="bg-background/40 border-primary/10 rounded-xl"
              />
            </div>
          </>
        );

      case 'Embedding':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Num Embeddings (Vocab Size)</Label>
              <Input
                type="number"
                value={(params as any).num_embeddings || 1000}
                onChange={(e) => handleParamChange('num_embeddings', Number(e.target.value))}
                className="bg-background/40 border-primary/10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Embedding Dim</Label>
              <Input
                type="number"
                value={(params as any).embedding_dim || 64}
                onChange={(e) => handleParamChange('embedding_dim', Number(e.target.value))}
                className="bg-background/40 border-primary/10 rounded-xl"
              />
            </div>
          </>
        );

      case 'Concat':
        return (
          <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Dimension (dim)</Label>
            <Input
              type="number"
              value={params.dim !== undefined ? params.dim : 1}
              onChange={(e) => handleParamChange('dim', Number(e.target.value))}
              className="bg-background/40 border-primary/10 rounded-xl"
            />
          </div>
        );

      case 'Softmax':
        return (
          <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Dimension (dim)</Label>
            <Input
              type="number"
              value={params.dim !== undefined ? params.dim : -1}
              onChange={(e) => handleParamChange('dim', Number(e.target.value))}
              className="bg-background/40 border-primary/10 rounded-xl"
            />
          </div>
        );

      case 'Flatten':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Start Dimension</Label>
              <Input
                type="number"
                value={(params as any).start_dim !== undefined ? (params as any).start_dim : 1}
                onChange={(e) => handleParamChange('start_dim', Number(e.target.value))}
                className="bg-background/40 border-primary/10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">End Dimension</Label>
              <Input
                type="number"
                value={(params as any).end_dim !== undefined ? (params as any).end_dim : -1}
                onChange={(e) => handleParamChange('end_dim', Number(e.target.value))}
                className="bg-background/40 border-primary/10 rounded-xl"
              />
            </div>
          </>
        );

      case 'Reshape':
        return (
          <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Target Shape (comma-separated)</Label>
            <Input
              type="text"
              value={Array.isArray((params as any).shape) ? (params as any).shape.join(', ') : ''}
              onChange={(e) => {
                const parts = e.target.value.split(',').map(v => v.trim()).filter(Boolean).map(Number);
                handleParamChange('shape', parts);
              }}
              className="bg-background/40 border-primary/10 rounded-xl"
              placeholder="e.g. -1, 64"
            />
          </div>
        );

      case 'Permute':
        return (
          <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Dims Ordering (comma-separated)</Label>
            <Input
              type="text"
              value={Array.isArray((params as any).dims) ? (params as any).dims.join(', ') : ''}
              onChange={(e) => {
                const parts = e.target.value.split(',').map(v => v.trim()).filter(Boolean).map(Number);
                handleParamChange('dims', parts);
              }}
              className="bg-background/40 border-primary/10 rounded-xl"
              placeholder="e.g. 0, 2, 3, 1"
            />
          </div>
        );

      default:
        return (
          <p className="text-[10px] text-muted-foreground uppercase italic tracking-wide">
            This layer ({type}) operates dynamically without static parameters.
          </p>
        );
    }
  };

  return (
    <div className="w-80 border-l border-primary/10 bg-card/25 backdrop-blur-md p-6 flex flex-col h-full overflow-y-auto select-none">
      <div className="flex flex-col gap-1 mb-8">
        <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Configuration</h2>
        <h3 className="text-lg font-black uppercase text-white truncate">{type} Settings</h3>
      </div>

      <div className="flex-1 space-y-6">
        {/* Layer Custom Label */}
        <div className="space-y-2">
          <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Custom Label</Label>
          <Input
            type="text"
            value={label || ''}
            onChange={(e) => handleParamChange('label', e.target.value)}
            className="bg-background/40 border-primary/10 rounded-xl"
          />
        </div>

        <Separator className="bg-primary/10" />

        {/* Dynamic Inputs */}
        <div className="space-y-5">
          {renderFields()}
        </div>
      </div>

      <div className="pt-6 border-t border-primary/10 mt-6">
        <Button
          variant="ghost"
          onClick={() => onRemoveNode(selectedNodeId)}
          className="w-full bg-red-500/5 hover:bg-red-500 hover:text-white border border-red-500/10 text-red-500 text-xs font-extrabold h-11 rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          <Trash2 size={14} /> REMOVE LAYER
        </Button>
      </div>
    </div>
  );
}
