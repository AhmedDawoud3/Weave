import { motion } from 'framer-motion';
import { Plus, Cpu, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Project } from '../types';

interface DashboardPageProps {
  projects: Project[];
  onAddProject: () => void;
  onOpenProject: () => void;
  onDeleteProject: (id: number) => void;
}

export function DashboardPage({ projects, onAddProject, onOpenProject, onDeleteProject }: DashboardPageProps) {
  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen w-full bg-[#0a0a0a] text-white p-20 overflow-y-auto"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-16">
          <div>
            <p className="text-[#40d3b6] font-bold tracking-widest text-[10px] uppercase">Workspace</p>
            <h1 className="text-4xl font-black tracking-tight mt-2 uppercase">Recent Projects</h1>
          </div>
          <Button onClick={onAddProject} className="bg-[#40d3b6] hover:bg-[#40d3b6]/80 text-black font-black px-8 h-14 rounded-none transition-all">
            <Plus className="mr-2" size={20}/> CREATE NEW ARCHITECTURE
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map(p => (
            <Card key={p.id} className="bg-[#111] border-white/5 p-8 rounded-none group hover:border-[#40d3b6]/40 transition-all">
              <div className="w-12 h-12 bg-white/5 flex items-center justify-center mb-6"><Cpu className="text-[#40d3b6]" size={24}/></div>
              <h3 className="text-xl font-bold mb-8 group-hover:text-[#40d3b6] transition-colors uppercase">{p.name}</h3>
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase mb-6">
                <span>{p.layers} Layers</span>
                <span className="text-green-500 font-black">{p.accuracy} Accuracy</span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1 bg-white/5 rounded-none text-[10px] font-bold h-10 hover:bg-[#40d3b6] hover:text-black" onClick={onOpenProject}>OPEN STUDIO</Button>
                <Button variant="ghost" onClick={() => onDeleteProject(p.id)} className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-none h-10 px-3 transition-colors">
                  <Trash2 size={16}/>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
