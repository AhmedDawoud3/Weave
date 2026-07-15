import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Cpu, Trash2, Calendar, FileText, ChevronRight, X, Sparkles, LogOut, Sun, Moon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWeaveStore } from '../store/useWeaveStore';
import { Project } from '../types';
import { TEMPLATES } from '../config/templates';
import { toast } from '../components/ui/toaster';
import { Skeleton } from '../components/ui/skeleton';
import { useTheme } from '../context/ThemeContext';
import { CompareRunsModal } from '../components/training/CompareRunsModal';

const getMockRunsForProject = (projectName: string) => {
  if (projectName.toLowerCase().includes('resnet') || projectName.toLowerCase().includes('cifar')) {
    return [
      { id: 'run-resnet-cifar10-a', metrics: { loss: [0.65, 0.45, 0.32, 0.21, 0.15], accuracy: [0.72, 0.81, 0.88, 0.92, 0.94], epochs: [1, 2, 3, 4, 5] }, accuracy: '94.2%' },
      { id: 'run-resnet-cifar10-b', metrics: { loss: [0.72, 0.58, 0.45, 0.33, 0.25], accuracy: [0.68, 0.77, 0.84, 0.88, 0.91], epochs: [1, 2, 3, 4, 5] }, accuracy: '91.0%' }
    ];
  }
  return [
    { id: `run-${projectName.toLowerCase().replace(/\s+/g, '-')}-a`, metrics: { loss: [0.35, 0.18, 0.11, 0.08, 0.05], accuracy: [0.89, 0.95, 0.97, 0.98, 0.99], epochs: [1, 2, 3, 4, 5] }, accuracy: '99.0%' },
    { id: `run-${projectName.toLowerCase().replace(/\s+/g, '-')}-b`, metrics: { loss: [0.48, 0.32, 0.24, 0.18, 0.12], accuracy: [0.82, 0.89, 0.92, 0.94, 0.96], epochs: [1, 2, 3, 4, 5] }, accuracy: '96.2%' }
  ];
};

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
    logout,
    user
  } = useWeaveStore();

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    document.title = "Weave | Dashboard";
  }, []);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importingTemplate, setImportingTemplate] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [selectedRunsToCompare, setSelectedRunsToCompare] = useState<Array<{ id: string; projectName: string; metrics: any }>>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const handleToggleRunSelection = (run: any, projectName: string) => {
    setSelectedRunsToCompare(prev => {
      const exists = prev.some(r => r.id === run.id);
      if (exists) {
        return prev.filter(r => r.id !== run.id);
      } else {
        if (prev.length >= 3) {
          toast.error("You can compare up to 3 runs at a time.");
          return prev;
        }
        return [...prev, { id: run.id, projectName, metrics: run.metrics }];
      }
    });
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProject(newProjectName, newProjectDesc);
      setNewProjectName('');
      setNewProjectDesc('');
      setShowCreateModal(false);
      onOpenProject?.();
      toast.success("Sandbox initialized successfully!");
      const createdProj = useWeaveStore.getState().activeProject;
      if (createdProj) {
        navigate(`/project/${createdProj.id}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create project. Please try again.");
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
      toast.success(`${template.name} template imported successfully!`);
      const importedProj = useWeaveStore.getState().activeProject;
      if (importedProj) {
        navigate(`/project/${importedProj.id}`);
      }
    } catch (err: any) {
      console.error("Failed to import template:", err);
      toast.error(err.message || "Failed to import template. Please try again.");
    } finally {
      setImportingTemplate(null);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id);
      toast.success("Project deleted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete project.");
    }
  };

  // Helper to get a deterministic gradient based on string value
  const getDeterministicGradient = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      'from-weave-violet/20 to-weave-blue/10',
      'from-weave-blue/20 to-weave-teal/10',
      'from-weave-teal/20 to-weave-amber/10',
      'from-weave-violet/20 to-weave-amber/10'
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen w-full bg-background text-foreground p-6 md:p-12 lg:p-16 overflow-y-auto relative font-sans"
    >
      {/* Background Decorative Blob */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[radial-gradient(circle_at_top_right,var(--primary),transparent_60%)] opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 pb-8 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <img src="/logo_icon.svg" alt="Weave Icon" className="h-4 w-4 animate-pulse" />
              <p className="text-primary font-black tracking-widest text-[10px] uppercase">Neural Design Studio</p>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-2 uppercase text-foreground">
              Workspace Hub
            </h1>
          </div>

          <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-start">
            {/* User Profile Info */}
            {user && (
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-foreground uppercase">{user.name || user.email.split('@')[0]}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            )}

            {/* Theme Toggle Button */}
            <Button
              variant="outline"
              onClick={() => setTheme(theme === 'weave-dark' ? 'weave-light' : 'weave-dark')}
              className="border-border bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground rounded-xl h-10 w-10 flex items-center justify-center cursor-pointer p-0"
              title="Toggle Theme"
            >
              {theme === 'weave-dark' ? <Sun size={16} /> : <Moon size={16} />}
            </Button>

            {/* Logout */}
            <Button
              variant="outline"
              onClick={logout}
              className="border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 hover:text-red-300 rounded-xl h-10 px-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">LOGOUT</span>
            </Button>
          </div>
        </div>

        {/* Dashboard Actions Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h2 className="text-xl font-bold uppercase tracking-wide text-foreground">Your Models</h2>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-primary-foreground hover:brightness-110 active:scale-95 font-black px-6 h-12 rounded-xl transition-all shadow-glow cursor-pointer flex items-center gap-2 text-xs uppercase tracking-wider self-stretch sm:self-auto justify-center"
          >
            <Plus size={18}/> New Architecture
          </Button>
        </div>

        {/* Project List / Skeletons */}
        {isLoadingProjects ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-card border border-border rounded-2xl p-6 h-[320px] flex flex-col justify-between overflow-hidden">
                <div className="space-y-4">
                  <div className="h-24 bg-muted/40 rounded-xl relative overflow-hidden animate-shimmer" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="h-80 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-6 p-8 bg-card backdrop-blur-sm">
            <div className="w-14 h-14 rounded-full bg-foreground/5 flex items-center justify-center border border-border">
              <Cpu size={24} className="text-primary/40" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-foreground">No Projects Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">Create your first deep learning project to start visually constructing and shape-validating network pipelines.</p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary/10 border border-primary/20 hover:bg-primary text-white hover:text-primary-foreground font-black px-6 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
            >
              New Architecture
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="bg-card border border-border rounded-2xl group hover:border-primary/40 hover:shadow-glow transition-all flex flex-col h-[420px] justify-between relative overflow-hidden">
                  {/* Thumbnail area like Figma */}
                  <div className={`h-24 w-full bg-gradient-to-tr ${getDeterministicGradient(p.name)} border-b border-border flex items-center justify-center relative overflow-hidden rounded-t-2xl`}>
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-20" />
                    
                    {/* Floating Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(p);
                      }}
                      className="absolute top-3 right-3 p-2 bg-background/60 hover:bg-red-500/20 text-[#475569] hover:text-red-500 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100 z-20"
                      title="Delete Project"
                    >
                      <Trash2 size={14} />
                    </button>

                    {/* Small visual neural design vector */}
                    <svg className="w-20 h-10 text-foreground/10" viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="15" cy="25" r="4" fill="var(--primary)" fillOpacity="0.4" />
                      <line x1="15" y1="25" x2="50" y2="10" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <line x1="15" y1="25" x2="50" y2="40" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <circle cx="50" cy="10" r="4" fill="var(--secondary)" fillOpacity="0.4" />
                      <circle cx="50" cy="40" r="4" fill="var(--secondary)" fillOpacity="0.4" />
                      <line x1="50" y1="10" x2="85" y2="25" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <line x1="50" y1="40" x2="85" y2="25" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <circle cx="85" cy="25" r="4" fill="var(--accent)" fillOpacity="0.4" />
                    </svg>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold mb-1.5 group-hover:text-primary transition-colors uppercase leading-snug line-clamp-1 text-foreground">
                        {p.name}
                      </h3>
                      
                      <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                        {p.description || "No description provided."}
                      </p>

                      {/* Recent Runs checklist for comparison */}
                      <div className="mt-3 bg-white/5 border border-white/5 rounded-xl p-2.5">
                        <p className="text-[8px] font-black uppercase text-slate-500 tracking-wider mb-2">Runs History (Select to compare)</p>
                        <div className="space-y-1.5">
                          {getMockRunsForProject(p.name).map((run) => {
                            const isChecked = selectedRunsToCompare.some(r => r.id === run.id);
                            return (
                              <label key={run.id} className="flex items-center gap-2 text-[10px] text-slate-300 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleRunSelection(run, p.name)}
                                  className="w-3 h-3 accent-weave-violet rounded border-white/10"
                                />
                                <span className="truncate">{run.id} ({run.accuracy})</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4 mt-2">
                      <div className="grid grid-cols-2 gap-4 text-[10px] font-bold text-muted-foreground uppercase mb-4">
                        <div className="flex items-center gap-1">
                          <FileText size={12} className="text-primary/50" />
                          <span>{p.subGraphCount} Subgraphs</span>
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <Calendar size={12} className="text-primary/50" />
                          <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleOpenProject(p)}
                        className="w-full bg-foreground/5 border border-border text-white rounded-xl text-xs font-bold h-10 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        OPEN IN STUDIO <ChevronRight size={14} />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Examples Gallery */}
        <div className="h-px bg-border my-12" />
        
        <div className="mb-12">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-primary animate-pulse" />
            <p className="text-primary font-black tracking-widest text-[10px] uppercase">Interactive Neural Templates</p>
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-2 uppercase text-foreground mb-6">
            Import Example Architectures
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEMPLATES.map((tpl) => (
              <Card key={tpl.name} className="bg-card border border-border rounded-2xl flex flex-col justify-between h-[300px] hover:border-primary/40 hover:shadow-glow transition-all relative overflow-hidden">
                <div className={`h-20 w-full bg-gradient-to-tr ${getDeterministicGradient(tpl.name)} border-b border-border flex items-center justify-center relative overflow-hidden rounded-t-2xl`}>
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-20" />
                  <Sparkles size={20} className="text-primary animate-pulse" />
                </div>
                
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold mb-1 uppercase text-foreground leading-tight line-clamp-1">
                      {tpl.name}
                    </h3>
                    <p className="text-xs text-muted-foreground/80 mb-2 line-clamp-2 min-h-[32px]">
                      {tpl.description}
                    </p>
                  </div>
                  
                  <div>
                    <div className="inline-block bg-foreground/5 border border-border rounded-md px-2 py-0.5 text-[10px] font-bold text-primary font-mono mb-4 uppercase tracking-wider">
                      INPUT: [{tpl.inputShape.join(', ')}]
                    </div>
                    
                    <Button
                      onClick={() => handleImportTemplate(tpl)}
                      disabled={importingTemplate !== null}
                      className="w-full bg-foreground/5 border border-border text-white rounded-xl text-xs font-bold h-10 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all flex items-center justify-center gap-1 cursor-pointer relative z-10"
                    >
                      {importingTemplate === tpl.name ? 'IMPORTING...' : 'IMPORT & OPEN'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CREATE PROJECT DIALOG MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full relative z-10 shadow-2xl"
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground rounded-lg transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              <h2 className="text-xl font-black mb-1 uppercase text-foreground tracking-wide">New Model Sandbox</h2>
              <p className="text-xs text-muted-foreground mb-6">Initialize a neural model environment to map subgraphs and stream training metrics.</p>

              <form onSubmit={handleCreateProject} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Architecture Name</label>
                  <Input
                    placeholder="e.g. ResNet Image Classifier"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    required
                    className="bg-background/50 border-border h-12 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Description</label>
                  <textarea
                    placeholder="Brief details about datasets, shape layers, or targeted compile metrics..."
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full h-24 bg-background/50 border border-border p-3 text-sm rounded-xl outline-none focus:border-primary transition-colors text-foreground resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 h-12 border-border hover:bg-foreground/5 text-muted-foreground hover:text-foreground rounded-xl text-xs uppercase tracking-wider font-bold cursor-pointer"
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-12 bg-primary text-primary-foreground font-black uppercase rounded-xl transition-all shadow-glow text-xs uppercase tracking-wider cursor-pointer"
                  >
                    {isSubmitting ? 'INITIALIZING...' : 'START BUILDING'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {projectToDelete && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setProjectToDelete(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full relative z-10 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-foreground uppercase tracking-wider mb-2">Delete Project</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete <span className="text-foreground font-bold">{projectToDelete.name}</span>? This action is permanent and cannot be undone.
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setProjectToDelete(null)}
                  className="flex-1 h-12 border-border hover:bg-foreground/5 text-muted-foreground hover:text-foreground rounded-xl text-xs uppercase tracking-wider font-bold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleDeleteProject(projectToDelete.id);
                    setProjectToDelete(null);
                  }}
                  className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-black uppercase rounded-xl transition-all shadow-lg text-xs uppercase tracking-wider cursor-pointer"
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Compare Button */}
      <AnimatePresence>
        {selectedRunsToCompare.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-card/90 backdrop-blur-xl border border-primary/20 shadow-2xl rounded-2xl p-4 flex items-center gap-4"
          >
            <span className="text-xs font-bold text-slate-300 uppercase">{selectedRunsToCompare.length} runs selected</span>
            <Button
              onClick={() => setIsCompareModalOpen(true)}
              className="bg-weave-violet hover:bg-weave-violet/90 text-white rounded-xl text-xs font-bold h-10 px-6 uppercase tracking-wider cursor-pointer"
            >
              Compare Runs
            </Button>
            <button
              onClick={() => setSelectedRunsToCompare([])}
              className="text-xs text-slate-400 hover:text-white uppercase font-bold"
            >
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CompareRunsModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        selectedRuns={selectedRunsToCompare}
      />
    </motion.div>
  );
}
