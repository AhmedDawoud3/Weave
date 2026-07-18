import { motion } from 'framer-motion';
import { ArrowLeft, Cpu, Database, Activity, Code, Settings, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function FeaturesPage() {
  const features = [
    {
      icon: <Cpu className="w-8 h-8 text-weave-violet" />,
      title: "Visual NN Editor",
      desc: "Drag-and-drop 30+ custom neural network layers on an infinite grid. Configure parameters visually and let the compiler validate connections."
    },
    {
      icon: <Zap className="w-8 h-8 text-weave-blue" />,
      title: "Live Shape Inference",
      desc: "Infer tensor shapes automatically. Our backend calculates and overlays output shapes block-by-block, highlighting size mismatches."
    },
    {
      icon: <Database className="w-8 h-8 text-weave-teal" />,
      title: "Flexible Datasets",
      desc: "Connect preloaded benchmarks (MNIST, CIFAR-10) or point Weave to custom dataset folder locations with automated scanner utilities."
    },
    {
      icon: <Activity className="w-8 h-8 text-weave-amber" />,
      title: "Real-time Training",
      desc: "Stream loss curves, learning rate changes, and validation statistics over Server-Sent Events (SSE) directly from our execution server."
    },
    {
      icon: <Code className="w-8 h-8 text-weave-violet" />,
      title: "Production Exports",
      desc: "Export compile-ready models to target formats: standard PyTorch python scripts, ONNX model archives, or TorchScript binaries."
    },
    {
      icon: <Settings className="w-8 h-8 text-weave-blue" />,
      title: "BPE Tokenizer Studio",
      desc: "Train custom Byte-Pair Encoding tokenizers on local datasets, inspect the vocabulary matrix, and test encoding/decoding interactively."
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#0F1117] text-slate-100 py-12 px-6 md:px-12 relative overflow-hidden font-sans">
      {/* Decorative glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,rgba(108,60,225,0.08),transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,rgba(26,188,254,0.08),transparent_60%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex justify-between items-center mb-16">
          <Link to="/" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo_icon.svg" alt="Logo" className="w-6 h-6 animate-pulse" />
            <span className="font-semibold text-sm text-weave-violet">Weave</span>
          </div>
        </header>

        <section className="text-center mb-20">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-6"
          >
            Engineering <span className="text-gradient-purple">Intelligence</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            Explore the core building blocks that make Weave the fastest visual deep learning design workspace.
          </motion.p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {features.map((feat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-panel glass-panel-interactive p-6 rounded-2xl flex flex-col items-start text-left"
            >
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 mb-6">
                {feat.icon}
              </div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">{feat.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </section>

        <footer className="glass-panel p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-2">Ready to compile your first model?</h4>
            <p className="text-sm text-muted-foreground">Initialize a workspace sandbox and deploy neural layouts immediately.</p>
          </div>
          <Link to="/login">
            <Button size="lg" className="bg-weave-violet hover:bg-weave-violet/90 text-white rounded-lg px-8 font-medium text-sm">
              Start Building
            </Button>
          </Link>
        </footer>
      </div>
    </div>
  );
}
