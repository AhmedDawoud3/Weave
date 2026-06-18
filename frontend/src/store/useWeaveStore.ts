import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { api } from '../services/api';
import { Project, SubGraph, NodeData, LayerType, LayerParams, DatasetConfig, TransformConfig, DataLoaderConfig } from '../types';

interface WeaveState {
  // Auth
  token: string | null;
  isAuthenticated: boolean;
  user: { email: string; name?: string } | null;
  authError: string | null;
  isAuthenticating: boolean;
  login: (dto: any) => Promise<boolean>;
  register: (dto: any) => Promise<boolean>;
  logout: () => void;
  isKernelConnected: boolean;
  checkKernelConnection: () => Promise<void>;

  // Projects
  projects: Project[];
  activeProject: Project | null;
  activeSubGraphs: SubGraph[];
  activeSubGraph: SubGraph | null;
  isLoadingProjects: boolean;
  fetchProjects: () => Promise<void>;
  selectProject: (project: Project) => Promise<void>;
  createProject: (name: string, description?: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // SubGraphs
  selectSubGraph: (subgraph: SubGraph) => void;
  createSubGraph: (name: string) => Promise<void>;
  navigationStack: SubGraph[];
  enterSubGraph: (subGraphId: string) => Promise<void>;
  exitSubGraph: (index: number) => void;

  // Canvas
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  isSavingGraph: boolean;
  validationStatus: 'idle' | 'success' | 'error';
  validationMessage: string | null;
  nodeShapes: Record<string, number[]>;
  setNodes: (nodes: Node<NodeData>[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  addNode: (type: LayerType, position: { x: number; y: number }) => void;
  removeNode: (id: string) => void;
  updateNodeParams: (id: string, params: Partial<LayerParams>) => void;
  updateNodeLabel: (id: string, label: string) => void;
  connectEdges: (connection: Connection) => void;
  removeEdge: (id: string) => void;
  addSubgraphInput: (nodeId: string) => Promise<void>;
  addSubgraphOutput: (nodeId: string) => Promise<void>;
  validatePipeline: (inputShape?: number[]) => Promise<void>;
  saveActiveSubGraph: () => Promise<void>;

  // Training Runner
  isTraining: boolean;
  trainingStatus: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'stopped';
  activeRunId: string | null;
  epochMetrics: any[];
  stepMetrics: any[];
  trainingLogs: string[];
  suggestedLoss: string | null;
  suggestedLossAlternatives: string[];
  lrPreview: number[];
  startTraining: (config: any) => Promise<void>;
  controlTraining: (action: 'pause' | 'resume' | 'stop') => Promise<void>;
  getLossSuggestion: (outputShape: number[], finalActivation: string, taskType: string) => Promise<void>;
  getLRSchedulePreview: (optimizer: string, lr: number, scheduler: string, epochs: number) => Promise<void>;
  resetTrainingState: () => void;

  // Dataset Config
  datasetConfig: DatasetConfig | null;
  inferredDatasetShape: number[] | null;
  isInferringDatasetShape: boolean;
  setDatasetConfig: (config: DatasetConfig | null) => void;
  setDatasetSource: (source: 'predefined' | 'image_folder' | 'custom') => void;
  addTransform: (transform: TransformConfig) => void;
  removeTransform: (index: number) => void;
  reorderTransforms: (from: number, to: number) => void;
  updateTransformParam: (index: number, key: string, value: any) => void;
  setDataLoaderConfig: (config: Partial<DataLoaderConfig>) => void;
  inferDatasetShape: () => Promise<void>;
}


const DEFAULT_PARAMS: Record<LayerType, LayerParams> = {
  Conv2d: { in_channels: 3, out_channels: 16, kernel_size: 3, stride: 1, padding: 1, bias: true },
  ConvTranspose2d: { in_channels: 16, out_channels: 3, kernel_size: 3, stride: 1, padding: 1, bias: true },
  MaxPool2d: { kernel_size: 2, stride: 2, padding: 0 },
  AvgPool2d: { kernel_size: 2, stride: 2, padding: 0 },
  AdaptiveAvgPool2d: { output_size: 1 },
  Linear: { in_features: 128, out_features: 10, bias: true },
  Embedding: { num_embeddings: 1000, embedding_dim: 64 },
  BatchNorm2d: { num_features: 16 },
  LayerNorm: { normalized_shape: 64 },
  GroupNorm: { num_groups: 2, num_channels: 16 },
  ReLU: {},
  GELU: {},
  Sigmoid: {},
  Tanh: {},
  Softmax: { dim: -1 },
  Flatten: { start_dim: 1, end_dim: -1 },
  Reshape: { shape: [-1, 64] },
  Permute: { dims: [0, 2, 3, 1] },
  Dropout: { p: 0.5 },
  Dropout2d: { p: 0.5 },
  Add: {},
  Concat: { dim: 1 },
  Multiply: {},
  InputNode: {},
  OutputNode: {},
  // Templates blocks default empty params
  ResidualBlock: {},
  TransformerEncoder: {},
  MultiHeadAttention: {},
  ConvBNReLU: {},
  BottleneckBlock: {},
  Block: {}
};

const formatGraphForEngine = (nodes: Node<NodeData>[], edges: Edge[], activeSubGraphs: SubGraph[]): { nodes: any[]; edges: any[] } => {
  // Find all InputNode and OutputNode elements on this canvas
  const inputNodeIds = nodes.filter(n => n.data.type === 'InputNode').map(n => n.id);
  const outputNodeIds = nodes.filter(n => n.data.type === 'OutputNode').map(n => n.id);

  // Filter out InputNode/OutputNode elements from the nodes list
  const formattedNodes = nodes
    .filter(n => n.data.type !== 'InputNode' && n.data.type !== 'OutputNode')
    .map((n) => {
      if (['Block', 'ResidualBlock', 'TransformerEncoder', 'MultiHeadAttention', 'ConvBNReLU', 'BottleneckBlock'].includes(n.data.type)) {
        // Resolve child subgraph
        const subId = n.data.params?.subgraph_id;
        const sub = activeSubGraphs.find(s => s.id === subId);
        let nestedGraph: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] };
        if (sub) {
          try {
            const parsed = JSON.parse(sub.graphJson);
            nestedGraph = formatGraphForEngine(parsed.nodes || [], parsed.edges || [], activeSubGraphs);
          } catch (e) {
            console.error("Failed to parse subgraph json:", e);
          }
        }
        return {
          id: n.id,
          type: n.data.type,
          graph: nestedGraph,
          repeat: n.data.params?.repeat || 1
        };
      }
      return {
        id: n.id,
        type: n.data.type,
        params: n.data.params
      };
    });

  const hasMultipleOutputs = outputNodeIds.length > 1;
  const concatNodeId = `auto_output_concat_${Date.now()}`;

  if (hasMultipleOutputs) {
    // Inject a virtual Concat node to bundle multiple outputs together
    formattedNodes.push({
      id: concatNodeId,
      type: 'Concat',
      params: { dim: 1 }
    });
  }

  // Map edges: if source is in inputNodeIds -> "input", if target is in outputNodeIds -> auto-routed
  const formattedEdges = edges.map((e) => {
    let source = e.source;
    let target = e.target;
    if (inputNodeIds.includes(source)) {
      source = 'input';
    }
    if (outputNodeIds.includes(target)) {
      target = hasMultipleOutputs ? concatNodeId : 'output';
    }
    return {
      source,
      target
    };
  });

  if (hasMultipleOutputs) {
    // Add the single final edge from the Concat node to the virtual "output"
    formattedEdges.push({
      source: concatNodeId,
      target: 'output'
    });
  }

  return { nodes: formattedNodes, edges: formattedEdges };
};

export const useWeaveStore = create<WeaveState>((set, get) => {
  // Setup debounce variable for autosaving
  let saveTimeout: NodeJS.Timeout | null = null;
  let inferTimeout: NodeJS.Timeout | null = null;

  return {
    // Dataset State
    datasetConfig: null,
    inferredDatasetShape: null,
    isInferringDatasetShape: false,

    // Auth State
    token: localStorage.getItem('weave_token'),
    isAuthenticated: !!localStorage.getItem('weave_token'),
    user: null,
    authError: null,
    isAuthenticating: false,
    isKernelConnected: false,
    checkKernelConnection: async () => {
      try {
        const engineUrl = import.meta.env.VITE_ENGINE_URL || 'http://localhost:8000';
        const res = await fetch(`${engineUrl}/health`, { method: 'GET' });
        set({ isKernelConnected: res.ok });
      } catch {
        set({ isKernelConnected: false });
      }
    },

    login: async (dto) => {
      set({ isAuthenticating: true, authError: null });
      try {
        const res = await api.auth.login(dto);
        if (res.succeeded && res.token) {
          localStorage.setItem('weave_token', res.token);
          set({ token: res.token, isAuthenticated: true, isAuthenticating: false });
          return true;
        }
        set({ authError: res.errors?.join('; ') || 'Login failed', isAuthenticating: false });
        return false;
      } catch (err: any) {
        set({ authError: err.message || 'Login failed', isAuthenticating: false });
        return false;
      }
    },

    register: async (dto) => {
      set({ isAuthenticating: true, authError: null });
      try {
        const res = await api.auth.register(dto);
        if (res.succeeded) {
          // Auto login on register success or prompt login
          if (res.token) {
            localStorage.setItem('weave_token', res.token);
            set({ token: res.token, isAuthenticated: true, isAuthenticating: false });
          } else {
            set({ isAuthenticating: false });
          }
          return true;
        }
        set({ authError: res.errors?.join('; ') || 'Registration failed', isAuthenticating: false });
        return false;
      } catch (err: any) {
        set({ authError: err.message || 'Registration failed', isAuthenticating: false });
        return false;
      }
    },

    logout: () => {
      localStorage.removeItem('weave_token');
      set({
        token: null,
        isAuthenticated: false,
        user: null,
        projects: [],
        activeProject: null,
        activeSubGraphs: [],
        activeSubGraph: null,
        nodes: [],
        edges: []
      });
    },

    // Projects State
    projects: [],
    activeProject: null,
    activeSubGraphs: [],
    activeSubGraph: null,
    isLoadingProjects: false,

    fetchProjects: async () => {
      set({ isLoadingProjects: true });
      try {
        const projects = await api.projects.list();
        set({ projects, isLoadingProjects: false });
      } catch (err) {
        console.error("Failed to fetch projects:", err);
        set({ isLoadingProjects: false });
      }
    },

    selectProject: async (project) => {
      try {
        const detail = await api.projects.get(project.id);
        const subgraphs = detail.subGraphs || [];
        set({
          activeProject: detail,
          activeSubGraphs: subgraphs,
          activeSubGraph: subgraphs.length > 0 ? subgraphs[0] : null,
          navigationStack: []
        });

        if (subgraphs.length > 0) {
          get().selectSubGraph(subgraphs[0]);
        } else {
          // Auto-create a default "Main" subgraph with connected input/output nodes
          await get().createSubGraph("Main");
        }
      } catch (err) {
        console.error("Failed to load project details:", err);
      }
    },

    createProject: async (name, description) => {
      try {
        const newProj = await api.projects.create({ name, description });
        set((state) => ({ projects: [newProj, ...state.projects] }));
        await get().selectProject(newProj);
      } catch (err) {
        console.error("Failed to create project:", err);
        throw err;
      }
    },

    deleteProject: async (id) => {
      try {
        await api.projects.delete(id);
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProject: state.activeProject?.id === id ? null : state.activeProject,
          activeSubGraph: state.activeProject?.id === id ? null : state.activeSubGraph,
          nodes: state.activeProject?.id === id ? [] : state.nodes,
          edges: state.activeProject?.id === id ? [] : state.edges
        }));
      } catch (err) {
        console.error("Failed to delete project:", err);
      }
    },

    // SubGraphs State
    navigationStack: [],

    enterSubGraph: async (subGraphId) => {
      const { activeSubGraph, activeSubGraphs, nodes, edges, activeProject } = get();
      if (!activeSubGraph) return;

      // 1. Save current graph immediately (sync)
      const graphJson = JSON.stringify({ nodes, edges });
      if (activeProject) {
        try {
          await api.projects.updateSubGraph(activeProject.id, activeSubGraph.id, {
            name: activeSubGraph.name,
            graphJson
          });
        } catch (err) {
          console.error("Failed to save current subgraph on enter:", err);
        }
      }

      // 2. Find target subgraph
      const targetSub = activeSubGraphs.find(s => s.id === subGraphId);
      if (!targetSub) return;

      // 3. Push current subgraph onto navigation stack
      set((state) => ({
        navigationStack: [...state.navigationStack, activeSubGraph],
        activeSubGraph: targetSub
      }));

      // 4. Load child graph nodes/edges
      try {
        const parsed = JSON.parse(targetSub.graphJson);
        set({
          nodes: parsed.nodes || [],
          edges: parsed.edges || [],
          validationStatus: 'idle',
          validationMessage: null,
          nodeShapes: {}
        });
        
        // Trigger validate pipeline
        setTimeout(() => get().validatePipeline([32, 3, 224, 224]), 200);
      } catch {
        set({ nodes: [], edges: [] });
      }
    },

    exitSubGraph: async (index) => {
      const { navigationStack, activeSubGraph, nodes, edges, activeProject } = get();
      if (!activeSubGraph || navigationStack.length === 0) return;

      // 1. Save current nested subgraph
      const graphJson = JSON.stringify({ nodes, edges });
      if (activeProject) {
        try {
          await api.projects.updateSubGraph(activeProject.id, activeSubGraph.id, {
            name: activeSubGraph.name,
            graphJson
          });
        } catch (err) {
          console.error("Failed to save current subgraph on exit:", err);
        }
      }

      // 2. Pop navigation stack down to target index
      const targetSub = index === -1 ? navigationStack[0] : navigationStack[index];
      const newStack = index === -1 ? [] : navigationStack.slice(0, index);

      set({
        navigationStack: newStack,
        activeSubGraph: targetSub
      });

      // 3. Load target subgraph
      try {
        const parsed = JSON.parse(targetSub.graphJson);
        set({
          nodes: parsed.nodes || [],
          edges: parsed.edges || [],
          validationStatus: 'idle',
          validationMessage: null,
          nodeShapes: {}
        });

        // Trigger validate pipeline
        setTimeout(() => get().validatePipeline([32, 3, 224, 224]), 200);
      } catch {
        set({ nodes: [], edges: [] });
      }
    },

    selectSubGraph: (subgraph) => {
      set({ activeSubGraph: subgraph });
      try {
        const parsed = JSON.parse(subgraph.graphJson);
        set({
          nodes: parsed.nodes || [],
          edges: parsed.edges || [],
          validationStatus: 'idle',
          validationMessage: null,
          nodeShapes: {}
        });
        
        // Trigger validate pipeline if input shape exists
        setTimeout(() => get().validatePipeline([32, 3, 224, 224]), 200);
      } catch (e) {
        set({ nodes: [], edges: [] });
      }
    },

    createSubGraph: async (name) => {
      const activeProject = get().activeProject;
      if (!activeProject) return;

      try {
        const inputId = `inputnode_${Date.now()}`;
        const outputId = `outputnode_${Date.now()}`;
        const initialNodes = [
          {
            id: inputId,
            type: 'layer',
            position: { x: 250, y: 50 },
            data: {
              type: 'InputNode',
              label: 'Input'
            }
          },
          {
            id: outputId,
            type: 'layer',
            position: { x: 250, y: 450 },
            data: {
              type: 'OutputNode',
              label: 'Output'
            }
          }
        ];
        const initialEdges = [
          {
            id: `edge_${Date.now()}`,
            source: inputId,
            target: outputId,
            animated: true
          }
        ];
        const initialGraphJson = JSON.stringify({ nodes: initialNodes, edges: initialEdges });
        const newSub = await api.projects.createSubGraph(activeProject.id, {
          name,
          graphJson: initialGraphJson
        });

        set((state) => ({
          activeSubGraphs: [...state.activeSubGraphs, newSub],
          activeSubGraph: newSub
        }));
        get().selectSubGraph(newSub);
      } catch (err) {
        console.error("Failed to create subgraph:", err);
      }
    },

    // Canvas State
    nodes: [],
    edges: [],
    selectedNodeId: null,
    isSavingGraph: false,
    validationStatus: 'idle',
    validationMessage: null,
    nodeShapes: {},

    setNodes: (nodes) => {
      set({ nodes });
      get().saveActiveSubGraph();
    },

    onNodesChange: (changes) => {
      set((state) => ({
        nodes: applyNodeChanges(changes, state.nodes)
      }));
      get().saveActiveSubGraph();
    },

    onEdgesChange: (changes) => {
      set((state) => ({
        edges: applyEdgeChanges(changes, state.edges)
      }));
      get().saveActiveSubGraph();
    },

    setSelectedNodeId: (id) => set({ selectedNodeId: id }),

    addNode: async (type, position) => {
      const isBlockType = ['Block', 'ResidualBlock', 'TransformerEncoder', 'MultiHeadAttention', 'ConvBNReLU', 'BottleneckBlock'].includes(type);
      let subgraphId: string | undefined = undefined;

      if (isBlockType) {
        const activeProject = get().activeProject;
        if (activeProject) {
          try {
            let initialNodes: any[] = [];
            let initialEdges: any[] = [];

            if (type === 'ResidualBlock') {
              initialNodes = [
                { id: 'input_node', type: 'layer', position: { x: 150, y: 50 }, data: { type: 'InputNode', label: 'Input' } },
                { id: `conv_${Date.now()}_1`, type: 'layer', position: { x: 150, y: 150 }, data: { type: 'Conv2d', label: 'Conv 1', params: { in_channels: 16, out_channels: 16, kernel_size: 3, stride: 1, padding: 1 } } },
                { id: `bn_${Date.now()}_1`, type: 'layer', position: { x: 150, y: 250 }, data: { type: 'BatchNorm2d', label: 'BN 1', params: { num_features: 16 } } },
                { id: `relu_${Date.now()}_1`, type: 'layer', position: { x: 150, y: 350 }, data: { type: 'ReLU', label: 'ReLU 1', params: {} } },
                { id: `conv_${Date.now()}_2`, type: 'layer', position: { x: 150, y: 450 }, data: { type: 'Conv2d', label: 'Conv 2', params: { in_channels: 16, out_channels: 16, kernel_size: 3, stride: 1, padding: 1 } } },
                { id: `add_${Date.now()}`, type: 'layer', position: { x: 150, y: 550 }, data: { type: 'Add', label: 'Residual Add', params: {} } },
                { id: 'output_node', type: 'layer', position: { x: 150, y: 650 }, data: { type: 'OutputNode', label: 'Output' } }
              ];
              initialEdges = [
                { id: `e_${Date.now()}_1`, source: 'input_node', target: initialNodes[1].id, animated: true },
                { id: `e_${Date.now()}_2`, source: initialNodes[1].id, target: initialNodes[2].id, animated: true },
                { id: `e_${Date.now()}_3`, source: initialNodes[2].id, target: initialNodes[3].id, animated: true },
                { id: `e_${Date.now()}_4`, source: initialNodes[3].id, target: initialNodes[4].id, animated: true },
                { id: `e_${Date.now()}_5`, source: initialNodes[4].id, target: initialNodes[5].id, targetHandle: 'input_0', animated: true },
                { id: `e_${Date.now()}_skip`, source: 'input_node', target: initialNodes[5].id, targetHandle: 'input_1', animated: true },
                { id: `e_${Date.now()}_6`, source: initialNodes[5].id, target: 'output_node', animated: true }
              ];
            } else if (type === 'ConvBNReLU') {
              initialNodes = [
                { id: 'input_node', type: 'layer', position: { x: 150, y: 50 }, data: { type: 'InputNode', label: 'Input' } },
                { id: `conv_${Date.now()}`, type: 'layer', position: { x: 150, y: 150 }, data: { type: 'Conv2d', label: 'Conv', params: { in_channels: 16, out_channels: 16, kernel_size: 3, stride: 1, padding: 1 } } },
                { id: `bn_${Date.now()}`, type: 'layer', position: { x: 150, y: 250 }, data: { type: 'BatchNorm2d', label: 'BN', params: { num_features: 16 } } },
                { id: `relu_${Date.now()}`, type: 'layer', position: { x: 150, y: 350 }, data: { type: 'ReLU', label: 'ReLU', params: {} } },
                { id: 'output_node', type: 'layer', position: { x: 150, y: 450 }, data: { type: 'OutputNode', label: 'Output' } }
              ];
              initialEdges = [
                { id: `e_${Date.now()}_1`, source: 'input_node', target: initialNodes[1].id, animated: true },
                { id: `e_${Date.now()}_2`, source: initialNodes[1].id, target: initialNodes[2].id, animated: true },
                { id: `e_${Date.now()}_3`, source: initialNodes[2].id, target: initialNodes[3].id, animated: true },
                { id: `e_${Date.now()}_4`, source: initialNodes[3].id, target: 'output_node', animated: true }
              ];
            } else {
              initialNodes = [
                { id: 'input_node', type: 'layer', position: { x: 150, y: 50 }, data: { type: 'InputNode', label: 'Input' } },
                { id: 'output_node', type: 'layer', position: { x: 150, y: 350 }, data: { type: 'OutputNode', label: 'Output' } }
              ];
              initialEdges = [
                { id: `e_${Date.now()}_1`, source: 'input_node', target: 'output_node', animated: true }
              ];
            }

            const initialGraphJson = JSON.stringify({ nodes: initialNodes, edges: initialEdges });
            const newSub = await api.projects.createSubGraph(activeProject.id, {
              name: `${type}_${Date.now()}`,
              graphJson: initialGraphJson
            });
            subgraphId = newSub.id;
            set((state) => ({
              activeSubGraphs: [...state.activeSubGraphs, newSub]
            }));
          } catch (e) {
            console.error("Failed to create nested subgraph for block node:", e);
          }
        }
      }

      const newNode: Node<NodeData> = {
        id: `${type.toLowerCase()}_${Date.now()}`,
        type: 'layer',
        position,
        data: {
          type,
          label: `${type} Layer`,
          params: { 
            ...DEFAULT_PARAMS[type],
            ...(subgraphId ? { subgraph_id: subgraphId } : {})
          }
        }
      };

      set((state) => ({
        nodes: [...state.nodes, newNode]
      }));
      get().saveActiveSubGraph();
      get().validatePipeline([32, 3, 224, 224]);
    },

    removeNode: (id) => {
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== id),
        edges: state.edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
      }));
      get().saveActiveSubGraph();
      get().validatePipeline([32, 3, 224, 224]);
    },

    updateNodeParams: (id, params) => {
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, params: { ...n.data.params, ...params } } }
            : n
        )
      }));
      get().saveActiveSubGraph();
      get().validatePipeline([32, 3, 224, 224]);
    },

    updateNodeLabel: (id, label) => {
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, label } } : n
        )
      }));
      get().saveActiveSubGraph();
    },

    connectEdges: (connection) => {
      set((state) => ({
        edges: addEdge({ ...connection, type: 'weave', animated: true }, state.edges)
      }));
      get().saveActiveSubGraph();
      get().validatePipeline([32, 3, 224, 224]);
    },

    removeEdge: (id) => {
      set((state) => ({
        edges: state.edges.filter((e) => e.id !== id)
      }));
      get().saveActiveSubGraph();
      get().validatePipeline([32, 3, 224, 224]);
    },

    addSubgraphInput: async (nodeId) => {
      const { activeProject, activeSubGraphs, nodes } = get();
      if (!activeProject) return;
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      const subId = node.data.params?.subgraph_id;
      const sub = activeSubGraphs.find(s => s.id === subId);
      if (!sub) return;

      try {
        const parsed = JSON.parse(sub.graphJson);
        const nestedNodes = parsed.nodes || [];
        const nestedEdges = parsed.edges || [];

        // Count existing input nodes
        const inCount = nestedNodes.filter((n: any) => n.data?.type === 'InputNode').length;

        // Add a new InputNode
        const newInputNode = {
          id: `inputnode_${Date.now()}`,
          type: 'layer',
          position: { x: 100 + inCount * 120, y: 50 },
          data: {
            type: 'InputNode',
            label: `Input ${inCount + 1}`
          }
        };

        const newNodes = [...nestedNodes, newInputNode];
        const newGraphJson = JSON.stringify({ nodes: newNodes, edges: nestedEdges });

        // Update backend
        await api.projects.updateSubGraph(activeProject.id, sub.id, {
          name: sub.name,
          graphJson: newGraphJson
        });

        // Sync local activeSubGraphs list
        const updatedSubGraphs = activeSubGraphs.map(s => s.id === sub.id ? { ...s, graphJson: newGraphJson } : s);
        set({ activeSubGraphs: updatedSubGraphs });

        // Retrigger shape propagation
        get().validatePipeline([32, 3, 224, 224]);
      } catch (e) {
        console.error("Failed to add subgraph input node:", e);
      }
    },

    addSubgraphOutput: async (nodeId) => {
      const { activeProject, activeSubGraphs, nodes } = get();
      if (!activeProject) return;
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      const subId = node.data.params?.subgraph_id;
      const sub = activeSubGraphs.find(s => s.id === subId);
      if (!sub) return;

      try {
        const parsed = JSON.parse(sub.graphJson);
        const nestedNodes = parsed.nodes || [];
        const nestedEdges = parsed.edges || [];

        // Count existing output nodes
        const outCount = nestedNodes.filter((n: any) => n.data?.type === 'OutputNode').length;

        // Add a new OutputNode
        const newOutputNode = {
          id: `outputnode_${Date.now()}`,
          type: 'layer',
          position: { x: 100 + outCount * 120, y: 450 },
          data: {
            type: 'OutputNode',
            label: `Output ${outCount + 1}`
          }
        };

        const newNodes = [...nestedNodes, newOutputNode];
        const newGraphJson = JSON.stringify({ nodes: newNodes, edges: nestedEdges });

        // Update backend
        await api.projects.updateSubGraph(activeProject.id, sub.id, {
          name: sub.name,
          graphJson: newGraphJson
        });

        // Sync local activeSubGraphs list
        const updatedSubGraphs = activeSubGraphs.map(s => s.id === sub.id ? { ...s, graphJson: newGraphJson } : s);
        set({ activeSubGraphs: updatedSubGraphs });

        // Retrigger shape propagation
        get().validatePipeline([32, 3, 224, 224]);
      } catch (e) {
        console.error("Failed to add subgraph output node:", e);
      }
    },

    validatePipeline: async (inputShape) => {
      const { nodes, edges, inferredDatasetShape, datasetConfig } = get();
      if (nodes.length === 0) {
        set({ validationStatus: 'idle', validationMessage: null, nodeShapes: {} });
        return;
      }

      const batchSize = datasetConfig?.dataloader?.batch_size || 32;
      let activeInputShape = inputShape;
      if (!activeInputShape || (activeInputShape[1] === 3 && activeInputShape[2] === 224 && activeInputShape[3] === 224 && inferredDatasetShape)) {
        if (inferredDatasetShape) {
          activeInputShape = [batchSize, ...inferredDatasetShape];
        }
      }
      if (!activeInputShape) {
        activeInputShape = [batchSize, 3, 224, 224];
      }

      // Construct GraphConfig schema recursively
      const formattedGraph = formatGraphForEngine(nodes, edges, get().activeSubGraphs);
      const formattedNodes = formattedGraph.nodes;
      const formattedEdges = formattedGraph.edges;

      try {
        const res = await api.engine.validatePipeline({
          graph: {
            nodes: formattedNodes,
            edges: formattedEdges
          },
          input_shape: activeInputShape
        });


        if (res.status === 'success') {
          // Success shape propagation
          const shapes = res.node_shapes || {};
          set({
            validationStatus: 'success',
            validationMessage: 'Pipeline compiled successfully! Output tensor matches requirements.',
            nodeShapes: shapes,
            // Annotate nodes with shape data
            nodes: nodes.map((n) => ({
              ...n,
              data: {
                ...n.data,
                outputShape: shapes[n.id],
                error: null
              }
            }))
          });
        } else {
          // Error in shape propagation
          set({
            validationStatus: 'error',
            validationMessage: res.message || 'Compilation failed.',
            nodeShapes: {},
            // Trace back failed node if possible and label it in UI
            nodes: nodes.map((n) => {
              const nodeFailed = res.message?.includes(`'${n.id}'`) || res.message?.includes(`Evaluating '${n.id}'`);
              return {
                ...n,
                data: {
                  ...n.data,
                  outputShape: undefined,
                  error: nodeFailed ? res.message : null
                }
              };
            })
          });
        }
      } catch (err: any) {
        set({
          validationStatus: 'error',
          validationMessage: err.message || 'Cannot contact the Python compilation engine.',
          nodeShapes: {}
        });
      }
    },

    saveActiveSubGraph: async () => {
      const { activeProject, activeSubGraph, nodes, edges } = get();
      if (!activeProject || !activeSubGraph) return;

      // Debounce saving operation
      if (saveTimeout) clearTimeout(saveTimeout);

      saveTimeout = setTimeout(async () => {
        try {
          set({ isSavingGraph: true });
          const graphJson = JSON.stringify({ nodes, edges });
          await api.projects.updateSubGraph(activeProject.id, activeSubGraph.id, {
            name: activeSubGraph.name,
            graphJson
          });
          set({ isSavingGraph: false });
        } catch (err) {
          console.error("Autosave failed:", err);
          set({ isSavingGraph: false });
        }
      }, 1500); // 1.5s debounce
    },

    // Training Runner State
    isTraining: false,
    trainingStatus: 'idle',
    activeRunId: null,
    epochMetrics: [],
    stepMetrics: [],
    trainingLogs: [],
    suggestedLoss: null,
    suggestedLossAlternatives: [],
    lrPreview: [],

    startTraining: async (config) => {
      set({
        isTraining: true,
        trainingStatus: 'running',
        epochMetrics: [],
        stepMetrics: [],
        trainingLogs: ['Compiling architecture & starting run...']
      });

      // Prepare nodes and edges configuration
      const { nodes, edges, activeSubGraphs } = get();
      const formattedGraph = formatGraphForEngine(nodes, edges, activeSubGraphs);
      const formattedNodes = formattedGraph.nodes;
      const formattedEdges = formattedGraph.edges;

      // Invert local training config schema into Python TrainingConfig
      const pythonConfig = {
        model_graph: {
          nodes: formattedNodes,
          edges: formattedEdges
        },
        dataset_config: config.dataset_config,
        dataloader_config: config.dataloader_config,
        optimizer_config: config.optimizer_config,
        loss_config: config.loss_config,
        training_settings: config.training_settings
      };

      try {
        const startRes = await api.engine.startTraining(pythonConfig);
        const runId = startRes.run_id;
        set({ activeRunId: runId, trainingLogs: [...get().trainingLogs, `Training run ${runId} successfully spawned.`] });

        // Connect SSE stream
        api.engine.streamTraining(
          runId,
          (event) => {
            const currentLogs = get().trainingLogs;
            if (event.type === 'step_metrics') {
              set((state) => ({
                stepMetrics: [...state.stepMetrics, event],
                trainingLogs: [...currentLogs, `[Step ${event.step}] Loss: ${event.loss?.toFixed(4) || 'N/A'}`]
              }));
            } else if (event.type === 'epoch_metrics') {
              set((state) => ({
                epochMetrics: [...state.epochMetrics, event],
                trainingLogs: [
                  ...currentLogs,
                  `=== Epoch ${event.epoch} Complete === Loss: ${event.loss?.toFixed(4)}, Acc: ${(event.accuracy * 100)?.toFixed(2)}%`
                ]
              }));
            } else if (event.type === 'training_complete') {
              set({
                isTraining: false,
                trainingStatus: 'completed',
                trainingLogs: [...currentLogs, `🎉 Training completed successfully!`]
              });
            }
          },
          (err) => {
            console.error("SSE stream error:", err);
            // Check status manually to see if it crashed or ended
            api.engine.getTrainingStatus(runId).then((statusRes) => {
              if (statusRes.status === 'failed') {
                set({
                  isTraining: false,
                  trainingStatus: 'failed',
                  trainingLogs: [...get().trainingLogs, `❌ Training aborted: Engine error.`]
                });
              } else if (statusRes.status === 'completed' || statusRes.status === 'stopped') {
                set({
                  isTraining: false,
                  trainingStatus: statusRes.status
                });
              }
            });
          }
        );
      } catch (err: any) {
        set({
          isTraining: false,
          trainingStatus: 'failed',
          trainingLogs: [...get().trainingLogs, `❌ Compilation / Training launch failed: ${err.message}`]
        });
      }
    },

    controlTraining: async (action) => {
      const runId = get().activeRunId;
      if (!runId) return;

      try {
        await api.engine.controlTraining(runId, action);
        if (action === 'stop') {
          set({ isTraining: false, trainingStatus: 'stopped', trainingLogs: [...get().trainingLogs, `⏹️ Run stopped by user.`] });
        } else if (action === 'pause') {
          set({ trainingStatus: 'paused', trainingLogs: [...get().trainingLogs, `⏸️ Run paused.`] });
        } else if (action === 'resume') {
          set({ trainingStatus: 'running', trainingLogs: [...get().trainingLogs, `▶️ Run resumed.`] });
        }
      } catch (err) {
        console.error(`Failed to execute training control action ${action}:`, err);
      }
    },

    getLossSuggestion: async (outputShape, finalActivation, taskType) => {
      try {
        const res = await api.engine.suggestLoss({
          output_shape: outputShape,
          final_activation: finalActivation,
          task_type: taskType
        });
        set({
          suggestedLoss: res.suggested,
          suggestedLossAlternatives: res.alternatives || []
        });
      } catch (err) {
        console.error("Failed to suggest loss:", err);
      }
    },

    getLRSchedulePreview: async (optimizer, lr, scheduler, epochs) => {
      try {
        const res = await api.engine.previewLRSchedule({
          optimizer,
          initial_lr: lr,
          scheduler_type: scheduler,
          epochs,
          // Defaults for step/cosine config
          scheduler_params: {
            step_size: 5,
            gamma: 0.1,
            t_max: epochs
          }
        });
        set({ lrPreview: res.lr_path || [] });
      } catch (err) {
        console.error("Failed to get learning rate preview path:", err);
      }
    },

    resetTrainingState: () => {
      set({
        isTraining: false,
        trainingStatus: 'idle',
        activeRunId: null,
        epochMetrics: [],
        stepMetrics: [],
        trainingLogs: [],
        suggestedLoss: null,
        suggestedLossAlternatives: [],
        lrPreview: []
      });
    },

    setDatasetConfig: (config) => {
      set({ datasetConfig: config });
      
      if (inferTimeout) clearTimeout(inferTimeout);
      inferTimeout = setTimeout(() => {
        get().inferDatasetShape();
      }, 800);
    },

    setDatasetSource: (source) => {
      let config: DatasetConfig | null = null;
      const dataloader: DataLoaderConfig = {
        batch_size: 32,
        shuffle: true,
        num_workers: 4,
        pin_memory: true,
        drop_last: false,
      };

      if (source === 'predefined') {
        config = {
          source: 'predefined',
          name: 'MNIST',
          split: 'train',
          transforms: [
            { type: 'ToTensor' },
            { type: 'Normalize', mean: [0.1307], std: [0.3081] }
          ],
          dataloader
        };
      } else if (source === 'image_folder') {
        config = {
          source: 'image_folder',
          root: '',
          split_ratio: 0.8,
          transforms: [{ type: 'ToTensor' }],
          dataloader
        };
      } else if (source === 'custom') {
        config = {
          source: 'custom',
          modality: 'image',
          transforms: [{ type: 'ToTensor' }],
          dataloader,
          file_pattern: '*.jpg'
        };
      }
      
      get().setDatasetConfig(config);
    },

    addTransform: (transform) => {
      const { datasetConfig } = get();
      if (!datasetConfig) return;
      const transforms = [...datasetConfig.transforms, transform];
      get().setDatasetConfig({ ...datasetConfig, transforms });
    },

    removeTransform: (index) => {
      const { datasetConfig } = get();
      if (!datasetConfig) return;
      const transforms = datasetConfig.transforms.filter((_, i) => i !== index);
      get().setDatasetConfig({ ...datasetConfig, transforms });
    },

    reorderTransforms: (from, to) => {
      const { datasetConfig } = get();
      if (!datasetConfig) return;
      const transforms = [...datasetConfig.transforms];
      const [removed] = transforms.splice(from, 1);
      transforms.splice(to, 0, removed);
      get().setDatasetConfig({ ...datasetConfig, transforms });
    },

    updateTransformParam: (index, key, value) => {
      const { datasetConfig } = get();
      if (!datasetConfig) return;
      const transforms = datasetConfig.transforms.map((t, i) => {
        if (i === index) {
          return { ...t, [key]: value };
        }
        return t;
      });
      get().setDatasetConfig({ ...datasetConfig, transforms });
    },

    setDataLoaderConfig: (config) => {
      const { datasetConfig } = get();
      if (!datasetConfig) return;
      const dataloader = { ...datasetConfig.dataloader, ...config };
      get().setDatasetConfig({ ...datasetConfig, dataloader });
    },

    inferDatasetShape: async () => {
      const { datasetConfig } = get();
      if (!datasetConfig) {
        set({ inferredDatasetShape: null });
        return;
      }
      
      set({ isInferringDatasetShape: true });
      try {
        const res = await api.engine.inferDatasetShape({
          dataset_config: datasetConfig
        });
        if (res && res.status === 'success' && res.per_sample_shape) {
          set({
            inferredDatasetShape: res.per_sample_shape,
            isInferringDatasetShape: false
          });
          
          // Patch InputNode nodes' outputShape
          const batchSize = datasetConfig.dataloader?.batch_size || 32;
          const fullShape = [batchSize, ...res.per_sample_shape];
          
          set((state) => ({
            nodes: state.nodes.map((n) => {
              if (n.data.type === 'InputNode') {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    outputShape: fullShape,
                    error: null
                  }
                };
              }
              return n;
            })
          }));
          
          // Re-validate pipeline with the new input shape
          await get().validatePipeline(fullShape);
        } else {
          set({
            inferredDatasetShape: null,
            isInferringDatasetShape: false
          });
          // Set error on input nodes
          set((state) => ({
            nodes: state.nodes.map((n) => {
              if (n.data.type === 'InputNode') {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    outputShape: undefined,
                    error: res?.message || 'Dataset shape unknown'
                  }
                };
              }
              return n;
            })
          }));
        }
      } catch (err: any) {
        console.error("Shape inference failed:", err);
        set({
          inferredDatasetShape: null,
          isInferringDatasetShape: false
        });
        set((state) => ({
          nodes: state.nodes.map((n) => {
            if (n.data.type === 'InputNode') {
              return {
                ...n,
                data: {
                  ...n.data,
                  outputShape: undefined,
                  error: err.message || 'Dataset shape unknown'
                }
              };
            }
            return n;
          })
        }));
      }
    }
  };
});
