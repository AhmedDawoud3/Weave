import { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  applyNodeChanges, 
  applyEdgeChanges,
  Node,
  Edge,
  addEdge,
  ReactFlowInstance
} from 'reactflow';
// @ts-ignore
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, LayoutDashboard, Cpu, Trash2, MousePointer2, Plus, Box } from 'lucide-react';

// استيراد المكونات من مكتبة UI الخاصة بك
import { LayerNode } from './components/LayerNode';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const nodeTypes = { layer: LayerNode };

export default function App() {
  const [stage, setStage] = useState<'splash' | 'login' | 'dashboard' | 'main'>('splash');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  // قائمة المشاريع
  const [projects, setProjects] = useState([
    { id: 1, name: "MNIST Digit Classifier", date: "2026-05-10", accuracy: "98.2%", layers: 5 },
    { id: 2, name: "CNN Image Recognition", date: "2026-05-12", accuracy: "91.5%", layers: 8 },
  ]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  useEffect(() => {
    const timer = setTimeout(() => setStage('login'), 3500);
    return () => clearTimeout(timer);
  }, []);

  const addNewProject = () => {
    const newProj = {
      id: Date.now(),
      name: `New Model ${projects.length + 1}`,
      date: new Date().toISOString().split('T')[0],
      accuracy: "0.0%",
      layers: 0
    };
    setProjects([newProj, ...projects]);
    setStage('main');
  };

  const deleteProject = (id: number) => {
    setProjects(projects.filter(p => p.id !== id));
  };

  const onConnect = useCallback((p: any) => setEdges((eds) => addEdge({ ...p, animated: true }, eds)), []);
  
  const onDrop = useCallback((event: any) => {
    const type = event.dataTransfer.getData('application/reactflow');
    const position = reactFlowInstance?.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const newNode = { 
      id: `${Date.now()}`, 
      type: 'layer', 
      position, 
      data: { type, params: { units: 64, activation: 'relu' } } 
    };
    setNodes((nds) => nds.concat(newNode as Node));
  }, [reactFlowInstance]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <AnimatePresence mode="wait">
        
        {/* 1. Splash Screen */}
        {stage === 'splash' && (
          <motion.div 
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="h-screen w-full bg-[#0a0a0a] flex flex-col items-center justify-center"
          >
            <motion.h1 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-6xl font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-[#40d3b6] to-[#1e8fd3]"
            >
              WEAVE
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              className="text-white tracking-[0.5em] text-[10px] mt-4 font-bold uppercase"
            >
              Neural Design Studio
            </motion.p>
          </motion.div>
        )}

        {/* 2. Login Stage */}
        {stage === 'login' && (
          <motion.div 
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-6"
          >
            <Card className="w-[420px] p-8 bg-card/40 backdrop-blur-2xl border-white/5 shadow-2xl rounded-none">
              <h2 className="text-xl font-bold text-center mb-8 text-white tracking-widest uppercase">
                {isRegister ? 'Join Weave' : 'Welcome Back'}
              </h2>
              <div className="space-y-4">
                {isRegister && <Input placeholder="Full Name" className="bg-background/50 border-white/10 h-12 rounded-none" />}
                <Input placeholder="Email" className="bg-background/50 border-white/10 h-12 rounded-none" />
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="Password" className="bg-background/50 border-white/10 h-12 rounded-none" />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
                <Button onClick={() => setStage('dashboard')} className="w-full h-12 bg-gradient-to-r from-[#40d3b6] to-[#1e8fd3] text-black font-black uppercase rounded-none">
                  {isRegister ? 'Register' : 'Login'}
                </Button>
                
                <div className="relative my-6 text-center">
                   <span className="text-[9px] text-muted-foreground uppercase tracking-tighter">Or continue with</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="border-white/10 rounded-none h-12 uppercase text-[10px] font-bold">Google</Button>
                  <Button variant="outline" className="border-white/10 rounded-none h-12 uppercase text-[10px] font-bold">Apple</Button>
                </div>

                <button onClick={() => setIsRegister(!isRegister)} className="w-full text-[10px] text-muted-foreground hover:text-[#40d3b6] mt-4 uppercase tracking-widest font-bold text-center">
                  {isRegister ? "Already have an account? Login" : "Don't have an account? Register"}
                </button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* 3. Dashboard Stage */}
        {stage === 'dashboard' && (
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
                <Button onClick={addNewProject} className="bg-[#40d3b6] hover:bg-[#40d3b6]/80 text-black font-black px-8 h-14 rounded-none transition-all">
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
                      <Button variant="secondary" className="flex-1 bg-white/5 rounded-none text-[10px] font-bold h-10 hover:bg-[#40d3b6] hover:text-black" onClick={() => setStage('main')}>OPEN STUDIO</Button>
                      <Button variant="ghost" onClick={() => deleteProject(p.id)} className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-none h-10 px-3 transition-colors">
                        <Trash2 size={16}/>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 4. Main Studio Stage */}
        {stage === 'main' && (
          <motion.div 
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="dark w-full h-screen bg-[#080808] text-white flex overflow-hidden"
          >
            {/* Sidebar - Studio */}
            <div className="w-80 border-r border-white/5 bg-card/20 p-6 flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black text-[#40d3b6] cursor-pointer" onClick={() => setStage('dashboard')}>WEAVE</h1>
                <Button variant="ghost" size="icon" onClick={() => setStage('dashboard')} className="hover:bg-[#40d3b6]/10 text-muted-foreground hover:text-[#40d3b6]">
                  <LayoutDashboard size={20} />
                </Button>
              </div>
              <Separator className="bg-white/5" />
              <div className="space-y-4">
                <Label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Components</Label>
                {['CONV2D', 'LINEAR', 'DROPOUT'].map(l => (
                  <div key={l} onDragStart={(e: any) => e.dataTransfer.setData('application/reactflow', l)} draggable 
                    className="p-4 bg-white/5 border border-white/5 cursor-grab active:cursor-grabbing hover:border-[#40d3b6]/30 transition-all text-xs font-bold tracking-widest uppercase flex items-center">
                    <Box size={14} className="mr-2 text-[#40d3b6]/50" /> {l}
                  </div>
                ))}
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative">
              <ReactFlow nodes={nodes} edges={edges} onNodesChange={(c) => setNodes((nds) => applyNodeChanges(c, nds))} onEdgesChange={(c) => setEdges((eds) => applyEdgeChanges(c, eds))} onConnect={onConnect} onInit={setReactFlowInstance} onDrop={onDrop} onDragOver={(e) => e.preventDefault()} onNodeClick={(_, n) => setSelectedNodeId(n.id)} nodeTypes={nodeTypes} fitView>
                <Background color="#1a1a1a" gap={20} />
                <Controls className="bg-white/5 border-white/10" />
              </ReactFlow>
            </div>

            {/* Properties Sidebar */}
            <div className="w-80 border-l border-white/5 bg-card/20 p-8">
              <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-10">Configuration</h2>
              {selectedNode ? (
                <div className="space-y-8">
                  <div>
                    <Label className="text-[10px] text-white/50 uppercase font-bold">Units / Filters</Label>
                    <input type="number" value={selectedNode.data.params.units} onChange={(e) => {
                      const val = Number(e.target.value);
                      setNodes(nds => nds.map(n => n.id === selectedNodeId ? {...n, data: {...n.data, params: {...n.data.params, units: val}}} : n));
                    }} className="w-full bg-white/5 border border-white/10 p-3 mt-2 text-sm outline-none focus:border-[#40d3b6]" />
                  </div>
                  <div>
                     <Label className="text-[10px] text-white/50 uppercase font-bold">Activation</Label>
                     <Select value={selectedNode.data.params.activation} onValueChange={(v) => {
                       setNodes(nds => nds.map(n => n.id === selectedNodeId ? {...n, data: {...n.data, params: {...n.data.params, activation: v}}} : n));
                     }}>
                        <SelectTrigger className="bg-white/5 border-white/10 h-12 mt-2 rounded-none"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#111] border-white/10 text-white"><SelectItem value="relu">ReLU</SelectItem><SelectItem value="sigmoid">Sigmoid</SelectItem><SelectItem value="tanh">Tanh</SelectItem></SelectContent>
                     </Select>
                  </div>
                  <Button variant="ghost" className="w-full text-red-500 hover:bg-red-500/10 text-[10px] font-bold rounded-none" onClick={() => { setNodes(nds => nds.filter(n => n.id !== selectedNodeId)); setSelectedNodeId(null); }}>REMOVE LAYER</Button>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-10">
                  <MousePointer2 size={40} /><p className="text-[9px] uppercase font-bold mt-4 tracking-widest">Select Layer</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}