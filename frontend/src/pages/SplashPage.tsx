import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWeaveStore } from '../store/useWeaveStore';

export function SplashPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useWeaveStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }, 2000); // 2s splash
    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate]);

  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-screen w-full bg-background flex flex-col items-center justify-center"
    >
      <motion.h1
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-6xl font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-weave-violet to-weave-blue"
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
  );
}

