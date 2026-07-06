import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Cpu, Trash2, Calendar, FileText, ChevronRight, X, Loader2, Sparkles, LogOut, Palette, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWeaveStore } from '../store/useWeaveStore';
import { useTheme, Theme } from '../context/ThemeContext';
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
    logout,
    user
  } = useWeaveStore();

  const { theme, setTheme } = useTheme();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importingTemplate, setImportingTemplate] = useState<string | null>(null);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

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

  const themesList: Array<{ id: Theme; name: string; color: string }> = [
    { id: 'cyberpunk', name: 'Cyberpunk Neon', color: 'bg-[#6C3CE1]' },
    { id: 'weave-dark', name: 'Weave Dark', color: 'bg-[#6366f1]' },
    { id: 'midnight-slate', name: 'Midnight Slate', color: 'bg-[#6b7280]' },
    { id: 'dracula', name: 'Dracula', color: 'bg-[#bd93f9]' },
  ];

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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 pb-8 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-primary animate-pulse" />
              <p className="text-primary font-black tracking-widest text-[9px] uppercase">Neural Design Studio</p>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-2 uppercase text-white">
              Workspace Hub
            </h1>
          </div>

          <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-start">
            {/* User Profile Info */}
            {user && (
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-white uppercase">{user.name || user.email.split('@')[0]}</p>
                <p className="text-[10px] text-muted-foreground">{user.email}</p>
              </div>
            )}

            {/* Theme Selector */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                className="border-white/10 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl h-10 px-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                <Palette size={16} />
                <span>Theme</span>
              </Button>

              <AnimatePresence>
                {showThemeDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowThemeDropdown(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-[#0c0d14] border border-white/5 rounded-xl shadow-2xl p-2 z-50"
                    >
                      {themesList.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setTheme(t.id);
                            setShowThemeDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs uppercase tracking-wider font-bold hover:bg-white/5 transition-all text-white cursor-pointer`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded-full ${t.color} border border-white/10`} />
                            <span>{t.name}</span>
                          </div>
                          {theme === t.id && <Check size={14} className="text-[#2DD4BF]" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

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
          <h2 className="text-xl font-bold uppercase tracking-wide text-white">Your Models</h2>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-primary-foreground hover:brightness-110 active:scale-95 font-black px-6 h-12 rounded-xl transition-all shadow-[0_0_30px_rgba(108,60,225,0.2)] cursor-pointer flex items-center gap-2 text-xs uppercase tracking-wider self-stretch sm:self-auto justify-center"
          >
            <Plus size={18}/> New Architecture
          </Button>
        </div>

        {/* Project List */}
        {isLoadingProjects ? (
          <div className="h-64 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-xs uppercase tracking-widest font-bold">Retrieving neural configurations...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="h-80 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-6 p-8 bg-[#0c0d14]/40 backdrop-blur-sm">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Cpu size={24} className="text-primary/40" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">No Projects Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">Create your first deep learning project to start visually constructing and shape-validating network pipelines.</p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary/10 border border-primary/20 hover:bg-primary text-white hover:text-primary-foreground font-black px-6 rounded-xl transition-all text-xs uppercase tracking-wider"
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
                <Card className="bg-[#0c0d14]/40 border border-white/5 p-6 rounded-2xl group hover:border-primary/40 hover:shadow-[0_4px_30px_rgba(108,60,225,0.05)] transition-all flex flex-col h-full justify-between relative overflow-hidden">
                  <div>
                    {/* Vector Grid Overlay in card background */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-30" />

                    <div className="flex justify-between items-start mb-4 relative z-10">
                      {/* Mini Neural Vector Graph Drawing */}
                      <svg className="w-24 h-12 text-[#94a3b8]/20" viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="15" cy="25" r="4" fill="var(--primary)" fillOpacity="0.4" />
                        <line x1="15" y1="25" x2="50" y2="10" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        <line x1="15" y1="25" x2="50" y2="40" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        <circle cx="50" cy="10" r="4" fill="var(--secondary)" fillOpacity="0.4" />
                        <circle cx="50" cy="40" r="4" fill="var(--secondary)" fillOpacity="0.4" />
                        <line x1="50" y1="10" x2="85" y2="25" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        <line x1="50" y1="40" x2="85" y2="25" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        <circle cx="85" cy="25" r="4" fill="var(--accent)" fillOpacity="0.4" />
                      </svg>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete ${p.name}?`)) {
                            deleteProject(p.id);
                          }
                        }}
                        className="p-2 text-[#475569] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                        title="Delete Project"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors uppercase leading-snug line-clamp-1 text-white relative z-10">
                      {p.name}
                    </h3>
                    
                    <p className="text-xs text-muted-foreground mb-6 line-clamp-2 min-h-[32px] relative z-10">
                      {p.description || "No description provided."}
                    </p>
                  </div>

                  <div className="border-t border-white/5 pt-4 mt-2 relative z-10">
                    <div className="grid grid-cols-2 gap-4 text-[9px] font-bold text-muted-foreground uppercase mb-4">
                      <div className="flex items-center gap-1">
                        <FileText size={11} className="text-primary/50" />
                        <span>{p.subGraphCount} Subgraphs</span>
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        <Calendar size={11} className="text-primary/50" />
                        <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleOpenProject(p)}
                      className="w-full bg-white/5 border border-white/5 text-white rounded-xl text-xs font-bold h-10 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all flex items-center justify-center gap-1 cursor-pointer"
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
        <div className="h-px bg-white/5 my-12" />
        
        <div className="mb-12">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-primary" />
            <p className="text-primary font-black tracking-widest text-[9px] uppercase">Interactive Neural Templates</p>
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-2 uppercase text-white mb-6">
            Import Example Architectures
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEMPLATES.map((tpl) => (
              <Card key={tpl.name} className="bg-[#0c0d14]/40 border border-white/5 p-6 rounded-2xl flex flex-col justify-between h-full hover:border-primary/40 hover:shadow-[0_4px_30px_rgba(108,60,225,0.05)] transition-all relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-30" />
                
                <div className="relative z-10">
                  <div className="w-9 h-9 bg-primary/5 rounded-xl flex items-center justify-center border border-primary/10 mb-4 text-primary">
                    <Sparkles size={16} />
                  </div>
                  <h3 className="text-base font-bold mb-1.5 uppercase text-white leading-tight">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-muted-foreground/80 mb-4 line-clamp-3 min-h-[48px]">
                    {tpl.description}
                  </p>
                  <div className="inline-block bg-white/5 border border-white/10 rounded-md px-2.5 py-0.5 text-[9px] font-bold text-primary font-mono mb-6 uppercase tracking-wider">
                    INPUT: [{tpl.inputShape.join(', ')}]
                  </div>
                </div>
                
                <Button
                  onClick={() => handleImportTemplate(tpl)}
                  disabled={importingTemplate !== null}
                  className="w-full bg-white/5 border border-white/5 text-white rounded-xl text-xs font-bold h-10 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all flex items-center justify-center gap-1 cursor-pointer relative z-10"
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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-6 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[480px] bg-[#0c0d14] border border-white/10 p-8 rounded-2xl shadow-2xl relative"
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-white rounded-lg transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              <h2 className="text-xl font-black mb-1 uppercase text-white tracking-wide">New Model Sandbox</h2>
              <p className="text-xs text-muted-foreground mb-6">Initialize a neural model environment to map subgraphs and stream training metrics.</p>

              <form onSubmit={handleCreateProject} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Architecture Name</label>
                  <Input
                    placeholder="e.g. ResNet Image Classifier"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    required
                    className="bg-background/50 border-white/5 h-12 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Description</label>
                  <textarea
                    placeholder="Brief details about datasets, shape layers, or targeted compile metrics..."
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full h-24 bg-background/50 border border-white/5 p-3 text-sm rounded-xl outline-none focus:border-primary transition-colors text-white resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 h-12 border-white/5 hover:bg-white/5 text-muted-foreground hover:text-white rounded-xl text-xs uppercase tracking-wider font-bold cursor-pointer"
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-12 bg-primary text-primary-foreground font-black uppercase rounded-xl transition-all shadow-lg text-xs uppercase tracking-wider cursor-pointer"
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
