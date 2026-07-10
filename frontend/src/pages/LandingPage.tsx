import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronRight, Layers, Code2, Zap, ArrowRight,
  Workflow, Database, Play, Download, GitBranch,
  Blocks, BarChart3, Sparkles
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ReactFlow, Background, Handle, Position, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback } from 'react';
import { useWeaveStore } from '../store/useWeaveStore';
import { GridBackground } from '../components/ui/GridBackground';

/* ─────────────── Features Workflow React Flow (large section) ─────────────── */
const WorkflowNode = ({ data }: { data: any }) => (
  <div className={`group relative px-5 py-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] cursor-default ${data.colorClass}`}
    style={{ minWidth: 200 }}
  >
    <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-white/80 !border-2 !border-white/30" />
    <div className="flex items-center gap-3 mb-2">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.iconBg}`}>
        {data.icon}
      </div>
      <div>
        <div className="text-[9px] font-black tracking-[0.2em] uppercase opacity-50">
          {data.step}
        </div>
        <div className="text-sm font-bold text-white leading-tight">
          {data.label}
        </div>
      </div>
    </div>
    <p className="text-[11px] text-white/50 leading-relaxed pl-[52px]">
      {data.description}
    </p>
    <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-white/80 !border-2 !border-white/30" />
  </div>
);

const workflowNodeTypes = { workflow: WorkflowNode };

const workflowNodes: Node[] = [
  {
    id: 'w1', type: 'workflow', position: { x: 0, y: 80 },
    data: {
      step: 'Step 01',
      label: 'Design Architecture',
      description: 'Drag & drop 30+ layer types on an interactive canvas.',
      colorClass: 'bg-weave-violet/10 border-weave-violet/30',
      iconBg: 'bg-weave-violet/20',
      icon: <Blocks size={20} className="text-weave-violet" />,
    }
  },
  {
    id: 'w2', type: 'workflow', position: { x: 320, y: 0 },
    data: {
      step: 'Step 02',
      label: 'Configure Dataset',
      description: 'Pick from built-in datasets or bring your own folder.',
      colorClass: 'bg-weave-blue/10 border-weave-blue/30',
      iconBg: 'bg-weave-blue/20',
      icon: <Database size={20} className="text-weave-blue" />,
    }
  },
  {
    id: 'w3', type: 'workflow', position: { x: 320, y: 160 },
    data: {
      step: 'Step 03',
      label: 'Validate & Train',
      description: 'Real-time shape validation and live training metrics.',
      colorClass: 'bg-weave-teal/10 border-weave-teal/30',
      iconBg: 'bg-weave-teal/20',
      icon: <Play size={20} className="text-weave-teal" />,
    }
  },
  {
    id: 'w4', type: 'workflow', position: { x: 640, y: 80 },
    data: {
      step: 'Step 04',
      label: 'Export Code',
      description: 'PyTorch, ONNX, or TorchScript — production ready.',
      colorClass: 'bg-weave-amber/10 border-weave-amber/30',
      iconBg: 'bg-weave-amber/20',
      icon: <Download size={20} className="text-weave-amber" />,
    }
  },
];

const workflowEdges: Edge[] = [
  { id: 'we1-2', source: 'w1', target: 'w2', animated: true, style: { stroke: 'var(--weave-violet)', strokeWidth: 2 } },
  { id: 'we1-3', source: 'w1', target: 'w3', animated: true, style: { stroke: 'var(--weave-violet)', strokeWidth: 2 } },
  { id: 'we2-4', source: 'w2', target: 'w4', animated: true, style: { stroke: 'var(--weave-blue)', strokeWidth: 2 } },
  { id: 'we3-4', source: 'w3', target: 'w4', animated: true, style: { stroke: 'var(--weave-teal)', strokeWidth: 2 } },
];

/* ───────────────────────── Feature Cards Data ───────────────────────── */
const FEATURES = [
  {
    icon: <Workflow className="text-weave-violet" size={24} />,
    title: "Visual Node Editor",
    desc: "Drag-and-drop 30+ neural network layer types — Conv2d, Linear, Transformer, Attention blocks and more — onto an infinite canvas powered by React Flow."
  },
  {
    icon: <Layers className="text-weave-blue" size={24} />,
    title: "Real-Time Shape Validation",
    desc: "Automatic tensor dimension inference propagates through every node. Catch shape mismatches before you train, not after."
  },
  {
    icon: <Database className="text-weave-teal" size={24} />,
    title: "Integrated Dataset Pipeline",
    desc: "Browse built-in datasets (MNIST, CIFAR, ImageNet), configure transforms, preview samples, and auto-download — all inside the workspace."
  },
  {
    icon: <Code2 className="text-weave-amber" size={24} />,
    title: "Multi-Format Export",
    desc: "Compile your visual graph into clean PyTorch code, export to ONNX for inference, or generate TorchScript — with a single click."
  },
  {
    icon: <BarChart3 className="text-weave-teal" size={24} />,
    title: "Live Training Console",
    desc: "Start, pause, and resume training runs with real-time loss & accuracy charts streamed via SSE. Compare experiments side by side."
  },
  {
    icon: <GitBranch className="text-weave-violet" size={24} />,
    title: "Composable Sub-Graphs",
    desc: "Nest Residual Blocks, Transformer Encoders, and custom autograd layers as reusable modules. Navigate in and out like a file system."
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useWeaveStore();

  const handleLogin = () => {
    navigate('/login');
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/signin');
    }
  };

  // Prevent React Flow from being interactive (read-only for the landing page)
  const noOp = useCallback(() => {}, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-weave-violet/30 overflow-x-hidden font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-weave-violet to-weave-blue/20 flex items-center justify-center shadow-lg border border-weave-violet/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="var(--weave-teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17L12 22L22 17" stroke="var(--weave-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="var(--weave-teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-white font-black tracking-widest uppercase text-sm">Weave</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
            <a href="#samples" className="hover:text-white transition-colors">Samples</a>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {isAuthenticated ? (
              <>
                <span className="text-muted-foreground font-medium hidden sm:inline">
                  Welcome back, <span className="text-white font-bold">{user?.name || user?.email?.split('@')[0] || 'User'}</span>
                </span>
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase text-xs tracking-wider h-9 px-6 rounded-lg transition-all shadow-glow"
                >
                  Dashboard
                </Button>
              </>
            ) : (
              <>
                <button
                  onClick={handleLogin}
                  className="font-bold uppercase tracking-wider text-white hover:text-weave-blue transition-colors cursor-pointer"
                >
                  Login
                </button>
                <Button
                  onClick={handleGetStarted}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase text-xs tracking-wider h-9 px-6 rounded-lg transition-all shadow-glow"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <GridBackground />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(108,60,225,0.12),transparent_50%)]" />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-xs font-semibold tracking-wider text-weave-teal uppercase mb-8"
          >
            <Zap size={14} />
            <span>Visual Deep Learning. Direct to PyTorch.</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-7xl font-black text-white tracking-tight mb-6"
          >
            Design the Architecture.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-weave-violet to-weave-blue">
              Ship the Code.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl mx-auto text-base md:text-xl text-muted-foreground mb-10 leading-relaxed font-light"
          >
            Weave is a developer-first platform for ML practitioners who want to visually design neural network architectures while retaining full engineering control and production-level code quality.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {isAuthenticated ? (
              <Button
                onClick={() => navigate('/dashboard')}
                className="bg-white text-background hover:bg-zinc-200 font-black uppercase text-sm tracking-wider h-14 px-8 rounded-xl transition-all w-full sm:w-auto flex items-center justify-center gap-2"
              >
                Go to Dashboard <ChevronRight size={18} />
              </Button>
            ) : (
              <Button
                onClick={handleGetStarted}
                className="bg-white text-background hover:bg-zinc-200 font-black uppercase text-sm tracking-wider h-14 px-8 rounded-xl transition-all w-full sm:w-auto flex items-center justify-center gap-2"
              >
                Launch Workspace <ChevronRight size={18} />
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-border bg-white/5 hover:bg-white/10 text-white font-bold uppercase text-sm tracking-wider h-14 px-8 rounded-xl transition-all w-full sm:w-auto"
            >
              Explore Features
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-background-alt border-y border-border relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-[10px] font-bold tracking-[0.2em] text-weave-blue uppercase mb-6">
                <Sparkles size={12} />
                Platform Capabilities
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
                Everything You Need. <span className="text-weave-teal">Nothing You Don't.</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From visual architecture design to production export — Weave covers the entire deep learning workflow without sacrificing engineering control.
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group bg-card border border-border p-8 rounded-2xl hover:border-weave-violet/30 transition-all duration-300 hover:shadow-glow"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(108,60,225,0.06),transparent_60%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border text-[10px] font-bold tracking-[0.2em] text-weave-violet uppercase mb-6">
                <Workflow size={12} />
                How It Works
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">
                From Concept to <span className="text-transparent bg-clip-text bg-gradient-to-r from-weave-violet to-weave-blue">Production</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
                Four steps. One workspace. Zero boilerplate.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            {/* Mobile Workflow List */}
            <div className="md:hidden space-y-6">
              {workflowNodes.map((node: any) => (
                <div
                  key={node.id}
                  className={`px-5 py-4 rounded-2xl border backdrop-blur-xl transition-all duration-300 ${node.data.colorClass}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${node.data.iconBg}`}>
                      {node.data.icon}
                    </div>
                    <div>
                      <div className="text-[9px] font-black tracking-[0.2em] uppercase opacity-50">
                        {node.data.step}
                      </div>
                      <div className="text-sm font-bold text-white leading-tight">
                        {node.data.label}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed pl-[52px]">
                    {node.data.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop ReactFlow Workflow */}
            <div className="hidden md:block aspect-[16/5] rounded-2xl bg-background-alt border border-border shadow-glow overflow-hidden">
              <ReactFlow
                nodes={workflowNodes}
                edges={workflowEdges}
                nodeTypes={workflowNodeTypes}
                onNodesChange={noOp}
                onEdgesChange={noOp}
                onConnect={noOp}
                fitView
                fitViewOptions={{ padding: 0.4 }}
                proOptions={{ hideAttribution: true }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnDrag={false}
                zoomOnScroll={false}
                zoomOnPinch={false}
                zoomOnDoubleClick={false}
                preventScrolling={false}
              >
                <Background color="#ffffff05" gap={24} size={1} />
              </ReactFlow>
            </div>
            
            {/* Glow effects */}
            <div className="absolute -top-8 -left-8 w-40 h-40 bg-weave-violet/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-weave-blue/10 rounded-full blur-3xl pointer-events-none" />
          </motion.div>
        </div>
      </section>

      {/* Samples Section */}
      <section id="samples" className="py-24 relative overflow-hidden bg-background-alt border-t border-border">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(ellipse_at_center,rgba(26,188,254,0.06),transparent_60%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-6">
              A Premium IDE for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-weave-blue to-weave-teal">Machine Learning.</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Design complex neural graphs in a technical editor built for advanced ML engineers and researchers. Weave provides a sophisticated node-based environment for layer connection and module export.
            </p>
            <ul className="space-y-4 mb-8">
              {[
                "Visual Neural Network Architecture Design",
                "Real-time Dimension Validation",
                "Advanced Layer Graphs",
                "Instant PyTorch Code Compilation"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-semibold text-foreground">
                  <div className="w-5 h-5 rounded-full bg-weave-blue/10 flex items-center justify-center text-weave-blue">
                    <ChevronRight size={14} />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Button
              onClick={handleGetStarted}
              className="bg-transparent border border-weave-blue/30 text-weave-blue hover:bg-weave-blue/10 font-bold uppercase text-xs tracking-wider h-12 px-6 rounded-lg transition-all flex items-center gap-2"
            >
              View Examples <ArrowRight size={16} />
            </Button>
          </div>
          <div className="lg:w-1/2 w-full relative">
            <div className="aspect-video rounded-2xl bg-background-alt border border-border shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-10 bg-muted border-b border-border flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <div className="ml-4 text-[10px] text-muted-foreground/30 font-mono">resnet50_architecture.py</div>
              </div>
              <div className="p-6 pt-16 font-mono text-xs sm:text-sm text-muted-foreground leading-relaxed overflow-hidden h-full">
                <span className="text-weave-violet">import</span> torch<br />
                <span className="text-weave-violet">import</span> torch.nn <span className="text-weave-violet">as</span> nn<br /><br />
                <span className="text-weave-violet">class</span> <span className="text-weave-amber">ResNetGraph</span>(nn.Module):<br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-weave-violet">def</span> <span className="text-weave-blue">__init__</span>(self):<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-weave-teal">super</span>().__init__()<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;self.conv1 = nn.Conv2d(<span className="text-weave-teal">3</span>, <span className="text-weave-teal">64</span>, kernel_size=<span className="text-weave-teal">7</span>, stride=<span className="text-weave-teal">2</span>)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;self.bn1 = nn.BatchNorm2d(<span className="text-weave-teal">64</span>)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;self.relu = nn.ReLU(inplace=<span className="text-weave-amber">True</span>)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground/30"># Compiled from Weave Node Editor</span><br />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="var(--weave-violet)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Weave © 2026</span>
          </div>
          <div className="flex gap-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <a href="/docs" className="hover:text-white transition-colors">Documentation</a>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
