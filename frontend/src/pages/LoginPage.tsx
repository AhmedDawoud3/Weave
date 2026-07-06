import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, User, ShieldAlert } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWeaveStore } from '../store/useWeaveStore';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';

// Read Client IDs from environment variables
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "unconfigured-client-id";
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || "";

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
      setLocalError("Google Login is not configured. Please add VITE_GOOGLE_CLIENT_ID to your .env.local file.");
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
      setLocalError("Facebook Login is not configured. Please add VITE_FACEBOOK_APP_ID to your .env.local file.");
      return;
    }
    renderPropsOnClick();
  };

  return (
    <div className="flex flex-col gap-3 mt-6">
      {localError && <div className="text-xs text-red-400 text-center">{localError}</div>}
      <div className="relative my-4 text-center">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-primary/10" /></div>
        <span className="relative px-3 bg-[#0d0f1a] text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
          Or continue with
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          disabled={isAuthenticating}
          onClick={handleGoogleClick}
          className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold h-10 rounded-xl flex items-center justify-center gap-2 transition-all"
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
          appId={FACEBOOK_APP_ID || "1234567890"} // Requires a non-empty string to render
          fields="name,email,picture"
          callback={responseFacebook}
          render={renderProps => (
            <Button
              type="button"
              disabled={isAuthenticating}
              onClick={() => handleFacebookClick(renderProps.onClick)}
              className="bg-[#1877F2]/10 border border-[#1877F2]/30 hover:bg-[#1877F2]/20 text-white font-bold h-10 rounded-xl flex items-center justify-center gap-2 transition-all"
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
          </form>

          <SocialLoginButtons isAuthenticating={isAuthenticating} onLoginSuccess={handleLoginSuccess} />

          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setLocalError(null);
            }}
            className="w-full text-[10px] text-muted-foreground hover:text-primary mt-6 uppercase tracking-widest font-bold text-center transition-colors focus:outline-none"
          >
            {isRegister ? "Already have an account? Login" : "Don't have an account? Register"}
          </button>
        </Card>
      </motion.div>
    </GoogleOAuthProvider>
  );
}
