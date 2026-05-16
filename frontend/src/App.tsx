import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SplashPage } from './pages/SplashPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudioPage } from './pages/StudioPage';
import type { AppStage, Project } from './types';

export default function App() {
  const [stage, setStage] = useState<AppStage>('splash');
  const [projects, setProjects] = useState<Project[]>([
    { id: 1, name: "MNIST Digit Classifier", date: "2026-05-10", accuracy: "98.2%", layers: 5 },
    { id: 2, name: "CNN Image Recognition", date: "2026-05-12", accuracy: "91.5%", layers: 8 },
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setStage('login'), 3500);
    return () => clearTimeout(timer);
  }, []);

  const addNewProject = () => {
    const newProj: Project = {
      id: Date.now(),
      name: `New Model ${projects.length + 1}`,
      date: new Date().toISOString().split('T')[0],
      accuracy: "0.0%",
      layers: 0,
    };
    setProjects([newProj, ...projects]);
    setStage('main');
  };

  const deleteProject = (id: number) => {
    setProjects(projects.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <AnimatePresence mode="wait">
        {stage === 'splash' && <SplashPage />}
        {stage === 'login' && <LoginPage onLogin={() => setStage('dashboard')} />}
        {stage === 'dashboard' && (
          <DashboardPage
            projects={projects}
            onAddProject={addNewProject}
            onOpenProject={() => setStage('main')}
            onDeleteProject={deleteProject}
          />
        )}
        {stage === 'main' && (
          <StudioPage onNavigateDashboard={() => setStage('dashboard')} />
        )}
      </AnimatePresence>
    </div>
  );
}
