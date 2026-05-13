import { create } from 'zustand';
import type { CustomNodeData, SubGraphNode, SubGraphEdge } from '../components/nodes/CustomNode';

interface ModuleEditorState {
  isOpen: boolean;
  editingNodeId: string | null;
  editingNodeData: CustomNodeData | null;
  subNodes: SubGraphNode[];
  subEdges: SubGraphEdge[];
}

interface ModuleEditorActions {
  openEditor: (nodeId: string, nodeData: CustomNodeData) => void;
  closeEditor: () => void;
  setSubNodes: (nodes: SubGraphNode[]) => void;
  setSubEdges: (edges: SubGraphEdge[]) => void;
  updateSubGraph: (nodes: SubGraphNode[], edges: SubGraphEdge[]) => void;
  getSubGraph: () => { nodes: SubGraphNode[]; edges: SubGraphEdge[] };
}

type ModuleStore = ModuleEditorState & ModuleEditorActions;

// Default Input/Output nodes for new modules
const createDefaultSubNodes = (): SubGraphNode[] => [
  {
    id: 'input_0',
    type: 'moduleInput',
    position: { x: 100, y: 200 },
    data: { label: 'Input', portIndex: 0 },
  },
  {
    id: 'output_0',
    type: 'moduleOutput',
    position: { x: 500, y: 200 },
    data: { label: 'Output', portIndex: 0 },
  },
];

export const useModuleStore = create<ModuleStore>((set, get) => ({
  // State
  isOpen: false,
  editingNodeId: null,
  editingNodeData: null,
  subNodes: [],
  subEdges: [],

  // Actions
  openEditor: (nodeId, nodeData) => {
    const hasExistingSubGraph = nodeData.subNodes && nodeData.subNodes.length > 0;
    set({
      isOpen: true,
      editingNodeId: nodeId,
      editingNodeData: nodeData,
      subNodes: hasExistingSubGraph ? nodeData.subNodes : createDefaultSubNodes(),
      subEdges: hasExistingSubGraph ? nodeData.subEdges : [],
    });
  },

  closeEditor: () => {
    set({
      isOpen: false,
      editingNodeId: null,
      editingNodeData: null,
      subNodes: [],
      subEdges: [],
    });
  },

  setSubNodes: (nodes) => {
    set({ subNodes: nodes });
  },

  setSubEdges: (edges) => {
    set({ subEdges: edges });
  },

  updateSubGraph: (nodes, edges) => {
    set({ subNodes: nodes, subEdges: edges });
  },

  getSubGraph: () => {
    const state = get();
    return { nodes: state.subNodes, edges: state.subEdges };
  },
}));

// Helper to count inputs/outputs from sub-graph
export const countModuleIO = (nodes: SubGraphNode[]) => {
  let inputCount = 0;
  let outputCount = 0;
  
  for (const node of nodes) {
    if (node.type === 'moduleInput') {
      inputCount++;
    } else if (node.type === 'moduleOutput') {
      outputCount++;
    }
  }
  
  return { inputCount: Math.max(1, inputCount), outputCount: Math.max(1, outputCount) };
};
