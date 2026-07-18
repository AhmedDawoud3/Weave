import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Layers, BookOpen } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useWeaveStore } from '../store/useWeaveStore';
import { TEMPLATES } from '../config/templates';
import { toast } from '../components/ui/toaster';

export function GalleryPage() {
  const navigate = useNavigate();
  const { isAuthenticated, importTemplate } = useWeaveStore();
  const [deployingTemplate, setDeployingTemplate] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'architecture' | 'paper'>('architecture');

  const filteredTemplates = TEMPLATES.filter((t) => t.category === activeCategory);

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
            <span className="font-semibold text-sm text-weave-violet">Weave</span>
          </div>
        </header>

        <section className="text-center mb-20">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-6"
          >
            Model <span className="text-gradient-purple">gallery</span>
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

        {/* Category Pill Switcher */}
        <div className="flex justify-center mb-16">
          <div className="bg-foreground/5 border border-border p-1 rounded-xl flex gap-1">
            <button
              onClick={() => setActiveCategory('architecture')}
              className={`px-5 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all duration-200 cursor-pointer ${activeCategory === 'architecture'
                ? 'bg-weave-violet text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                }`}
            >
              <Layers size={13} />
              Architectures
            </button>
            <button
              onClick={() => setActiveCategory('paper')}
              className={`px-5 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all duration-200 cursor-pointer ${activeCategory === 'paper'
                ? 'bg-weave-violet text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                }`}
            >
              <BookOpen size={13} />
              Famous papers
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {filteredTemplates.map((tmpl, idx) => (
            <motion.div
              key={tmpl.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="bg-card p-7 rounded-2xl flex flex-col justify-between items-start text-left relative border border-border"
            >
              <div className="w-full">
                <div className="flex justify-between items-start gap-4 mb-2">
                  <h3 className="text-xl font-bold text-foreground leading-snug">{tmpl.name}</h3>
                  <span className="text-[11px] font-mono bg-foreground/5 border border-border px-2.5 py-0.5 rounded-full shrink-0 text-muted-foreground">
                    Input: {tmpl.inputShape.join('x')}
                  </span>
                </div>

                {tmpl.category === 'paper' && (
                  <div className="flex items-center gap-3 mb-4 text-xs">
                    <span className="text-weave-violet font-medium font-mono px-2 py-0.5 bg-weave-violet/10 border border-weave-violet/20 rounded text-[11px]">
                      {tmpl.citation}
                    </span>
                    {tmpl.paperUrl && (
                      <a
                        href={tmpl.paperUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-weave-blue hover:text-weave-blue/80 hover:underline font-medium flex items-center gap-1 transition-colors text-xs"
                      >
                        Read paper →
                      </a>
                    )}
                  </div>
                )}

                <p className="text-sm text-slate-400 leading-relaxed mb-8 min-h-[48px]">{tmpl.description}</p>

                {/* Stats / Node layout summary */}
                <div className="grid grid-cols-3 gap-4 mb-8 bg-foreground/5 p-4 rounded-xl border border-border w-full">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Nodes</p>
                    <p className="text-lg font-bold text-weave-violet">{tmpl.nodes.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Connections</p>
                    <p className="text-lg font-bold text-weave-blue">{tmpl.edges.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Primary type</p>
                    <p className="text-xs font-semibold text-weave-teal truncate pt-1">
                      {tmpl.nodes.find(n => n.type !== 'InputNode' && n.type !== 'OutputNode')?.type || 'Linear'}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => handleDeploy(tmpl)}
                disabled={deployingTemplate === tmpl.name}
                className="w-full py-5 bg-foreground/5 hover:bg-weave-violet hover:text-white hover:border-transparent text-foreground border border-border rounded-lg font-medium text-xs flex justify-center items-center gap-2 transition-all duration-200 cursor-pointer"
              >
                {deployingTemplate === tmpl.name ? (
                  <span>Instantiating...</span>
                ) : (
                  <>
                    <span>Deploy to workspace</span>
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