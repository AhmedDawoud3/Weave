import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SplashPage } from './pages/SplashPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudioPage } from './pages/StudioPage';
import { useWeaveStore } from './store/useWeaveStore';
import type { AppStage } from './types';

export default function App() {
  const { isAuthenticated, fetchProjects } = useWeaveStore();
  
  // Custom navigation stage hook
  const [stage, setStage] = useState<AppStage>('splash');

  // Load projects if already authenticated on boot
  useEffect(() => {
    if (isAuthenticated && stage === 'dashboard') {
      fetchProjects();
    }
  }, [isAuthenticated, stage, fetchProjects]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        setStage('dashboard');
      } else {
        setStage('login');
      }
    }, 2000); // 2s splash
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-[#070709] text-white overflow-hidden font-sans">
      <AnimatePresence mode="wait">
        {stage === 'splash' && <SplashPage />}
        
        {stage === 'login' && (
          <LoginPage onLogin={() => setStage('dashboard')} />
        )}
        
        {stage === 'dashboard' && (
          <DashboardPage
            onOpenProject={() => setStage('main')}
          />
        )}
        
        {stage === 'main' && (
          <StudioPage onNavigateDashboard={() => setStage('dashboard')} />
        )}
      </AnimatePresence>
    </div>
  );
}

// A simple local useState helper inside App.tsx (since we imported types but need standard React)
import { useState } from 'react';
