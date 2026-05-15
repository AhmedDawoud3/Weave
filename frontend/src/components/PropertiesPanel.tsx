import { MousePointer2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Node } from 'reactflow';
import type { NodeData } from '../types';

interface PropertiesPanelProps {
  selectedNode: Node<NodeData> | undefined;
  selectedNodeId: string | null;
  onUpdateNodeParams: (nodeId: string, params: Record<string, unknown>) => void;
  onRemoveNode: (nodeId: string) => void;
}

export function PropertiesPanel({ selectedNode, selectedNodeId, onUpdateNodeParams, onRemoveNode }: PropertiesPanelProps) {
  return (
    <div className="w-80 border-l border-white/5 bg-card/20 p-8">
      <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-10">Configuration</h2>
      {selectedNode ? (
        <div className="space-y-8">
          <div>
            <Label className="text-[10px] text-white/50 uppercase font-bold">Units / Filters</Label>
            <input
              type="number"
              value={selectedNode.data.params.units ?? 0}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (selectedNodeId) {
                  onUpdateNodeParams(selectedNodeId, { units: val });
                }
              }}
              className="w-full bg-white/5 border border-white/10 p-3 mt-2 text-sm outline-none focus:border-[#40d3b6]"
            />
          </div>
          <div>
            <Label className="text-[10px] text-white/50 uppercase font-bold">Activation</Label>
            <Select
              value={selectedNode.data.params.activation ?? 'relu'}
              onValueChange={(v) => {
                if (selectedNodeId) {
                  onUpdateNodeParams(selectedNodeId, { activation: v });
                }
              }}
            >
              <SelectTrigger className="bg-white/5 border-white/10 h-12 mt-2 rounded-none"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#111] border-white/10 text-white">
                <SelectItem value="relu">ReLU</SelectItem>
                <SelectItem value="sigmoid">Sigmoid</SelectItem>
                <SelectItem value="tanh">Tanh</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            className="w-full text-red-500 hover:bg-red-500/10 text-[10px] font-bold rounded-none"
            onClick={() => {
              if (selectedNodeId) {
                onRemoveNode(selectedNodeId);
              }
            }}
          >
            REMOVE LAYER
          </Button>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center opacity-10">
          <MousePointer2 size={40} /><p className="text-[9px] uppercase font-bold mt-4 tracking-widest">Select Layer</p>
        </div>
      )}
    </div>
  );
}
