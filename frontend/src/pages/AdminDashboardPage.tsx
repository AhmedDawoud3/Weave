import React, { useState, useEffect } from 'react';
import { Shield, Users, CreditCard, LayoutTemplate, Activity, Trash2, Edit } from 'lucide-react';
import { api } from '../services/api';

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [pricingPlans, setPricingPlans] = useState<any[]>([]);
  const [galleryItems, setGalleryItems] = useState<any[]>([]);

  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [pricingFormData, setPricingFormData] = useState({
    name: '',
    description: '',
    monthlyPrice: 0,
    maxProjectsCount: 1,
    isPopular: false,
    isActive: true
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'overview') {
        setStats(await api.admin.getStats());
        setProjects(await api.admin.getProjects());
      } else if (activeTab === 'users') {
        setUsers(await api.admin.getUsers());
      } else if (activeTab === 'pricing') {
        setPricingPlans(await api.admin.getPricingPlans());
      } else if (activeTab === 'gallery') {
        setGalleryItems(await api.admin.getGalleryItems());
      }
    } catch (err) {
      console.error("Failed to load data", err);
    }
  };

  const toggleUserRole = async (userId: string, currentlyAdmin: boolean) => {
    try {
      await api.admin.setUserRole(userId, !currentlyAdmin);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to change role");
    }
  };

  const toggleUserSuspension = async (userId: string, currentlySuspended: boolean) => {
    try {
      await api.admin.toggleSuspension(userId, !currentlySuspended);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to toggle suspension");
    }
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this user and all their projects?")) return;
    try {
      await api.admin.deleteUser(userId);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to delete user");
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await api.projects.delete(projectId);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to delete project");
    }
  };

  const openProject = (projectId: string) => {
    window.open(`/project/${projectId}`, '_blank');
  };

  const openPricingModal = (plan?: any) => {
    if (plan) {
      setEditingPlanId(plan.id);
      setPricingFormData({
        name: plan.name,
        description: plan.description || '',
        monthlyPrice: plan.monthlyPrice,
        maxProjectsCount: plan.maxProjectsCount,
        isPopular: plan.isPopular,
        isActive: plan.isActive
      });
    } else {
      setEditingPlanId(null);
      setPricingFormData({ name: '', description: '', monthlyPrice: 0, maxProjectsCount: 1, isPopular: false, isActive: true });
    }
    setIsPricingModalOpen(true);
  };

  const closePricingModal = () => setIsPricingModalOpen(false);

  const handlePricingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlanId) {
        await api.admin.updatePricingPlan(editingPlanId, pricingFormData);
      } else {
        await api.admin.createPricingPlan(pricingFormData);
      }
      setIsPricingModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to save pricing plan");
    }
  };

  const handleDeletePricingPlan = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this pricing plan?")) return;
    try {
      await api.admin.deletePricingPlan(id);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete pricing plan");
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground pt-16 font-sans">
      {/* Sidebar */}
      <div className="w-64 border-r border-border p-4 flex flex-col gap-2 bg-card z-10 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <h2 className="text-xl font-black mb-6 flex items-center gap-2 uppercase tracking-tight mt-2 px-2">
          <Shield className="text-primary" /> Admin Panel
        </h2>
        
        <TabButton icon={<Activity />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <TabButton icon={<Users />} label="Users" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
        <TabButton icon={<CreditCard />} label="Pricing" active={activeTab === 'pricing'} onClick={() => setActiveTab('pricing')} />
        <TabButton icon={<LayoutTemplate />} label="Gallery" active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8 lg:p-12 bg-background relative">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[radial-gradient(circle_at_top_right,var(--primary),transparent_50%)] opacity-[0.05] pointer-events-none" />

        {activeTab === 'overview' && (
          <div className="space-y-12 relative z-10">
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Users" value={stats.totalUsers} />
                <StatCard title="Total Projects" value={stats.totalProjects} />
                <StatCard title="Active Networks" value={stats.activeNetworks} />
              </div>
            )}

            <div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-foreground flex items-center gap-2">
                All Platform Projects
              </h3>
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-black tracking-widest">
                    <tr>
                      <th className="p-4 px-6">Project Name</th>
                      <th className="p-4 px-6">Owner Name</th>
                      <th className="p-4 px-6">Owner Email</th>
                      <th className="p-4 px-6">Created At</th>
                      <th className="p-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map(p => (
                      <tr key={p.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                        <td className="p-4 px-6 font-bold text-foreground">{p.name}</td>
                        <td className="p-4 px-6 text-muted-foreground">{p.ownerName}</td>
                        <td className="p-4 px-6 text-muted-foreground">{p.ownerEmail}</td>
                        <td className="p-4 px-6 text-muted-foreground font-mono text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td className="p-4 px-6 flex gap-2 justify-end">
                          <button 
                            onClick={() => openProject(p.id)}
                            className="px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            Inspect
                          </button>
                          <button 
                            onClick={() => deleteProject(p.id)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                            title="Delete Project"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {projects.length === 0 && (
                      <tr><td colSpan={5} className="p-12 text-center text-muted-foreground font-bold">No projects found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="relative z-10">
            <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-foreground">User Management</h3>
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-black tracking-widest">
                  <tr>
                    <th className="p-4 px-6">User</th>
                    <th className="p-4 px-6">Email</th>
                    <th className="p-4 px-6">Projects</th>
                    <th className="p-4 px-6">Roles</th>
                    <th className="p-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const isAdmin = u.roles?.includes('Admin');
                    const isSuspended = u.isSuspended;
                    return (
                      <tr key={u.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                        <td className="p-4 px-6 font-bold text-foreground">{u.displayName || u.userName}</td>
                        <td className="p-4 px-6 text-muted-foreground">{u.email}</td>
                        <td className="p-4 px-6">
                          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black">{u.projectsCount}</span>
                        </td>
                        <td className="p-4 px-6 text-xs font-mono uppercase text-muted-foreground font-bold">{u.roles?.join(', ') || 'USER'}</td>
                        <td className="p-4 px-6 flex gap-2 justify-end">
                          <button 
                            onClick={() => toggleUserRole(u.id, isAdmin)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors ${isAdmin ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                          >
                            {isAdmin ? '- Admin' : '+ Admin'}
                          </button>
                          <button 
                            onClick={() => toggleUserSuspension(u.id, isSuspended)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors ${isSuspended ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'}`}
                          >
                            {isSuspended ? 'Activate' : 'Suspend'}
                          </button>
                          <button 
                            onClick={() => deleteUser(u.id)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors ml-2"
                            title="Delete User"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="relative z-10">
            <h3 className="text-xl font-black uppercase tracking-tight mb-2 text-foreground">Pricing Plans</h3>
            <p className="text-muted-foreground mb-8">Manage the subscription tiers available on the public pricing page.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pricingPlans.map(s => (
                <div key={s.id} className="bg-card border border-border rounded-3xl p-8 flex flex-col relative overflow-hidden group shadow-lg hover:shadow-xl hover:border-primary/30 transition-all">
                  {s.isPopular && <div className="absolute top-0 right-0 bg-weave-violet text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-bl-xl tracking-wider shadow-lg">Popular</div>}
                  <h4 className="font-black text-2xl uppercase tracking-tight text-foreground mb-3">{s.name}</h4>
                  <p className="text-sm text-muted-foreground mb-6 min-h-[40px] leading-relaxed">{s.description || 'No description provided for this tier.'}</p>
                  
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-5xl font-black">${s.monthlyPrice}</span>
                    <span className="text-xs text-muted-foreground uppercase font-black tracking-wider">/ mo</span>
                  </div>
                  
                  <div className="bg-muted/30 rounded-xl p-4 mb-6">
                    <div className="text-[10px] text-muted-foreground uppercase font-black tracking-wider mb-1">Limits</div>
                    <div className="font-bold text-foreground">Max Projects: {s.maxProjectsCount}</div>
                  </div>
                  
                  <div className="mt-auto flex justify-between items-center pt-6 border-t border-border">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg ${s.isActive ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                      {s.isActive ? 'Active Plan' : 'Inactive'}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => openPricingModal(s)} className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDeletePricingPlan(s.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div onClick={() => openPricingModal()} className="border-2 border-dashed border-border rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all min-h-[350px] group">
                <div className="w-16 h-16 bg-primary/5 group-hover:bg-primary/10 rounded-full flex items-center justify-center mb-6 transition-colors">
                  <CreditCard className="text-primary" size={28} />
                </div>
                <span className="text-foreground font-black uppercase tracking-widest text-sm">Create New Plan</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="relative z-10">
            <h3 className="text-xl font-black uppercase tracking-tight mb-2 text-foreground">Model Gallery</h3>
            <p className="text-muted-foreground mb-8">Manage research papers and architectures available in the public gallery.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {galleryItems.map(a => (
                <div key={a.id} className="bg-card border border-border rounded-3xl p-8 relative group shadow-lg hover:shadow-xl hover:border-primary/30 transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg mb-4 ${a.category === 'paper' ? 'bg-weave-blue/10 text-weave-blue' : 'bg-weave-violet/10 text-weave-violet'}`}>
                        {a.category}
                      </span>
                      <h4 className="font-black text-2xl text-foreground uppercase tracking-tight leading-tight">{a.name}</h4>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 bg-muted hover:bg-primary/20 text-foreground hover:text-primary rounded-xl transition-colors"><Edit size={16} /></button>
                      <button 
                        onClick={() => api.admin.deleteGalleryItem(a.id).then(loadData)}
                        className="p-2 bg-muted hover:bg-red-500/20 text-foreground hover:text-red-500 rounded-xl transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed line-clamp-3">{a.description}</p>
                  
                  <div className="flex flex-col gap-3 text-xs bg-muted/30 p-4 rounded-2xl">
                    {a.citation && (
                      <div className="flex items-start gap-3">
                        <span className="text-muted-foreground font-black uppercase tracking-wider mt-0.5">Citation</span>
                        <span className="font-mono text-foreground font-bold">{a.citation}</span>
                      </div>
                    )}
                    {a.paperUrl && (
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-black uppercase tracking-wider">Paper</span>
                        <a href={a.paperUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold truncate">{a.paperUrl}</a>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground font-black uppercase tracking-wider">Input</span>
                      <span className="font-mono bg-background border border-border px-2 py-0.5 rounded-md font-bold">{a.inputShape}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="border-2 border-dashed border-border rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all min-h-[300px] group">
                <div className="w-16 h-16 bg-primary/5 group-hover:bg-primary/10 rounded-full flex items-center justify-center mb-6 transition-colors">
                  <LayoutTemplate className="text-primary" size={28} />
                </div>
                <span className="text-foreground font-black uppercase tracking-widest text-sm">Add Architecture</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {isPricingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-xl font-black uppercase tracking-tight">{editingPlanId ? 'Edit Plan' : 'Create Plan'}</h3>
              <button onClick={closePricingModal} className="text-muted-foreground hover:text-foreground font-black text-xl">✕</button>
            </div>
            <form onSubmit={handlePricingSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Name</label>
                <input required type="text" value={pricingFormData.name} onChange={e => setPricingFormData({...pricingFormData, name: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Description</label>
                <textarea value={pricingFormData.description} onChange={e => setPricingFormData({...pricingFormData, description: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary h-24 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Monthly Price ($)</label>
                  <input required type="number" step="0.01" value={pricingFormData.monthlyPrice} onChange={e => setPricingFormData({...pricingFormData, monthlyPrice: parseFloat(e.target.value)})} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Max Projects</label>
                  <input required type="number" value={pricingFormData.maxProjectsCount} onChange={e => setPricingFormData({...pricingFormData, maxProjectsCount: parseInt(e.target.value)})} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={pricingFormData.isPopular} onChange={e => setPricingFormData({...pricingFormData, isPopular: e.target.checked})} className="accent-primary w-4 h-4" />
                  <span className="text-sm font-bold">Popular Flag</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={pricingFormData.isActive} onChange={e => setPricingFormData({...pricingFormData, isActive: e.target.checked})} className="accent-primary w-4 h-4" />
                  <span className="text-sm font-bold">Active</span>
                </label>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={closePricingModal} className="px-5 py-2 rounded-xl text-sm font-black uppercase tracking-wider hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl text-sm font-black uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg">Save Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${active ? 'bg-primary text-primary-foreground shadow-[0_4px_20px_rgba(var(--primary),0.3)] scale-[1.02]' : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-[1.01]'}`}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
      {label}
    </button>
  );
}

function StatCard({ title, value }: { title: string, value: number }) {
  return (
    <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden group shadow-lg">
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/15 transition-colors duration-500" />
      <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 relative z-10">{title}</h3>
      <p className="text-6xl font-black text-foreground tracking-tighter relative z-10">{value}</p>
    </div>
  );
}
