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
  importTemplate: (template: any) => Promise<void>;

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
  getFormattedGraph: () => { nodes: any[]; edges: any[] };

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
  activeInputShape: number[] | null;
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
  Reshape: { target_shape: [-1, 64] },
  Permute: { dims: [0, 2, 3, 1] },
  Dropout: { p: 0.5 },
  Dropout2d: { p: 0.5 },
  Add: {},
  Concat: { dim: 1 },
  Multiply: {},
  Sub: {},
  Div: {},
  Sqrt: {},
  Mean: { dim: [0, 2, 3], keepdim: true },
  Var: { dim: [0, 2, 3], keepdim: true, unbiased: false },
  MatMul: {},
  Scale: { value: 1.0 },
  ChannelScaleBias: { num_features: 3 },
  Slice: { dim: 1, index: 0 },
  CustomAutograd: { forward_code: 'def forward(x):\n    return x', backward_code: 'def backward(x, grad_output):\n    return grad_output' },
  InputNode: {},
  OutputNode: {},
  // Templates blocks default empty params
  ResidualBlock: {},
  TransformerEncoder: {},
  MultiHeadAttention: {},
  ConvBNReLU: {},
  BottleneckBlock: {},
  BatchNorm2dManualBlock: {},
  AttentionManualBlock: {},
  RNNManualBlock: {},
  CustomAutogradManualBlock: {},
  Block: {}
};

export function getInducedParam(nodeType: string, incomingShape?: number[]): { key: string; value: number } | null {
  if (!incomingShape || incomingShape.length === 0) return null;

  switch (nodeType) {
    case 'Linear':
      return {
        key: 'in_features',
        value: incomingShape[incomingShape.length - 1]
      };
    case 'Conv2d':
    case 'ConvTranspose2d':
      return {
        key: 'in_channels',
        value: incomingShape.length >= 2 ? incomingShape[1] : incomingShape[0]
      };
    case 'BatchNorm2d':
      return {
        key: 'num_features',
        value: incomingShape.length >= 2 ? incomingShape[1] : incomingShape[0]
      };
    case 'GroupNorm':
      return {
        key: 'num_channels',
        value: incomingShape.length >= 2 ? incomingShape[1] : incomingShape[0]
      };
    case 'ChannelScaleBias':
      return {
        key: 'num_features',
        value: incomingShape.length >= 2 ? incomingShape[1] : incomingShape[0]
      };
    default:
      return null;
  }
}

export function applyParameterInduction(nodes: Node<NodeData>[], edges: Edge[]): Node<NodeData>[] {
  return nodes.map((n) => {
    const incomingEdges = edges.filter(e => e.target === n.id);
    if (incomingEdges.length !== 1) return n;
    const incomingNode = nodes.find(src => src.id === incomingEdges[0].source);
    const incomingShape = incomingNode?.data?.outputShape;
    const induced = getInducedParam(n.data.type, incomingShape);
    if (induced) {
      const currentValue = n.data.params?.[induced.key];
      if (currentValue !== induced.value) {
        return {
          ...n,
          data: {
            ...n.data,
            params: {
              ...n.data.params,
              [induced.key]: induced.value
            }
          }
        };
      }
    }
    return n;
  });
}

const formatGraphForEngine = (nodes: Node<NodeData>[], edges: Edge[], activeSubGraphs: SubGraph[]): { nodes: any[]; edges: any[] } => {
  // Find all InputNode and OutputNode elements on this canvas
  const inputNodeIds = nodes.filter(n => n.data.type === 'InputNode').map(n => n.id);
  const outputNodeIds = nodes.filter(n => n.data.type === 'OutputNode').map(n => n.id);

  // Filter out InputNode/OutputNode elements from the nodes list
  const formattedNodes = nodes
    .filter(n => n.data.type !== 'InputNode' && n.data.type !== 'OutputNode')
    .map((n) => {
      if (['Block', 'ResidualBlock', 'TransformerEncoder', 'MultiHeadAttention', 'ConvBNReLU', 'BottleneckBlock', 'BatchNorm2dManualBlock', 'AttentionManualBlock', 'RNNManualBlock', 'CustomAutogradManualBlock'].includes(n.data.type)) {
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

  // Sort edges by target node ID and targetHandle (e.g. input_0, input_1)
  // to ensure that the compiler gets multi-input operands in the exact visual ordering of the handles
  const sortedEdges = [...edges].sort((a, b) => {
    if (a.target === b.target) {
      const handleA = a.targetHandle || '';
      const handleB = b.targetHandle || '';
      return handleA.localeCompare(handleB, undefined, { numeric: true, sensitivity: 'base' });
    }
    return a.target.localeCompare(b.target);
  });

  // Map edges: if source is in inputNodeIds -> "input", if target is in outputNodeIds -> auto-routed
  const formattedEdges = sortedEdges.map((e) => {
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
    activeInputShape: null,
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

    importTemplate: async (template) => {
      try {
        const newProj = await api.projects.create({
          name: template.name,
          description: template.description
        });
        set((state) => ({ projects: [newProj, ...state.projects] }));

        const projectId = newProj.id;
        const initialNodes = template.nodes.map((node: any) => ({
          id: node.id,
          type: 'layer',
          position: node.position,
          data: {
            type: node.type,
            label: node.label,
            params: node.params
          }
        }));

        const initialEdges = template.edges.map((edge: any, index: number) => ({
          id: `edge_${Date.now()}_${index}`,
          source: edge.source,
          target: edge.target,
          ...(edge.targetHandle ? { targetHandle: edge.targetHandle } : {}),
          animated: true
        }));

        const graphJson = JSON.stringify({ nodes: initialNodes, edges: initialEdges });

        const mainSub = await api.projects.createSubGraph(projectId, {
          name: "Main",
          graphJson
        });

        const detail = {
          ...newProj,
          subGraphs: [mainSub]
        };

        set({
          activeProject: detail,
          activeSubGraphs: [mainSub],
          activeSubGraph: mainSub,
          navigationStack: []
        });

        get().selectSubGraph(mainSub);

        setTimeout(() => get().validatePipeline(template.inputShape), 300);
      } catch (err) {
        console.error("Failed to import template project:", err);
        throw err;
      }
    },

    // SubGraphs State
    navigationStack: [],

    enterSubGraph: async (subGraphId) => {
      const { activeSubGraph, activeSubGraphs, nodes, edges, activeProject } = get();
      if (!activeSubGraph) return;

      // 1. Save current graph immediately (sync)
      const graphJson = JSON.stringify({ nodes, edges, datasetConfig: get().datasetConfig });
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
        const restoredDatasetConfig = parsed.datasetConfig || null;
        set({
          nodes: parsed.nodes || [],
          edges: parsed.edges || [],
          datasetConfig: restoredDatasetConfig,
          validationStatus: 'idle',
          validationMessage: null,
          nodeShapes: {}
        });

        // Trigger validate pipeline, and re-infer shape if a dataset config was restored
        setTimeout(() => {
          if (restoredDatasetConfig) {
            get().inferDatasetShape();
          } else {
            get().validatePipeline();
          }
        }, 200);
      } catch {
        set({ nodes: [], edges: [] });
      }
    },

    exitSubGraph: async (index) => {
      const { navigationStack, activeSubGraph, nodes, edges, activeProject } = get();
      if (!activeSubGraph || navigationStack.length === 0) return;

      // 1. Save current nested subgraph
      const graphJson = JSON.stringify({ nodes, edges, datasetConfig: get().datasetConfig });
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
        const restoredDatasetConfig = parsed.datasetConfig || null;
        set({
          nodes: parsed.nodes || [],
          edges: parsed.edges || [],
          datasetConfig: restoredDatasetConfig,
          validationStatus: 'idle',
          validationMessage: null,
          nodeShapes: {}
        });

        // Trigger validate pipeline, and re-infer shape if a dataset config was restored
        setTimeout(() => {
          if (restoredDatasetConfig) {
            get().inferDatasetShape();
          } else {
            get().validatePipeline();
          }
        }, 200);
      } catch {
        set({ nodes: [], edges: [] });
      }
    },

    selectSubGraph: (subgraph) => {
      set({ activeSubGraph: subgraph });
      try {
        const parsed = JSON.parse(subgraph.graphJson);
        const restoredDatasetConfig = parsed.datasetConfig || null;
        set({
          nodes: parsed.nodes || [],
          edges: parsed.edges || [],
          datasetConfig: restoredDatasetConfig,
          validationStatus: 'idle',
          validationMessage: null,
          nodeShapes: {}
        });

        // Trigger validate pipeline, and re-infer shape if a dataset config was restored
        setTimeout(() => {
          if (restoredDatasetConfig) {
            get().inferDatasetShape();
          } else {
            get().validatePipeline();
          }
        }, 200);
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
      const isBlockType = ['Block', 'ResidualBlock', 'TransformerEncoder', 'MultiHeadAttention', 'ConvBNReLU', 'BottleneckBlock', 'BatchNorm2dManualBlock', 'AttentionManualBlock', 'RNNManualBlock', 'CustomAutogradManualBlock'].includes(type);
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
            } else if (type === 'BatchNorm2dManualBlock') {
              initialNodes = [
                { id: 'input_node', type: 'layer', position: { x: 250, y: 50 }, data: { type: 'InputNode', label: 'Input' } },
                { id: `mean_${Date.now()}`, type: 'layer', position: { x: 100, y: 150 }, data: { type: 'Mean', label: 'Mean', params: { dim: [0, 2, 3], keepdim: true } } },
                { id: `x_sub_${Date.now()}`, type: 'layer', position: { x: 250, y: 250 }, data: { type: 'Sub', label: 'Sub', params: {} } },
                { id: `var_${Date.now()}`, type: 'layer', position: { x: 400, y: 150 }, data: { type: 'Var', label: 'Var', params: { dim: [0, 2, 3], keepdim: true, unbiased: false } } },
                { id: `std_${Date.now()}`, type: 'layer', position: { x: 400, y: 250 }, data: { type: 'Sqrt', label: 'Sqrt', params: { eps: 1e-5 } } },
                { id: `x_norm_${Date.now()}`, type: 'layer', position: { x: 250, y: 350 }, data: { type: 'Div', label: 'Div', params: {} } },
                { id: `scale_bias_${Date.now()}`, type: 'layer', position: { x: 250, y: 450 }, data: { type: 'ChannelScaleBias', label: 'Scale Bias', params: { num_features: 3 } } },
                { id: 'output_node', type: 'layer', position: { x: 250, y: 550 }, data: { type: 'OutputNode', label: 'Output' } }
              ];
              initialEdges = [
                { id: `e_${Date.now()}_1`, source: 'input_node', target: initialNodes[1].id, animated: true },
                { id: `e_${Date.now()}_2`, source: 'input_node', target: initialNodes[2].id, targetHandle: 'input_0', animated: true },
                { id: `e_${Date.now()}_3`, source: initialNodes[1].id, target: initialNodes[2].id, targetHandle: 'input_1', animated: true },
                { id: `e_${Date.now()}_4`, source: 'input_node', target: initialNodes[3].id, animated: true },
                { id: `e_${Date.now()}_5`, source: initialNodes[3].id, target: initialNodes[4].id, animated: true },
                { id: `e_${Date.now()}_6`, source: initialNodes[2].id, target: initialNodes[5].id, targetHandle: 'input_0', animated: true },
                { id: `e_${Date.now()}_7`, source: initialNodes[4].id, target: initialNodes[5].id, targetHandle: 'input_1', animated: true },
                { id: `e_${Date.now()}_8`, source: initialNodes[5].id, target: initialNodes[6].id, animated: true },
                { id: `e_${Date.now()}_9`, source: initialNodes[6].id, target: 'output_node', animated: true }
              ];
            } else if (type === 'AttentionManualBlock') {
              initialNodes = [
                { id: 'input_node', type: 'layer', position: { x: 250, y: 50 }, data: { type: 'InputNode', label: 'Input' } },
                { id: `q_proj_${Date.now()}`, type: 'layer', position: { x: 100, y: 150 }, data: { type: 'Linear', label: 'Query Proj', params: { in_features: 8, out_features: 8 } } },
                { id: `k_proj_${Date.now()}`, type: 'layer', position: { x: 250, y: 150 }, data: { type: 'Linear', label: 'Key Proj', params: { in_features: 8, out_features: 8 } } },
                { id: `v_proj_${Date.now()}`, type: 'layer', position: { x: 400, y: 150 }, data: { type: 'Linear', label: 'Value Proj', params: { in_features: 8, out_features: 8 } } },
                { id: `k_trans_${Date.now()}`, type: 'layer', position: { x: 250, y: 250 }, data: { type: 'Permute', label: 'Key Transpose', params: { dims: [0, 2, 1] } } },
                { id: `scores_${Date.now()}`, type: 'layer', position: { x: 175, y: 350 }, data: { type: 'MatMul', label: 'Scores MatMul', params: {} } },
                { id: `scaled_scores_${Date.now()}`, type: 'layer', position: { x: 175, y: 430 }, data: { type: 'Scale', label: 'Scale Scores', params: { value: 0.35355339 } } },
                { id: `attn_weights_${Date.now()}`, type: 'layer', position: { x: 175, y: 510 }, data: { type: 'Softmax', label: 'Softmax', params: { dim: -1 } } },
                { id: `context_${Date.now()}`, type: 'layer', position: { x: 300, y: 600 }, data: { type: 'MatMul', label: 'Context MatMul', params: {} } },
                { id: `out_proj_${Date.now()}`, type: 'layer', position: { x: 300, y: 700 }, data: { type: 'Linear', label: 'Output Proj', params: { in_features: 8, out_features: 8 } } },
                { id: 'output_node', type: 'layer', position: { x: 300, y: 800 }, data: { type: 'OutputNode', label: 'Output' } }
              ];
              initialEdges = [
                { id: `e_${Date.now()}_1`, source: 'input_node', target: initialNodes[1].id, animated: true },
                { id: `e_${Date.now()}_2`, source: 'input_node', target: initialNodes[2].id, animated: true },
                { id: `e_${Date.now()}_3`, source: 'input_node', target: initialNodes[3].id, animated: true },
                { id: `e_${Date.now()}_4`, source: initialNodes[2].id, target: initialNodes[4].id, animated: true },
                { id: `e_${Date.now()}_5`, source: initialNodes[1].id, target: initialNodes[5].id, targetHandle: 'input_0', animated: true },
                { id: `e_${Date.now()}_6`, source: initialNodes[4].id, target: initialNodes[5].id, targetHandle: 'input_1', animated: true },
                { id: `e_${Date.now()}_7`, source: initialNodes[5].id, target: initialNodes[6].id, animated: true },
                { id: `e_${Date.now()}_8`, source: initialNodes[6].id, target: initialNodes[7].id, animated: true },
                { id: `e_${Date.now()}_9`, source: initialNodes[7].id, target: initialNodes[8].id, targetHandle: 'input_0', animated: true },
                { id: `e_${Date.now()}_10`, source: initialNodes[3].id, target: initialNodes[8].id, targetHandle: 'input_1', animated: true },
                { id: `e_${Date.now()}_11`, source: initialNodes[8].id, target: initialNodes[9].id, animated: true },
                { id: `e_${Date.now()}_12`, source: initialNodes[9].id, target: 'output_node', animated: true }
              ];
            } else if (type === 'RNNManualBlock') {
              initialNodes = [
                { id: 'input_node', type: 'layer', position: { x: 300, y: 50 }, data: { type: 'InputNode', label: 'Input' } },
                { id: `slice_0_${Date.now()}`, type: 'layer', position: { x: 100, y: 150 }, data: { type: 'Slice', label: 'Slice 0', params: { dim: 1, index: 0 } } },
                { id: `slice_1_${Date.now()}`, type: 'layer', position: { x: 300, y: 150 }, data: { type: 'Slice', label: 'Slice 1', params: { dim: 1, index: 1 } } },
                { id: `slice_2_${Date.now()}`, type: 'layer', position: { x: 500, y: 150 }, data: { type: 'Slice', label: 'Slice 2', params: { dim: 1, index: 2 } } },
                { id: `i2h_0_${Date.now()}`, type: 'layer', position: { x: 100, y: 250 }, data: { type: 'Linear', label: 'Input to Hidden 0', params: { in_features: 4, out_features: 6 } } },
                { id: `h0_${Date.now()}`, type: 'layer', position: { x: 100, y: 350 }, data: { type: 'Tanh', label: 'Hidden 0', params: {} } },
                { id: `i2h_1_${Date.now()}`, type: 'layer', position: { x: 300, y: 250 }, data: { type: 'Linear', label: 'Input to Hidden 1', params: { in_features: 4, out_features: 6 } } },
                { id: `h2h_1_${Date.now()}`, type: 'layer', position: { x: 200, y: 350 }, data: { type: 'Linear', label: 'Hidden to Hidden 1', params: { in_features: 6, out_features: 6 } } },
                { id: `add_1_${Date.now()}`, type: 'layer', position: { x: 300, y: 450 }, data: { type: 'Add', label: 'Add 1', params: {} } },
                { id: `h1_${Date.now()}`, type: 'layer', position: { x: 300, y: 530 }, data: { type: 'Tanh', label: 'Hidden 1', params: {} } },
                { id: `i2h_2_${Date.now()}`, type: 'layer', position: { x: 500, y: 250 }, data: { type: 'Linear', label: 'Input to Hidden 2', params: { in_features: 4, out_features: 6 } } },
                { id: `h2h_2_${Date.now()}`, type: 'layer', position: { x: 400, y: 530 }, data: { type: 'Linear', label: 'Hidden to Hidden 2', params: { in_features: 6, out_features: 6 } } },
                { id: `add_2_${Date.now()}`, type: 'layer', position: { x: 500, y: 630 }, data: { type: 'Add', label: 'Add 2', params: {} } },
                { id: `h2_${Date.now()}`, type: 'layer', position: { x: 500, y: 710 }, data: { type: 'Tanh', label: 'Hidden 2', params: {} } },
                { id: `concat_h_${Date.now()}`, type: 'layer', position: { x: 300, y: 810 }, data: { type: 'Concat', label: 'Concat Hidden', params: { dim: 1 } } },
                { id: `reshape_out_${Date.now()}`, type: 'layer', position: { x: 300, y: 900 }, data: { type: 'Reshape', label: 'Reshape Out', params: { target_shape: [-1, 3, 6] } } },
                { id: 'output_node', type: 'layer', position: { x: 300, y: 990 }, data: { type: 'OutputNode', label: 'Output' } }
              ];
              initialEdges = [
                { id: `e_${Date.now()}_1`, source: 'input_node', target: initialNodes[1].id, animated: true },
                { id: `e_${Date.now()}_2`, source: 'input_node', target: initialNodes[2].id, animated: true },
                { id: `e_${Date.now()}_3`, source: 'input_node', target: initialNodes[3].id, animated: true },
                { id: `e_${Date.now()}_4`, source: initialNodes[1].id, target: initialNodes[4].id, animated: true },
                { id: `e_${Date.now()}_5`, source: initialNodes[4].id, target: initialNodes[5].id, animated: true },
                { id: `e_${Date.now()}_6`, source: initialNodes[2].id, target: initialNodes[6].id, animated: true },
                { id: `e_${Date.now()}_7`, source: initialNodes[5].id, target: initialNodes[7].id, animated: true },
                { id: `e_${Date.now()}_8`, source: initialNodes[6].id, target: initialNodes[8].id, targetHandle: 'input_0', animated: true },
                { id: `e_${Date.now()}_9`, source: initialNodes[7].id, target: initialNodes[8].id, targetHandle: 'input_1', animated: true },
                { id: `e_${Date.now()}_10`, source: initialNodes[8].id, target: initialNodes[9].id, animated: true },
                { id: `e_${Date.now()}_11`, source: initialNodes[3].id, target: initialNodes[10].id, animated: true },
                { id: `e_${Date.now()}_12`, source: initialNodes[9].id, target: initialNodes[11].id, animated: true },
                { id: `e_${Date.now()}_13`, source: initialNodes[10].id, target: initialNodes[12].id, targetHandle: 'input_0', animated: true },
                { id: `e_${Date.now()}_14`, source: initialNodes[11].id, target: initialNodes[12].id, targetHandle: 'input_1', animated: true },
                { id: `e_${Date.now()}_15`, source: initialNodes[12].id, target: initialNodes[13].id, animated: true },
                { id: `e_${Date.now()}_16`, source: initialNodes[5].id, target: initialNodes[14].id, targetHandle: 'input_0', animated: true },
                { id: `e_${Date.now()}_17`, source: initialNodes[9].id, target: initialNodes[14].id, targetHandle: 'input_1', animated: true },
                { id: `e_${Date.now()}_18`, source: initialNodes[13].id, target: initialNodes[14].id, targetHandle: 'input_2', animated: true },
                { id: `e_${Date.now()}_19`, source: initialNodes[14].id, target: initialNodes[15].id, animated: true },
                { id: `e_${Date.now()}_20`, source: initialNodes[15].id, target: 'output_node', animated: true }
              ];
            } else if (type === 'CustomAutogradManualBlock') {
              initialNodes = [
                { id: 'input_node', type: 'layer', position: { x: 250, y: 50 }, data: { type: 'InputNode', label: 'Input' } },
                { id: `custom_act_${Date.now()}`, type: 'layer', position: { x: 250, y: 150 }, data: { type: 'CustomAutograd', label: 'Custom Activation', params: { forward_code: "def forward(x):\n    return x * x", backward_code: "def backward(x, y, grad_output):\n    return grad_output * 2.0 * x" } } },
                { id: 'output_node', type: 'layer', position: { x: 250, y: 250 }, data: { type: 'OutputNode', label: 'Output' } }
              ];
              initialEdges = [
                { id: `e_${Date.now()}_1`, source: 'input_node', target: initialNodes[1].id, animated: true },
                { id: `e_${Date.now()}_2`, source: initialNodes[1].id, target: 'output_node', animated: true }
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
      get().validatePipeline();
    },

    removeNode: (id) => {
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== id),
        edges: state.edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
      }));
      get().saveActiveSubGraph();
      get().validatePipeline();
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
      get().validatePipeline();
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
      set((state) => {
        // Disallow multiple inputs on the same handle: remove any existing edge pointing to this target node & target handle
        const filteredEdges = state.edges.filter(
          (e) => !(e.target === connection.target && (e.targetHandle === connection.targetHandle || (!e.targetHandle && !connection.targetHandle)))
        );
        return {
          edges: addEdge({ ...connection, type: 'weave', animated: true }, filteredEdges)
        };
      });
      get().saveActiveSubGraph();
      get().validatePipeline();
    },

    removeEdge: (id) => {
      set((state) => ({
        edges: state.edges.filter((e) => e.id !== id)
      }));
      get().saveActiveSubGraph();
      get().validatePipeline();
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
        get().validatePipeline();
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
        get().validatePipeline();
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

      // Automatically induce parameter values from incoming node shapes
      const inducedNodes = applyParameterInduction(nodes, edges);
      let hasChange = false;
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].data.params !== inducedNodes[i].data.params) {
          hasChange = true;
          break;
        }
      }
      if (hasChange) {
        set({ nodes: inducedNodes });
        // Note: do NOT call saveActiveSubGraph here — the save is triggered by the
        // user action that caused the param change (edge connect, dataset change, etc.)
      }

      const currentNodes = get().nodes;
      const batchSize = datasetConfig?.dataloader?.batch_size || 32;
      let activeInputShape = inputShape || get().activeInputShape;
      if (!activeInputShape || (activeInputShape[1] === 3 && activeInputShape[2] === 224 && activeInputShape[3] === 224 && inferredDatasetShape)) {
        if (inferredDatasetShape) {
          activeInputShape = [batchSize, ...inferredDatasetShape];
        }
      }
      if (!activeInputShape) {
        activeInputShape = [batchSize, 3, 224, 224];
      }
      set({ activeInputShape });

      // Construct GraphConfig schema recursively
      const formattedGraph = formatGraphForEngine(currentNodes, edges, get().activeSubGraphs);
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
            // Annotate nodes with shape data using live state nodes.
            // If the engine doesn't return a shape for a node (e.g. InputNode / OutputNode
            // are virtual and absent from node_shapes), keep whatever shape is already
            // stored on the node rather than overwriting it with undefined.
            nodes: get().nodes.map((n) => ({
              ...n,
              data: {
                ...n.data,
                outputShape: shapes[n.id] ?? n.data.outputShape,
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
            // Trace back failed node if possible and label it in UI (keeping previous shapes)
            nodes: get().nodes.map((n) => {
              const nodeFailed = res.message?.includes(`'${n.id}'`) || res.message?.includes(`Evaluating '${n.id}'`);
              return {
                ...n,
                data: {
                  ...n.data,
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
      if (!get().activeProject || !get().activeSubGraph) return;

      // Debounce saving operation — read state INSIDE timeout so we always
      // save the latest snapshot, not a stale closure captured at call time.
      if (saveTimeout) clearTimeout(saveTimeout);

      saveTimeout = setTimeout(async () => {
        const { activeProject, activeSubGraph, nodes, edges, datasetConfig } = get();
        if (!activeProject || !activeSubGraph) return;
        try {
          set({ isSavingGraph: true });
          const graphJson = JSON.stringify({ nodes, edges, datasetConfig });
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

    getFormattedGraph: () => {
      const { nodes, edges, activeSubGraphs } = get();
      return formatGraphForEngine(nodes, edges, activeSubGraphs);
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
      if (config === null) {
        set({ datasetConfig: null, inferredDatasetShape: null, activeInputShape: null });
        get().saveActiveSubGraph();
        if (inferTimeout) clearTimeout(inferTimeout);
        return;
      }

      const prev = get().datasetConfig;
      // If the dataset identity changed (different source, name, or modality), clear the
      // cached shape immediately so UI shows "SHAPE UNKNOWN" and validatePipeline cannot
      // reuse stale dimensions while the new inference is pending.
      const datasetIdentityChanged =
        !prev ||
        prev.source !== config.source ||
        (config.source === 'predefined' && (prev as any).name !== (config as any).name) ||
        (config.source === 'custom' && (prev as any).modality !== (config as any).modality);

      if (datasetIdentityChanged) {
        set({ datasetConfig: config, inferredDatasetShape: null, activeInputShape: null, isInferringDatasetShape: true });
      } else {
        set({ datasetConfig: config });
      }

      get().saveActiveSubGraph();

      if (inferTimeout) clearTimeout(inferTimeout);
      inferTimeout = setTimeout(() => {
        get().inferDatasetShape();
      }, 500); // tightened from 800ms so shape updates feel snappier
    },

    setDatasetSource: (source) => {
      const current = get().datasetConfig;

      // If already on this source type, do nothing — prevents resetting the user's
      // current dataset selection when they click the same tab again.
      if (current && current.source === source) return;

      const dataloader: DataLoaderConfig = current?.dataloader || {
        batch_size: 32,
        shuffle: true,
        num_workers: 4,
        pin_memory: true,
        drop_last: false,
      };

      let config: DatasetConfig | null = null;
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
