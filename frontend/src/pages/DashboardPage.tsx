import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Cpu, Trash2, Calendar, FileText, ChevronRight, X, Sparkles, LogOut, Sun, Moon, 
  Shield, Activity, Layers, Database, Search, ArrowUpDown, Play, ExternalLink
} from 'lucide-react';
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

const getTemplateDomainTag = (templateName: string, category: string) => {
  if (category === 'paper') return { label: 'Paper / Research', colorClass: 'bg-weave-violet/10 text-weave-violet border-weave-violet/20' };
  const lower = templateName.toLowerCase();
  if (lower.includes('resnet') || lower.includes('cnn') || lower.includes('conv') || lower.includes('vision')) {
    return { label: 'Vision (CV)', colorClass: 'bg-weave-blue/10 text-weave-blue border-weave-blue/20' };
  }
  if (lower.includes('transformer') || lower.includes('bert') || lower.includes('gpt') || lower.includes('attention')) {
    return { label: 'Transformer / LLM', colorClass: 'bg-weave-teal/10 text-weave-teal border-weave-teal/20' };
  }
  if (lower.includes('rnn') || lower.includes('lstm') || lower.includes('seq')) {
    return { label: 'Sequence / Audio', colorClass: 'bg-weave-amber/10 text-weave-amber border-weave-amber/20' };
  }
  return { label: 'General Architecture', colorClass: 'bg-muted text-muted-foreground border-border' };
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
    document.title = "Weave | Workspace Hub";
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importingTemplate, setImportingTemplate] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [selectedRunsToCompare, setSelectedRunsToCompare] = useState<Array<{ id: string; projectName: string; metrics: any }>>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
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

  const filteredProjects = useMemo(() => {
    let list = [...projects];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
    }
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [projects, searchQuery, sortBy]);

  const totalSubgraphs = useMemo(() => {
    return projects.reduce((acc, p) => acc + (p.subGraphCount || 0), 0);
  }, [projects]);

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

  const logoSrc = theme === 'weave-light' ? '/logo_horizontal_light.svg' : '/logo_horizontal_dark.svg';

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen w-full bg-background text-foreground overflow-y-auto font-sans"
    >
      {/* Navigation Header */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center">
              <img src={logoSrc} alt="Weave Logo" className="h-7 w-auto" />
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <Link to="/gallery" className="hover:text-foreground transition-colors">Gallery</Link>
              <Link to="/features" className="hover:text-foreground transition-colors">Features</Link>
              <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(theme === 'weave-dark' ? 'weave-light' : 'weave-dark')}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-lg hover:bg-foreground/5 border border-transparent hover:border-border h-9 w-9 flex items-center justify-center"
              aria-label="Toggle Theme"
            >
              {theme === 'weave-dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {user?.roles?.includes('Admin') && (
              <Button
                variant="outline"
                onClick={() => navigate('/admin')}
                className="border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg h-9 px-3 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              >
                <Shield size={14} />
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}

            {user && (
              <div className="flex items-center gap-3 pl-2 border-l border-border">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-semibold text-xs text-primary">
                  {(user.name || user.email)[0].toUpperCase()}
                </div>
                <div className="hidden lg:block text-left leading-tight">
                  <p className="text-xs font-medium text-foreground truncate max-w-[120px]">{user.name || user.email.split('@')[0]}</p>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{user.email}</p>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              onClick={logout}
              className="border-border hover:bg-foreground/5 text-muted-foreground hover:text-foreground rounded-lg h-9 px-3 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Sign out"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        
        {/* Top Banner / Hero Overview */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-xs font-medium text-primary uppercase tracking-wide">Neural Network Workspace</span>
            <h1 className="text-3xl font-bold text-foreground tracking-tight mt-1">
              Workspace hub
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Construct neural network graphs, validate tensor dimensions, and run live PyTorch compilations.
            </p>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-5 h-11 rounded-lg transition-all cursor-pointer flex items-center gap-2 text-sm shadow-sm"
          >
            <Plus size={18}/> New architecture
          </Button>
        </div>

        {/* Stats Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Total models</span>
              <Cpu size={16} className="text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">{projects.length}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Saved architecture graphs</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Subgraphs & modules</span>
              <Layers size={16} className="text-weave-blue" />
            </div>
            <p className="text-3xl font-bold text-foreground">{totalSubgraphs}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Nested modular blocks</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Built-in benchmarks</span>
              <Database size={16} className="text-weave-teal" />
            </div>
            <p className="text-3xl font-bold text-foreground">8+</p>
            <p className="text-[11px] text-muted-foreground mt-1">Pre-configured datasets</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Max run accuracy</span>
              <Activity size={16} className="text-weave-amber" />
            </div>
            <p className="text-3xl font-bold text-foreground">99.0%</p>
            <p className="text-[11px] text-muted-foreground mt-1">Top validation metric</p>
          </div>
        </div>

        {/* Toolbar: Search, Sort, Filter */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-foreground">Your models</h2>
              <span className="text-xs bg-foreground/5 border border-border text-muted-foreground px-2.5 py-0.5 rounded-full font-medium">
                {filteredProjects.length}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <input
                  type="text"
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-background border border-border pl-9 pr-3 h-9 rounded-lg text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 bg-background border border-border px-2.5 h-9 rounded-lg text-xs text-muted-foreground shrink-0">
                <ArrowUpDown size={13} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
                  className="bg-transparent text-foreground font-medium focus:outline-none cursor-pointer"
                >
                  <option value="date">Latest modified</option>
                  <option value="name">Name A–Z</option>
                </select>
              </div>
            </div>
          </div>

          {/* Project List / Skeletons */}
          {isLoadingProjects ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-card border border-border rounded-xl p-6 h-[340px] flex flex-col justify-between overflow-hidden">
                  <div className="space-y-4">
                    <div className="h-24 bg-muted/40 rounded-lg relative overflow-hidden animate-shimmer" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="h-72 border border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-4 p-8 bg-card text-center">
              <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center border border-border text-muted-foreground">
                <Cpu size={22} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {searchQuery ? "No matching models found" : "No projects found"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {searchQuery ? "Try refining your search query." : "Create your first deep learning project to start visually constructing and validating network pipelines."}
                </p>
              </div>
              {!searchQuery && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-5 h-9 rounded-lg transition-all text-xs cursor-pointer"
                >
                  New architecture
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((p, idx) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Card className="bg-card border border-border rounded-xl group hover:border-primary/40 transition-all flex flex-col h-[400px] justify-between relative overflow-hidden shadow-sm">
                    {/* Visual Vector Thumbnail Preview */}
                    <div className={`h-24 w-full bg-gradient-to-tr ${getDeterministicGradient(p.name)} border-b border-border flex items-center justify-center relative overflow-hidden rounded-t-xl`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(p);
                        }}
                        className="absolute top-3 right-3 p-1.5 bg-background/70 hover:bg-red-500/20 text-muted-foreground hover:text-red-500 rounded-md transition-all cursor-pointer opacity-0 group-hover:opacity-100 z-20"
                        title="Delete Project"
                      >
                        <Trash2 size={14} />
                      </button>

                      <svg className="w-24 h-12 text-foreground/15" viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="15" cy="25" r="4" fill="var(--weave-violet)" fillOpacity="0.5" />
                        <line x1="15" y1="25" x2="50" y2="10" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                        <line x1="15" y1="25" x2="50" y2="40" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                        <circle cx="50" cy="10" r="4" fill="var(--weave-blue)" fillOpacity="0.5" />
                        <circle cx="50" cy="40" r="4" fill="var(--weave-blue)" fillOpacity="0.5" />
                        <line x1="50" y1="10" x2="85" y2="25" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                        <line x1="50" y1="40" x2="85" y2="25" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                        <circle cx="85" cy="25" r="4" fill="var(--weave-teal)" fillOpacity="0.5" />
                      </svg>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-semibold mb-1 group-hover:text-primary transition-colors leading-snug line-clamp-1 text-foreground">
                          {p.name}
                        </h3>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                          {p.description || "No description provided."}
                        </p>

                        {/* Recent Runs checklist */}
                        <div className="mt-3 bg-foreground/5 border border-border rounded-lg p-2.5">
                          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Runs history (select to compare)</p>
                          <div className="space-y-1">
                            {getMockRunsForProject(p.name).map((run) => {
                              const isChecked = selectedRunsToCompare.some(r => r.id === run.id);
                              return (
                                <label key={run.id} className="flex items-center gap-2 text-[11px] text-foreground/80 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleRunSelection(run, p.name)}
                                    className="w-3 h-3 accent-primary rounded border-border"
                                  />
                                  <span className="truncate flex-1 font-mono text-[10px]">{run.id}</span>
                                  <span className="text-[10px] font-semibold text-weave-teal">{run.accuracy}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-border pt-4 mt-2">
                        <div className="grid grid-cols-2 gap-4 text-xs font-medium text-muted-foreground mb-3">
                          <div className="flex items-center gap-1.5">
                            <FileText size={13} className="text-primary/70" />
                            <span>{p.subGraphCount} modules</span>
                          </div>
                          <div className="flex items-center gap-1.5 justify-end">
                            <Calendar size={13} className="text-primary/70" />
                            <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleOpenProject(p)}
                          className="w-full bg-foreground/5 border border-border text-foreground rounded-lg text-xs font-medium h-9 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          Open in studio <ChevronRight size={14} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Curated Templates Showcase Store */}
        <div className="pt-6 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary" />
                <span className="text-xs font-medium text-primary">Curated Neural Templates</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight mt-1 text-foreground">
                Import benchmark architectures
              </h2>
            </div>
            <Link to="/gallery">
              <Button variant="outline" className="border-border text-xs font-medium h-9 px-4 rounded-lg flex items-center gap-1.5">
                View all in gallery <ExternalLink size={13} />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEMPLATES.slice(0, 6).map((tpl) => {
              const tag = getTemplateDomainTag(tpl.name, tpl.category);
              return (
                <Card key={tpl.name} className="bg-card border border-border rounded-xl flex flex-col justify-between h-[310px] hover:border-primary/30 transition-all shadow-sm relative overflow-hidden">
                  <div className={`h-16 w-full bg-gradient-to-tr ${getDeterministicGradient(tpl.name)} border-b border-border flex items-center justify-between px-5 relative overflow-hidden rounded-t-xl`}>
                    <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${tag.colorClass}`}>
                      {tag.label}
                    </span>
                    <Sparkles size={16} className="text-primary" />
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-semibold mb-1 text-foreground leading-snug line-clamp-1">
                        {tpl.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2 min-h-[32px]">
                        {tpl.description}
                      </p>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center bg-foreground/5 border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground font-mono mb-4">
                        <span>Shape: [{tpl.inputShape.join(', ')}]</span>
                        <span className="font-semibold text-foreground">{tpl.nodes.length} nodes</span>
                      </div>
                      
                      <Button
                        onClick={() => handleImportTemplate(tpl)}
                        disabled={importingTemplate !== null}
                        className="w-full bg-foreground/5 border border-border text-foreground rounded-lg text-xs font-medium h-9 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {importingTemplate === tpl.name ? (
                          <span>Importing...</span>
                        ) : (
                          <>
                            <span>Deploy to workspace</span>
                            <Play size={12} fill="currentColor" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
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
              className="bg-card border border-border rounded-xl p-6 max-w-lg w-full relative z-10 shadow-xl"
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute right-4 top-4 p-1.5 text-muted-foreground hover:text-foreground rounded-md transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              <h2 className="text-xl font-bold text-foreground">New model sandbox</h2>
              <p className="text-xs text-muted-foreground mb-6">Initialize a neural model environment to map subgraphs and stream training metrics.</p>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Architecture Name</label>
                  <Input
                    placeholder="e.g. ResNet Image Classifier"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    required
                    className="bg-background border-border h-11 rounded-lg text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Description</label>
                  <textarea
                    placeholder="Brief details about datasets, shape layers, or targeted compile metrics..."
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full h-24 bg-background border border-border p-3 text-sm rounded-lg outline-none focus:border-primary transition-colors text-foreground resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 h-11 border-border hover:bg-foreground/5 text-muted-foreground hover:text-foreground rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-11 bg-primary text-primary-foreground font-medium rounded-lg transition-all text-xs cursor-pointer"
                  >
                    {isSubmitting ? 'Initializing...' : 'Start building'}
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
              className="bg-card border border-border rounded-xl p-6 max-w-md w-full relative z-10 shadow-xl"
            >
              <h3 className="text-lg font-bold text-foreground mb-2">Delete project</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete <span className="text-foreground font-semibold">{projectToDelete.name}</span>? This action is permanent and cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setProjectToDelete(null)}
                  className="flex-1 h-10 border-border hover:bg-foreground/5 text-muted-foreground hover:text-foreground rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleDeleteProject(projectToDelete.id);
                    setProjectToDelete(null);
                  }}
                  className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all text-xs cursor-pointer"
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
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-card border border-border shadow-xl rounded-xl p-3.5 flex items-center gap-4"
          >
            <span className="text-xs font-medium text-foreground">{selectedRunsToCompare.length} runs selected</span>
            <Button
              onClick={() => setIsCompareModalOpen(true)}
              className="bg-weave-violet hover:bg-weave-violet/90 text-white rounded-lg text-xs font-medium h-9 px-5 cursor-pointer"
            >
              Compare runs
            </Button>
            <button
              onClick={() => setSelectedRunsToCompare([])}
              className="text-xs text-muted-foreground hover:text-foreground font-medium"
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
