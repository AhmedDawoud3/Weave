import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Cpu, Trash2, Calendar, FileText, ChevronRight, X, Loader2, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWeaveStore } from '../store/useWeaveStore';
import { Project } from '../types';
import { TEMPLATES } from '../config/templates';

interface DashboardPageProps {
  onOpenProject?: () => void;
}

export function DashboardPage({ onOpenProject }: DashboardPageProps) {
  const navigate = useNavigate();
  const {
    projects,
    isLoadingProjects,
    fetchProjects,
    createProject,
    deleteProject,
    selectProject,
    importTemplate,
    logout
  } = useWeaveStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importingTemplate, setImportingTemplate] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsSubmitting(true);
    try {
      await createProject(newProjectName, newProjectDesc);
      setNewProjectName('');
      setNewProjectDesc('');
      setShowCreateModal(false);
      onOpenProject?.();
      const createdProj = useWeaveStore.getState().activeProject;
      if (createdProj) {
        navigate(`/project/${createdProj.id}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenProject = async (project: Project) => {
    await selectProject(project);
    onOpenProject?.();
    navigate(`/project/${project.id}`);
  };

  const handleImportTemplate = async (template: any) => {
    setImportingTemplate(template.name);
    try {
      await importTemplate(template);
      onOpenProject?.();
      const importedProj = useWeaveStore.getState().activeProject;
      if (importedProj) {
        navigate(`/project/${importedProj.id}`);
      }
    } catch (err: any) {
      console.error("Failed to import template:", err);
      alert(err.message || "Failed to import template. Please try again.");
    } finally {
      setImportingTemplate(null);
    }
  };

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen w-full bg-[#070709] text-white p-10 md:p-20 overflow-y-auto relative"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(64,211,182,0.05),transparent_40%)]" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#40d3b6]" />
              <p className="text-[#40d3b6] font-extrabold tracking-widest text-[10px] uppercase">Neural Design Studio</p>
            </div>
            <h1 className="text-4xl font-black tracking-tight mt-2 uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              Workspace Projects
            </h1>
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-[#40d3b6] to-[#1e8fd3] hover:brightness-110 active:scale-95 text-black font-extrabold px-6 h-12 rounded-xl transition-all shadow-lg"
            >
              <Plus className="mr-2" size={18}/> CREATE ARCHITECTURE
            </Button>
            <Button
              variant="outline"
              onClick={logout}
              className="border-primary/20 hover:bg-primary/10 text-muted-foreground hover:text-white h-12 px-6 rounded-xl transition-all"
            >
              LOGOUT
            </Button>
          </div>
        </div>

        {isLoadingProjects ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-xs uppercase tracking-widest font-bold">Retrieving neural configurations...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="h-96 border border-dashed border-primary/10 rounded-2xl flex flex-col items-center justify-center gap-6 p-8 bg-card/10 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
              <Cpu size={28} className="text-primary/40" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold">No Projects Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">Create your first deep learning project to start visually constructing and shape-validating network pipelines.</p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary/20 hover:bg-primary/30 border border-primary/30 text-white font-extrabold px-6 rounded-xl transition-all"
            >
              New Architecture
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="bg-card/25 border border-primary/10 p-8 rounded-2xl group hover:border-primary/40 hover:shadow-[0_4px_30px_rgba(30,143,211,0.05)] transition-all flex flex-col h-full justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center border border-primary/10 group-hover:bg-primary/15 transition-all">
                        <Cpu className="text-[#40d3b6]" size={22} />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProject(p.id);
                        }}
                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete Project"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <h3 className="text-xl font-bold mb-4 group-hover:text-primary transition-colors uppercase leading-snug line-clamp-1">
                      {p.name}
                    </h3>
                    
                    <p className="text-xs text-muted-foreground mb-6 line-clamp-2 min-h-[32px]">
                      {p.description || "No description provided."}
                    </p>
                  </div>

                  <div className="border-t border-primary/5 pt-6 mt-4">
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-muted-foreground uppercase mb-6">
                      <div className="flex items-center gap-1.5">
                        <FileText size={12} className="text-primary/50" />
                        <span>{p.subGraphCount} Subgraphs</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <Calendar size={12} className="text-primary/50" />
                        <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleOpenProject(p)}
                      className="w-full bg-primary/10 border border-primary/20 text-white rounded-xl text-xs font-extrabold h-11 hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-1.5"
                    >
                      OPEN IN STUDIO <ChevronRight size={14} />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Examples Gallery */}
        <div className="h-px bg-primary/10 my-16" />
        
        <div className="mb-12">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-indigo-400" />
            <p className="text-indigo-400 font-extrabold tracking-widest text-[10px] uppercase">Interactive Neural Templates</p>
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-2 uppercase text-white mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            Import Example Architectures
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {TEMPLATES.map((tpl) => (
              <Card key={tpl.name} className="bg-card/25 border border-indigo-500/10 p-6 rounded-2xl flex flex-col justify-between h-full hover:border-indigo-500/35 hover:shadow-[0_4px_30px_rgba(99,102,241,0.05)] transition-all">
                <div>
                  <div className="w-10 h-10 bg-indigo-500/5 rounded-xl flex items-center justify-center border border-indigo-500/15 mb-4 text-indigo-400">
                    <Sparkles size={18} />
                  </div>
                  <h3 className="text-lg font-bold mb-2 uppercase text-indigo-300 leading-tight">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-muted-foreground/80 mb-4 line-clamp-3 min-h-[48px]">
                    {tpl.description}
                  </p>
                  <div className="inline-block bg-indigo-500/10 border border-indigo-500/20 rounded-md px-2 py-0.5 text-[9px] font-black text-indigo-400 font-mono mb-6">
                    INPUT: [{tpl.inputShape.join(', ')}]
                  </div>
                </div>
                
                <Button
                  onClick={() => handleImportTemplate(tpl)}
                  disabled={importingTemplate !== null}
                  className="w-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs font-extrabold h-11 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {importingTemplate === tpl.name ? 'IMPORTING...' : 'IMPORT & OPEN'}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CREATE PROJECT DIALOG MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[500px] bg-card/85 backdrop-blur-2xl border border-primary/20 p-8 rounded-2xl shadow-2xl relative"
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-white rounded-lg transition-all"
              >
                <X size={18} />
              </button>

              <h2 className="text-2xl font-black mb-1 uppercase text-white tracking-wide">New Model Sandbox</h2>
              <p className="text-xs text-muted-foreground mb-6">Initialize a neural model environment to map subgraphs and stream training metrics.</p>

              <form onSubmit={handleCreateProject} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Architecture Name</label>
                  <Input
                    placeholder="e.g. ResNet Image Classifier"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    required
                    className="bg-background/50 border-primary/10 h-12 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Description</label>
                  <textarea
                    placeholder="Brief details about datasets, shape layers, or targeted compile metrics..."
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full h-24 bg-background/50 border border-primary/10 p-3 text-sm rounded-xl outline-none focus:border-primary transition-colors text-white resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 h-12 border-primary/10 hover:bg-primary/10 text-muted-foreground hover:text-white rounded-xl"
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-12 bg-gradient-to-r from-[#40d3b6] to-[#1e8fd3] text-black font-extrabold uppercase rounded-xl transition-all shadow-lg"
                  >
                    {isSubmitting ? 'INITIALIZING...' : 'START BUILDING'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
