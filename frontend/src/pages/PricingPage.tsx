import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Hobby",
      price: 0,
      desc: "Perfect for students and developers learning neural network architectures.",
      features: [
        "Interactive Model Canvas Editor",
        "Standard conv/dense/transformer nodes",
        "Local compilation & export (PyTorch)",
        "Single workspace sandbox",
        "Community support"
      ],
      cta: "Start Free",
      popular: false,
      color: "border-white/5"
    },
    {
      name: "Developer",
      price: isAnnual ? 12 : 15,
      desc: "For deep learning engineers building, training, and optimizing real models.",
      features: [
        "All features in Hobby",
        "Cloud GPU Training access",
        "Live SignalR training metrics stream",
        "Multi-run history comparison chart",
        "ONNX & TorchScript exporter",
        "Priority Discord support"
      ],
      cta: "Upgrade to Developer",
      popular: true,
      color: "border-weave-violet/50 shadow-[0_0_24px_rgba(108,60,225,0.15)] bg-weave-violet/5"
    },
    {
      name: "Enterprise",
      price: "Custom",
      desc: "For teams and research labs requiring massive compute and integrations.",
      features: [
        "All features in Developer",
        "Dedicated GPU cluster scaling",
        "SAML SSO & Team management",
        "Custom autograd code execution",
        "API pipeline endpoints",
        "SLA & Dedicated account manager"
      ],
      cta: "Contact Sales",
      popular: false,
      color: "border-white/5"
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#0F1117] text-slate-100 py-12 px-6 md:px-12 relative overflow-hidden font-sans">
      {/* Decorative glows */}
      <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,rgba(108,60,225,0.06),transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] bg-[radial-gradient(circle_at_center,rgba(26,188,254,0.06),transparent_60%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex justify-between items-center mb-16">
          <Link to="/" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo_icon.svg" alt="Logo" className="w-6 h-6" />
            <span className="font-black tracking-widest text-xs uppercase text-weave-violet">Weave Engine</span>
          </div>
        </header>

        <section className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black tracking-tight mb-6 uppercase"
          >
            Flexible <span className="text-gradient-purple">Computing</span> Plans
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            Choose the plan that fits your neural network training and compilation workloads.
          </motion.p>
        </section>

        {/* Annual Toggle */}
        <div className="flex justify-center items-center gap-4 mb-16">
          <span className={`text-sm font-bold uppercase transition-colors duration-200 ${!isAnnual ? 'text-white' : 'text-slate-500'}`}>Monthly</span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="w-14 h-8 bg-slate-800 rounded-full p-1 relative border border-white/10 transition-colors"
          >
            <motion.div
              layout
              className="w-5 h-5 bg-weave-violet rounded-full"
              animate={{ x: isAnnual ? 24 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
          <span className={`text-sm font-bold uppercase transition-colors duration-200 ${isAnnual ? 'text-white' : 'text-slate-500'}`}>
            Yearly <span className="text-[10px] bg-weave-teal/20 text-weave-teal border border-weave-teal/30 px-2 py-0.5 rounded-full ml-1 normal-case">Save 20%</span>
          </span>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-20">
          {plans.map((plan, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`glass-panel rounded-3xl p-8 flex flex-col justify-between relative border ${plan.color}`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-weave-violet text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-white/20">
                  <Sparkles size={10} /> Most Popular
                </div>
              )}

              <div>
                <h3 className="text-2xl font-black mb-2 uppercase text-slate-100">{plan.name}</h3>
                <p className="text-xs text-slate-400 mb-6 min-h-[36px]">{plan.desc}</p>
                
                <div className="mb-8">
                  {typeof plan.price === 'number' ? (
                    <div className="flex items-baseline">
                      <span className="text-5xl font-black tracking-tight">${plan.price}</span>
                      <span className="text-sm text-slate-400 font-bold ml-1 uppercase">/ month</span>
                    </div>
                  ) : (
                    <span className="text-4xl font-black tracking-tight">{plan.price}</span>
                  )}
                </div>

                <hr className="border-white/5 mb-8" />

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-weave-teal mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link to="/login" className="w-full">
                <Button
                  className={`w-full py-6 rounded-xl font-bold uppercase tracking-wider text-xs border ${
                    plan.popular
                      ? 'bg-weave-violet hover:bg-weave-violet/90 text-white border-transparent'
                      : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                  }`}
                >
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </section>
      </div>
    </div>
  );
}
