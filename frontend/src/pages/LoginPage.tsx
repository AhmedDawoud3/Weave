import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, User, ShieldAlert, Cpu, Terminal, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWeaveStore } from '../store/useWeaveStore';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';

// Read Client IDs from environment variables
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "unconfigured-client-id";
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || "";

const PYTORCH_CODE_SNIPPETS = [
  "import torch\nimport torch.nn as nn\n\nclass CNN(nn.Module):\n    def __init__(self):\n        super().__init__()\n        self.conv1 = nn.Conv2d(3, 32, 3)\n        self.relu = nn.ReLU()",
  "        self.pool = nn.MaxPool2d(2)\n        self.fc = nn.Linear(32*14*14, 10)\n\n    def forward(self, x):\n        x = self.pool(self.relu(self.conv1(x)))\n        return self.fc(x.view(x.size(0), -1))",
  "# Model successfully compiled by Weave\n# Starting training run...\n# Epoch 1: Loss = 0.432, Acc = 85.4%\n# Epoch 2: Loss = 0.291, Acc = 91.2%"
];

function SocialLoginButtons({ isAuthenticating, onLoginSuccess }: { isAuthenticating: boolean, onLoginSuccess: () => void }) {
  const { externalLogin } = useWeaveStore();
  const [localError, setLocalError] = useState<string | null>(null);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLocalError(null);
      const success = await externalLogin('Google', tokenResponse.access_token);
      if (success) onLoginSuccess();
    },
    onError: () => setLocalError('Google login failed.')
  });

  const handleGoogleClick = () => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "unconfigured-client-id") {
      setLocalError("Google Login is not configured. Please add VITE_GOOGLE_CLIENT_ID to your env.");
      return;
    }
    googleLogin();
  };

  const responseFacebook = async (response: any) => {
    setLocalError(null);
    if (response.accessToken) {
      const success = await externalLogin('Facebook', response.accessToken);
      if (success) onLoginSuccess();
    } else {
      setLocalError('Facebook login failed.');
    }
  };

  const handleFacebookClick = (renderPropsOnClick: () => void) => {
    if (!FACEBOOK_APP_ID) {
      setLocalError("Facebook Login is not configured. Please add VITE_FACEBOOK_APP_ID to your env.");
      return;
    }
    renderPropsOnClick();
  };

  return (
    <div className="flex flex-col gap-3 mt-6">
      {localError && <div className="text-xs text-red-400 text-center">{localError}</div>}
      <div className="relative my-4 text-center">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <span className="relative px-3 bg-[#0F1117] text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
          Or continue with
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          disabled={isAuthenticating}
          onClick={handleGoogleClick}
          className="bg-muted border border-border hover:bg-muted/80 hover:border-border/60 hover:text-white text-muted-foreground font-bold h-10 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span className="text-xs uppercase tracking-wider">Google</span>
        </Button>

        <FacebookLogin
          appId={FACEBOOK_APP_ID || "1234567890"}
          fields="name,email,picture"
          callback={responseFacebook}
          render={renderProps => (
            <Button
              type="button"
              disabled={isAuthenticating}
              onClick={() => handleFacebookClick(renderProps.onClick)}
              className="bg-[#1877F2]/10 border border-[#1877F2]/30 hover:bg-[#1877F2]/20 text-muted-foreground font-bold h-10 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span className="text-xs uppercase tracking-wider">Facebook</span>
            </Button>
          )}
        />
      </div>
    </div>
  );
}

interface LoginPageProps {
  onLogin?: () => void;
  defaultIsRegister?: boolean;
}

export function LoginPage({ onLogin, defaultIsRegister = false }: LoginPageProps) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(defaultIsRegister);
  
  // Input fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  const { login, register, authError, isAuthenticating } = useWeaveStore();
  const [localError, setLocalError] = useState<string | null>(null);

  // PyTorch code terminal typing simulation
  const [typedLines, setTypedLines] = useState<string[]>([]);
  
  useEffect(() => {
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < PYTORCH_CODE_SNIPPETS.length) {
        setTypedLines(prev => [...prev, PYTORCH_CODE_SNIPPETS[currentIdx]]);
        currentIdx++;
      } else {
        clearInterval(interval);
      }
    }, 3200);

    setTypedLines([PYTORCH_CODE_SNIPPETS[0]]);
    currentIdx = 1;

    return () => clearInterval(interval);
  }, []);

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

  const handleLoginSuccess = () => {
    onLogin?.();
    navigate('/dashboard');
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <motion.div
        key="login"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen w-full bg-background flex flex-col md:flex-row overflow-y-auto md:overflow-hidden font-sans"
      >
        {/* Left Pane - Live Glowing Neural Network Visuals */}
        <div className="hidden md:flex w-1/2 flex-col justify-between p-12 bg-[#0B0C12] border-r border-border relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(108,60,225,0.08),transparent_50%)] pointer-events-none" />
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-weave-violet to-weave-blue/20 flex items-center justify-center shadow-lg border border-weave-violet/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="var(--weave-teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-white font-black tracking-widest uppercase text-sm">Weave Studio</span>
          </div>

          {/* Glowing Neural Network Layout SVG */}
          <div className="my-auto relative flex flex-col items-center justify-center min-h-[300px]">
            <svg className="w-full max-w-[420px]" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Lines */}
              <line x1="50" y1="100" x2="150" y2="50" stroke="var(--weave-violet)" strokeOpacity="0.3" strokeWidth="2" />
              <line x1="50" y1="100" x2="150" y2="150" stroke="var(--weave-violet)" strokeOpacity="0.3" strokeWidth="2" />
              <line x1="150" y1="50" x2="250" y2="50" stroke="var(--weave-blue)" strokeOpacity="0.3" strokeWidth="2" />
              <line x1="150" y1="150" x2="250" y2="150" stroke="var(--weave-blue)" strokeOpacity="0.3" strokeWidth="2" />
              <line x1="250" y1="50" x2="350" y2="100" stroke="var(--weave-teal)" strokeOpacity="0.3" strokeWidth="2" />
              <line x1="250" y1="150" x2="350" y2="100" stroke="var(--weave-teal)" strokeOpacity="0.3" strokeWidth="2" />

              {/* Animated pulses */}
              <circle r="4" fill="var(--weave-teal)" className="animate-pulse">
                <animateMotion dur="3s" repeatCount="indefinite" path="M 50,100 L 150,50 L 250,50 L 350,100" />
              </circle>
              <circle r="4" fill="var(--weave-violet)" className="animate-pulse">
                <animateMotion dur="2.5s" repeatCount="indefinite" path="M 50,100 L 150,150 L 250,150 L 350,100" />
              </circle>

              {/* Nodes */}
              <circle cx="50" cy="100" r="16" fill="var(--background)" stroke="var(--weave-violet)" strokeWidth="3" />
              <text x="50" y="104" fill="white" fontSize="10" fontWeight="bold" textAnchor="middle">IN</text>

              <circle cx="150" cy="50" r="16" fill="var(--background)" stroke="var(--weave-blue)" strokeWidth="3" />
              <text x="150" y="54" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">CONV</text>

              <circle cx="150" cy="150" r="16" fill="var(--background)" stroke="var(--weave-blue)" strokeWidth="3" />
              <text x="150" y="154" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">RELU</text>

              <circle cx="250" cy="50" r="16" fill="var(--background)" stroke="var(--weave-teal)" strokeWidth="3" />
              <text x="250" y="54" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">POOL</text>

              <circle cx="250" cy="150" r="16" fill="var(--background)" stroke="var(--weave-teal)" strokeWidth="3" />
              <text x="250" y="154" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">FC</text>

              <circle cx="350" cy="100" r="16" fill="var(--background)" stroke="var(--weave-amber)" strokeWidth="3" />
              <text x="350" y="104" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">OUT</text>
            </svg>

            {/* Fake PyTorch Terminal */}
            <div className="w-full max-w-[420px] bg-[#0B0C12] border border-border rounded-2xl p-4 mt-8 font-mono text-[11px] text-muted-foreground leading-relaxed shadow-xl">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <Terminal size={14} className="text-weave-teal" />
                  <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-bold">Compiler Terminal</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/40" />
                </div>
              </div>
              <div className="space-y-2 h-[120px] overflow-y-auto scrollbar-none select-none">
                {typedLines.map((line, i) => (
                  <pre key={i} className="whitespace-pre-wrap text-muted-foreground">
                    {line}
                  </pre>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase font-bold relative z-10">
            <span>© 2026 Weave AI</span>
            <span className="flex items-center gap-1">
              <Cpu size={12} /> GPU Optimized
            </span>
          </div>
        </div>

        {/* Right Pane - Sleek Glassmorphic Login/Register Form */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 relative min-h-screen">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(108,60,225,0.06),transparent_50%)] pointer-events-none" />

          {/* Mobile Header Logo */}
          <div className="flex md:hidden items-center gap-2 mb-8 self-center">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-weave-violet to-weave-blue/20 flex items-center justify-center border border-weave-violet/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="var(--weave-teal)" strokeWidth="2" />
              </svg>
            </div>
            <span className="text-white font-black tracking-widest uppercase text-sm">Weave Studio</span>
          </div>

          <div className="w-full max-w-[400px] p-8 bg-card backdrop-blur-xl border border-border shadow-[0_0_40px_rgba(0,0,0,0.3)] rounded-2xl relative z-10">
            <div className="flex flex-col items-center mb-8">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary/20 to-secondary/10 flex items-center justify-center border border-primary/20 mb-4 shadow-lg">
                <Sparkles className="text-primary" size={20} />
              </div>
              <h2 className="text-2xl font-black text-center text-white tracking-wider uppercase">
                {isRegister ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 text-center">
                {isRegister ? 'Sign up for Weave Studio' : 'Enter your credentials to login'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {(authError || localError) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-xs text-red-400"
                  >
                    <ShieldAlert className="shrink-0 mt-0.5" size={16} />
                    <span>{localError || authError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {isRegister && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-background/40 border-border pl-10 h-12 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>

                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      placeholder="Username (e.g. ahmed123)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-background/40 border-border pl-10 h-12 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </motion.div>
              )}

              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/40 border-border pl-10 h-12 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background/40 border-border pl-10 pr-10 h-12 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>

              <Button
                type="submit"
                disabled={isAuthenticating}
                className="w-full h-12 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold uppercase rounded-xl transition-all shadow-glow cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isAuthenticating ? 'Connecting...' : isRegister ? 'Register' : 'Login'}
                <ChevronRight size={16} />
              </Button>
            </form>

            <SocialLoginButtons isAuthenticating={isAuthenticating} onLoginSuccess={handleLoginSuccess} />

            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setLocalError(null);
              }}
              className="w-full text-xs text-muted-foreground hover:text-primary mt-6 uppercase tracking-widest font-bold text-center transition-colors focus:outline-none cursor-pointer"
            >
              {isRegister ? "Already have an account? Login" : "Don't have an account? Register"}
            </button>
          </div>
        </div>
      </motion.div>
    </GoogleOAuthProvider>
  );
}
