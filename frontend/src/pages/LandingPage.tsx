import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronRight, Layers, Code2, Zap, ArrowRight,
  Workflow, Database, Play, Download, GitBranch,
  Blocks, BarChart3, Sparkles
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import ReactFlow, { Background, Handle, Position, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
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
      colorClass: 'bg-[#6C3CE1]/10 border-[#6C3CE1]/30',
      iconBg: 'bg-[#6C3CE1]/20',
      icon: <Blocks size={20} className="text-[#6C3CE1]" />,
    }
  },
  {
    id: 'w2', type: 'workflow', position: { x: 320, y: 0 },
    data: {
      step: 'Step 02',
      label: 'Configure Dataset',
      description: 'Pick from built-in datasets or bring your own folder.',
      colorClass: 'bg-[#1ABCFE]/10 border-[#1ABCFE]/30',
      iconBg: 'bg-[#1ABCFE]/20',
      icon: <Database size={20} className="text-[#1ABCFE]" />,
    }
  },
  {
    id: 'w3', type: 'workflow', position: { x: 320, y: 160 },
    data: {
      step: 'Step 03',
      label: 'Validate & Train',
      description: 'Real-time shape validation and live training metrics.',
      colorClass: 'bg-[#2DD4BF]/10 border-[#2DD4BF]/30',
      iconBg: 'bg-[#2DD4BF]/20',
      icon: <Play size={20} className="text-[#2DD4BF]" />,
    }
  },
  {
    id: 'w4', type: 'workflow', position: { x: 640, y: 80 },
    data: {
      step: 'Step 04',
      label: 'Export Code',
      description: 'PyTorch, ONNX, or TorchScript — production ready.',
      colorClass: 'bg-[#F97316]/10 border-[#F97316]/30',
      iconBg: 'bg-[#F97316]/20',
      icon: <Download size={20} className="text-[#F97316]" />,
    }
  },
];

const workflowEdges: Edge[] = [
  { id: 'we1-2', source: 'w1', target: 'w2', animated: true, style: { stroke: '#6C3CE1', strokeWidth: 2 } },
  { id: 'we1-3', source: 'w1', target: 'w3', animated: true, style: { stroke: '#6C3CE1', strokeWidth: 2 } },
  { id: 'we2-4', source: 'w2', target: 'w4', animated: true, style: { stroke: '#1ABCFE', strokeWidth: 2 } },
  { id: 'we3-4', source: 'w3', target: 'w4', animated: true, style: { stroke: '#2DD4BF', strokeWidth: 2 } },
];

/* ───────────────────────── Feature Cards Data ───────────────────────── */
const FEATURES = [
  {
    icon: <Workflow className="text-[#6C3CE1]" size={24} />,
    title: "Visual Node Editor",
    desc: "Drag-and-drop 30+ neural network layer types — Conv2d, Linear, Transformer, Attention blocks and more — onto an infinite canvas powered by React Flow."
  },
  {
    icon: <Layers className="text-[#1ABCFE]" size={24} />,
    title: "Real-Time Shape Validation",
    desc: "Automatic tensor dimension inference propagates through every node. Catch shape mismatches before you train, not after."
  },
  {
    icon: <Database className="text-[#2DD4BF]" size={24} />,
    title: "Integrated Dataset Pipeline",
    desc: "Browse built-in datasets (MNIST, CIFAR, ImageNet), configure transforms, preview samples, and auto-download — all inside the workspace."
  },
  {
    icon: <Code2 className="text-[#F97316]" size={24} />,
    title: "Multi-Format Export",
    desc: "Compile your visual graph into clean PyTorch code, export to ONNX for inference, or generate TorchScript — with a single click."
  },
  {
    icon: <BarChart3 className="text-[#EC4899]" size={24} />,
    title: "Live Training Console",
    desc: "Start, pause, and resume training runs with real-time loss & accuracy charts streamed via SSE. Compare experiments side by side."
  },
  {
    icon: <GitBranch className="text-[#A78BFA]" size={24} />,
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
    <div className="min-h-screen bg-[#0F1117] text-[#E2E8F0] selection:bg-[#6C3CE1]/30 overflow-x-hidden font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0F1117]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6C3CE1] to-[#1ABCFE]/20 flex items-center justify-center shadow-lg border border-[#6C3CE1]/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17L12 22L22 17" stroke="#1ABCFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-white font-black tracking-widest uppercase text-sm">Weave</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-[#E2E8F0]/70">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
            <a href="#samples" className="hover:text-white transition-colors">Samples</a>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {isAuthenticated ? (
              <>
                <span className="text-[#E2E8F0]/70 font-medium hidden sm:inline">
                  Welcome back, <span className="text-white font-bold">{user?.name || user?.email?.split('@')[0] || 'User'}</span>
                </span>
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="bg-[#6C3CE1] hover:bg-[#6C3CE1]/90 text-white font-bold uppercase text-xs tracking-wider h-9 px-6 rounded-lg transition-all shadow-[0_0_20px_rgba(108,60,225,0.3)]"
                >
                  Dashboard
                </Button>
              </>
            ) : (
              <>
                <button
                  onClick={handleLogin}
                  className="font-bold uppercase tracking-wider text-white hover:text-[#1ABCFE] transition-colors"
                >
                  Login
                </button>
                <Button
                  onClick={handleGetStarted}
                  className="bg-[#6C3CE1] hover:bg-[#6C3CE1]/90 text-white font-bold uppercase text-xs tracking-wider h-9 px-6 rounded-lg transition-all shadow-[0_0_20px_rgba(108,60,225,0.3)]"
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(108,60,225,0.15),transparent_50%)]" />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold tracking-wider text-[#2DD4BF] uppercase mb-8"
          >
            <Zap size={14} />
            <span>Visual Deep Learning. Direct to PyTorch.</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6"
          >
            Design the Architecture.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C3CE1] to-[#1ABCFE]">
              Ship the Code.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg md:text-xl text-[#E2E8F0]/70 mb-10 leading-relaxed font-light"
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
                className="bg-white text-[#0F1117] hover:bg-[#E2E8F0] font-black uppercase text-sm tracking-wider h-14 px-8 rounded-xl transition-all w-full sm:w-auto flex items-center gap-2"
              >
                Go to Dashboard <ChevronRight size={18} />
              </Button>
            ) : (
              <Button
                onClick={handleGetStarted}
                className="bg-white text-[#0F1117] hover:bg-[#E2E8F0] font-black uppercase text-sm tracking-wider h-14 px-8 rounded-xl transition-all w-full sm:w-auto flex items-center gap-2"
              >
                Launch Workspace <ChevronRight size={18} />
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold uppercase text-sm tracking-wider h-14 px-8 rounded-xl transition-all w-full sm:w-auto"
            >
              Explore Features
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ──────────── Features Section ──────────── */}
      <section id="features" className="py-24 bg-[#0A0C10] border-y border-white/5 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-[0.2em] text-[#1ABCFE] uppercase mb-6">
                <Sparkles size={12} />
                Platform Capabilities
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
                Everything You Need. <span className="text-[#2DD4BF]">Nothing You Don't.</span>
              </h2>
              <p className="text-[#E2E8F0]/70 max-w-2xl mx-auto">
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
                className="group bg-[#0F1117] border border-white/5 p-8 rounded-2xl hover:border-[#6C3CE1]/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(108,60,225,0.08)]"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-[#E2E8F0]/60 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── Workflow React Flow Section ──────────── */}
      <section id="workflow" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(108,60,225,0.08),transparent_60%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-[0.2em] text-[#6C3CE1] uppercase mb-6">
                <Workflow size={12} />
                How It Works
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">
                From Concept to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C3CE1] to-[#1ABCFE]">Production</span>
              </h2>
              <p className="text-[#E2E8F0]/70 max-w-2xl mx-auto text-lg">
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
            <div className="aspect-[16/7] md:aspect-[16/5] rounded-2xl bg-[#0A0C10] border border-white/10 shadow-[0_0_60px_rgba(108,60,225,0.1)] overflow-hidden">
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
                <Background color="#ffffff08" gap={24} size={1} />
              </ReactFlow>
            </div>
            {/* Glow effects */}
            <div className="absolute -top-8 -left-8 w-40 h-40 bg-[#6C3CE1]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-[#1ABCFE]/10 rounded-full blur-3xl pointer-events-none" />
          </motion.div>
        </div>
      </section>

      {/* Samples / Technical Capabilities */}
      <section id="samples" className="py-24 relative overflow-hidden bg-[#0A0C10] border-t border-white/5">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(ellipse_at_center,rgba(26,188,254,0.1),transparent_60%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-6">
              A Premium IDE for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1ABCFE] to-[#2DD4BF]">Machine Learning.</span>
            </h2>
            <p className="text-[#E2E8F0]/70 text-lg mb-8 leading-relaxed">
              Design complex neural graphs in a technical editor built for advanced ML engineers and researchers. Weave provides a sophisticated node-based environment for layer connection and module export.
            </p>
            <ul className="space-y-4 mb-8">
              {[
                "Visual Neural Network Architecture Design",
                "Real-time Dimension Validation",
                "Advanced Layer Graphs",
                "Instant PyTorch Code Compilation"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-semibold text-[#E2E8F0]">
                  <div className="w-5 h-5 rounded-full bg-[#1ABCFE]/10 flex items-center justify-center text-[#1ABCFE]">
                    <ChevronRight size={14} />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Button
              onClick={handleGetStarted}
              className="bg-transparent border border-[#1ABCFE]/30 text-[#1ABCFE] hover:bg-[#1ABCFE]/10 font-bold uppercase text-xs tracking-wider h-12 px-6 rounded-lg transition-all flex items-center gap-2"
            >
              View Examples <ArrowRight size={16} />
            </Button>
          </div>
          <div className="lg:w-1/2 w-full relative">
            <div className="aspect-video rounded-2xl bg-[#0A0C10] border border-white/10 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-10 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <div className="ml-4 text-[10px] text-white/30 font-mono">resnet50_architecture.py</div>
              </div>
              <div className="p-6 pt-16 font-mono text-xs sm:text-sm text-[#E2E8F0]/80 leading-relaxed overflow-hidden h-full">
                <span className="text-[#6C3CE1]">import</span> torch<br />
                <span className="text-[#6C3CE1]">import</span> torch.nn <span className="text-[#6C3CE1]">as</span> nn<br /><br />
                <span className="text-[#6C3CE1]">class</span> <span className="text-[#F97316]">ResNetGraph</span>(nn.Module):<br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#6C3CE1]">def</span> <span className="text-[#1ABCFE]">__init__</span>(self):<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-[#2DD4BF]">super</span>().__init__()<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;self.conv1 = nn.Conv2d(<span className="text-[#2DD4BF]">3</span>, <span className="text-[#2DD4BF]">64</span>, kernel_size=<span className="text-[#2DD4BF]">7</span>, stride=<span className="text-[#2DD4BF]">2</span>)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;self.bn1 = nn.BatchNorm2d(<span className="text-[#2DD4BF]">64</span>)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;self.relu = nn.ReLU(inplace=<span className="text-[#F97316]">True</span>)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-white/30"># Compiled from Weave Node Editor</span><br />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F1117] py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#6C3CE1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-white/50 text-xs font-bold uppercase tracking-widest">Weave © 2026</span>
          </div>
          <div className="flex gap-6 text-xs font-semibold text-white/30 uppercase tracking-wider">
            <a href="#" className="hover:text-white transition-colors">Documentation</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
