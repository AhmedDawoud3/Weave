import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useWeaveStore } from '../store/useWeaveStore';
import { TEMPLATES } from '../config/templates';
import { toast } from '../components/ui/toaster';

export function GalleryPage() {
  const navigate = useNavigate();
  const { isAuthenticated, importTemplate } = useWeaveStore();
  const [deployingTemplate, setDeployingTemplate] = useState<string | null>(null);

  const handleDeploy = async (template: any) => {
    if (!isAuthenticated) {
      toast.error("Authentication required. Please sign in to deploy templates.");
      navigate('/login');
      return;
    }

    setDeployingTemplate(template.name);
    try {
      await importTemplate(template);
      toast.success(`${template.name} deployed successfully!`);
      const storeState = useWeaveStore.getState();
      if (storeState.activeProject) {
        navigate(`/project/${storeState.activeProject.id}`);
      }
    } catch (err: any) {
      console.error("Deploy failed:", err);
      toast.error(err.message || "Failed to deploy template.");
    } finally {
      setDeployingTemplate(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0F1117] text-slate-100 py-12 px-6 md:px-12 relative overflow-hidden font-sans">
      {/* Background radial glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,rgba(108,60,225,0.07),transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,rgba(26,188,254,0.07),transparent_60%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex justify-between items-center mb-16">
          <Link to="/" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo_icon.svg" alt="Logo" className="w-6 h-6" />
            <span className="font-black tracking-widest text-xs uppercase text-weave-violet">Weave Engine</span>
          </div>
        </header>

        <section className="text-center mb-20">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black tracking-tight mb-6 uppercase"
          >
            Model <span className="text-gradient-purple">Gallery</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            Deploy industry-standard model architectures onto your design canvas in one click.
          </motion.p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {TEMPLATES.map((tmpl, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="glass-panel p-8 rounded-3xl flex flex-col justify-between items-start text-left relative"
            >
              <div className="w-full">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <h3 className="text-2xl font-black text-slate-100 uppercase tracking-tight leading-none">{tmpl.name}</h3>
                  <span className="text-[10px] font-mono tracking-wider bg-white/5 border border-white/10 px-2.5 py-1 rounded-full uppercase shrink-0 text-slate-400">
                    Input: {tmpl.inputShape.join('x')}
                  </span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-8 min-h-[48px]">{tmpl.description}</p>
                
                {/* Stats / Node layout summary */}
                <div className="grid grid-cols-3 gap-4 mb-8 bg-white/5 p-4 rounded-xl border border-white/5 w-full">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Nodes</p>
                    <p className="text-lg font-black text-weave-violet">{tmpl.nodes.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Connections</p>
                    <p className="text-lg font-black text-weave-blue">{tmpl.edges.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Primary Type</p>
                    <p className="text-xs font-bold text-weave-teal truncate pt-1 uppercase">
                      {tmpl.nodes.find(n => n.type !== 'InputNode' && n.type !== 'OutputNode')?.type || 'Linear'}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => handleDeploy(tmpl)}
                disabled={deployingTemplate === tmpl.name}
                className="w-full py-6 bg-white/5 hover:bg-weave-violet hover:text-white hover:border-transparent text-slate-300 border border-white/10 rounded-2xl font-bold uppercase tracking-wider text-xs flex justify-center items-center gap-2 transition-all duration-300"
              >
                {deployingTemplate === tmpl.name ? (
                  <span>Instantiating...</span>
                ) : (
                  <>
                    <span>Deploy to Workspace</span>
                    <Play size={12} fill="currentColor" />
                  </>
                )}
              </Button>
            </motion.div>
          ))}
        </section>
      </div>
    </div>
  );
}
