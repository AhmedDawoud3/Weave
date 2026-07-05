import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, User, ShieldAlert } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWeaveStore } from '../store/useWeaveStore';

interface LoginPageProps {
  onLogin?: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  
  // Input fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  const { login, register, authError, isAuthenticating } = useWeaveStore();
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError("Email and Password are required.");
      return;
    }

    if (isRegister) {
      if (!name) {
        setLocalError("Full Name is required for registration.");
        return;
      }
      if (!username) {
        setLocalError("Username is required for registration.");
        return;
      }
    }

    let success = false;
    if (isRegister) {
      success = await register({ email, password, userName: username, displayName: name });
    } else {
      success = await login({ email, password });
    }

    if (success) {
      onLogin?.();
      navigate('/dashboard');
    }
  };

  return (
    <motion.div
      key="login"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen w-full bg-background flex items-center justify-center p-6"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(108,60,225,0.12),transparent_50%)]" />

      <Card className="w-[420px] p-8 bg-card/30 backdrop-blur-xl border border-primary/10 shadow-[0_0_50px_rgba(108,60,225,0.08)] rounded-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-weave-blue/20 flex items-center justify-center shadow-lg border border-primary/20 mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="#1ABCFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
          </div>
          <h2 className="text-2xl font-black text-center text-white tracking-wider uppercase">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
            {isRegister ? 'Sign up for Weave Studio' : 'Enter your credentials to login'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(authError || localError) && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-xs text-red-400">
              <ShieldAlert className="shrink-0 mt-0.5" size={16} />
              <span>{localError || authError}</span>
            </div>
          )}

          {isRegister && (
            <>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background/40 border-primary/10 pl-10 h-12 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Username (e.g. ahmed123)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-background/40 border-primary/10 pl-10 h-12 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </>
          )}

          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background/40 border-primary/10 pl-10 h-12 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background/40 border-primary/10 pl-10 pr-10 h-12 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
            </button>
          </div>

          <Button
            type="submit"
            disabled={isAuthenticating}
            className="w-full h-12 mt-2 bg-gradient-to-r from-weave-violet to-weave-blue hover:brightness-110 active:scale-[0.99] text-white font-extrabold uppercase rounded-xl transition-all shadow-[0_4px_20px_rgba(108,60,225,0.25)] cursor-pointer"
          >
            {isAuthenticating ? 'Connecting...' : isRegister ? 'Register' : 'Login'}
          </Button>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-primary/5" /></div>
            <span className="relative px-3 bg-[#0d0f1a] text-[9px] text-muted-foreground uppercase tracking-wider font-bold">
              Secure Gateway Access
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setLocalError(null);
            }}
            className="w-full text-[10px] text-muted-foreground hover:text-primary mt-2 uppercase tracking-widest font-bold text-center transition-colors focus:outline-none"
          >
            {isRegister ? "Already have an account? Login" : "Don't have an account? Register"}
          </button>
        </form>
      </Card>
    </motion.div>
  );
}
