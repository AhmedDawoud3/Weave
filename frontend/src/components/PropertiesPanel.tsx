import { MousePointer2, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Node } from 'reactflow';
import type { NodeData, LayerParams } from '../types';
import { useWeaveStore, getInducedParam } from '../store/useWeaveStore';

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

  const edges = useWeaveStore((state) => state.edges);
  const allNodes = useWeaveStore((state) => state.nodes);

  const getInducedValue = (paramKey: string): number | null => {
    const incomingEdges = edges.filter(e => e.target === selectedNodeId);
    if (incomingEdges.length !== 1) return null;
    const incomingNode = allNodes.find(n => n.id === incomingEdges[0].source);
    const incomingShape = incomingNode?.data?.outputShape;
    const induced = getInducedParam(type, incomingShape);
    if (induced && induced.key === paramKey) {
      return induced.value;
    }
    return null;
  };

  const renderFieldWithInduction = (labelStr: string, key: string, defaultValue: number) => {
    const inducedVal = getInducedValue(key);
    const isInduced = inducedVal !== null;
    const value = isInduced ? inducedVal : (params as any)[key] ?? defaultValue;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">{labelStr}</Label>
          {isInduced && (
            <span className="text-[7.5px] font-extrabold uppercase tracking-wider text-[#40d3b6] bg-[#40d3b6]/10 px-1.5 py-0.5 rounded border border-[#40d3b6]/20">
              🔒 Induced
            </span>
          )}
        </div>
        <Input
          type="number"
          value={value}
          disabled={isInduced}
          onChange={(e) => handleParamChange(key, Number(e.target.value))}
          className={`bg-background/40 border-primary/10 rounded-xl transition-all ${
            isInduced ? 'opacity-65 cursor-not-allowed border-[#40d3b6]/30 text-[#40d3b6] font-extrabold font-mono' : ''
          }`}
        />
      </div>
    );
  };

  const handleParamChange = (key: keyof LayerParams | string, value: any) => {
    onUpdateNodeParams(selectedNodeId, { [key]: value });
  };

  const renderFields = () => {
    switch (type) {
      case 'Conv2d':
      case 'ConvTranspose2d':
        return (
          <>
            {renderFieldWithInduction('Input Channels', 'in_channels', 3)}
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
            {renderFieldWithInduction('In Features', 'in_features', 128)}
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
        return renderFieldWithInduction('Num Features (Channels)', 'num_features', 16);

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
            {renderFieldWithInduction('Num Channels', 'num_channels', 16)}
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
              value={typeof params.dim === 'number' ? params.dim : (Array.isArray(params.dim) ? params.dim[0] : 1)}
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
              value={typeof params.dim === 'number' ? params.dim : (Array.isArray(params.dim) ? params.dim[0] : -1)}
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
              value={Array.isArray((params as any).target_shape) ? (params as any).target_shape.join(', ') : ''}
              onChange={(e) => {
                const parts = e.target.value.split(',').map(v => v.trim()).filter(Boolean).map(Number);
                handleParamChange('target_shape', parts);
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

      case 'Mean':
      case 'Var':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Dimension (dim, comma-separated)</Label>
              <Input
                type="text"
                value={Array.isArray((params as any).dim) ? (params as any).dim.join(', ') : ''}
                onChange={(e) => {
                  const parts = e.target.value.split(',').map(v => v.trim()).filter(Boolean).map(Number);
                  handleParamChange('dim', parts);
                }}
                className="bg-background/40 border-primary/10 rounded-xl"
                placeholder="e.g. 0, 2, 3"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Keepdim</Label>
              <Select
                value={params.keepdim !== false ? 'true' : 'false'}
                onValueChange={(v) => handleParamChange('keepdim', v === 'true')}
              >
                <SelectTrigger className="bg-background/40 border-primary/10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0e0e11] border-primary/10 text-white">
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === 'Var' && (
              <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Unbiased</Label>
                <Select
                  value={params.unbiased === true ? 'true' : 'false'}
                  onValueChange={(v) => handleParamChange('unbiased', v === 'true')}
                >
                  <SelectTrigger className="bg-background/40 border-primary/10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e11] border-primary/10 text-white">
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        );

      case 'Sqrt':
        return (
          <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Epsilon (eps)</Label>
            <Input
              type="number"
              step="1e-6"
              value={(params as any).eps !== undefined ? (params as any).eps : 0.0}
              onChange={(e) => handleParamChange('eps', Number(e.target.value))}
              className="bg-background/40 border-primary/10 rounded-xl"
            />
          </div>
        );

      case 'Scale':
        return (
          <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Scale Value</Label>
            <Input
              type="number"
              step="any"
              value={(params as any).value !== undefined ? (params as any).value : 1.0}
              onChange={(e) => handleParamChange('value', Number(e.target.value))}
              className="bg-background/40 border-primary/10 rounded-xl"
            />
          </div>
        );

      case 'ChannelScaleBias':
        return renderFieldWithInduction('Num Features', 'num_features', 3);

      case 'Slice':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Dimension (dim)</Label>
              <Input
                type="number"
                value={(params as any).dim !== undefined ? (params as any).dim : 1}
                onChange={(e) => handleParamChange('dim', Number(e.target.value))}
                className="bg-background/40 border-primary/10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Index</Label>
              <Input
                type="number"
                value={(params as any).index !== undefined ? (params as any).index : 0}
                onChange={(e) => handleParamChange('index', Number(e.target.value))}
                className="bg-background/40 border-primary/10 rounded-xl"
              />
            </div>
          </>
        );

      case 'CustomAutograd':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Forward Code (Python)</Label>
              <textarea
                value={(params as any).forward_code || ''}
                onChange={(e) => handleParamChange('forward_code', e.target.value)}
                className="w-full h-24 bg-[#0c0c14]/50 border border-primary/10 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-primary/50 text-white"
                placeholder="def forward(x):..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Backward Code (Python)</Label>
              <textarea
                value={(params as any).backward_code || ''}
                onChange={(e) => handleParamChange('backward_code', e.target.value)}
                className="w-full h-24 bg-[#0c0c14]/50 border border-primary/10 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-primary/50 text-white"
                placeholder="def backward(x, grad_output):..."
              />
            </div>
          </>
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
