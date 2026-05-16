import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  return (
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
          <Button onClick={onLogin} className="w-full h-12 bg-gradient-to-r from-[#40d3b6] to-[#1e8fd3] text-black font-black uppercase rounded-none">
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
  );
}
