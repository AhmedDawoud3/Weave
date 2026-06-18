import { create } from 'zustand';
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow';
import { api } from '../services/api';
import { Project, SubGraph, NodeData, LayerType, LayerParams } from '../types';

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
  connectEdges: (connection: Connection) => void;
  validatePipeline: (inputShape: number[]) => Promise<void>;
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
  // Templates blocks default empty params
  ResidualBlock: {},
  TransformerEncoder: {},
  MultiHeadAttention: {},
  ConvBNReLU: {},
  BottleneckBlock: {}
};

export const useWeaveStore = create<WeaveState>((set, get) => {
  // Setup debounce variable for autosaving
  let saveTimeout: NodeJS.Timeout | null = null;

  return {
    // Auth State
    token: localStorage.getItem('weave_token'),
    isAuthenticated: !!localStorage.getItem('weave_token'),
    user: null,
    authError: null,
    isAuthenticating: false,

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
          activeSubGraph: subgraphs.length > 0 ? subgraphs[0] : null
        });

        if (subgraphs.length > 0) {
          get().selectSubGraph(subgraphs[0]);
        } else {
          // Clear canvas
          set({ nodes: [], edges: [] });
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
        const initialGraphJson = JSON.stringify({ nodes: [], edges: [] });
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

    addNode: (type, position) => {
      const newNode: Node<NodeData> = {
        id: `${type.toLowerCase()}_${Date.now()}`,
        type: 'layer',
        position,
        data: {
          type,
          label: `${type} Layer`,
          params: { ...DEFAULT_PARAMS[type] }
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

    connectEdges: (connection) => {
      set((state) => ({
        edges: addEdge({ ...connection, animated: true }, state.edges)
      }));
      get().saveActiveSubGraph();
      get().validatePipeline([32, 3, 224, 224]);
    },

    validatePipeline: async (inputShape) => {
      const { nodes, edges } = get();
      if (nodes.length === 0) {
        set({ validationStatus: 'idle', validationMessage: null, nodeShapes: {} });
        return;
      }

      // Construct GraphConfig schema
      // Nodes list mapping from reactflow to python schema format
      const formattedNodes = nodes.map((n) => ({
        id: n.id,
        type: n.data.type,
        params: n.data.params
      }));

      // Edges mapping
      const formattedEdges = edges.map((e) => ({
        source: e.source,
        target: e.target
      }));

      try {
        const res = await api.engine.validatePipeline({
          graph: {
            nodes: formattedNodes,
            edges: formattedEdges
          },
          input_shape: inputShape
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

      set({ isSavingGraph: true });

      // Debounce saving operation
      if (saveTimeout) clearTimeout(saveTimeout);

      saveTimeout = setTimeout(async () => {
        try {
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
      const { nodes, edges } = get();
      const formattedNodes = nodes.map((n) => ({
        id: n.id,
        type: n.data.type,
        params: n.data.params
      }));
      const formattedEdges = edges.map((e) => ({
        source: e.source,
        target: e.target
      }));

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
    }
  };
});
