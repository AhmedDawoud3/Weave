import { useState, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (toasts: Toast[]) => void;
let toasts: Toast[] = [];
let listeners: Listener[] = [];

export const toast = {
  success(message: string) {
    this.add(message, 'success');
  },
  error(message: string) {
    this.add(message, 'error');
  },
  info(message: string) {
    this.add(message, 'info');
  },
  add(message: string, type: ToastType) {
    const id = Math.random().toString(36).substring(2, 9);
    toasts = [...toasts, { id, message, type }];
    listeners.forEach(l => l(toasts));
    setTimeout(() => this.remove(id), 4000);
  },
  remove(id: string) {
    toasts = toasts.filter(t => t.id !== id);
    listeners.forEach(l => l(toasts));
  },
  subscribe(listener: Listener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }
};

export function Toaster() {
  const [activeToasts, setActiveToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return toast.subscribe(setActiveToasts);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none">
      {activeToasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto p-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wide border-border bg-card/95 ${
            t.type === 'success'
              ? 'text-emerald-400 border-emerald-500/20'
              : t.type === 'error'
                ? 'text-red-400 border-red-500/20'
                : 'text-primary'
          }`}
        >
          <span>{t.message}</span>
          <button
            onClick={() => toast.remove(t.id)}
            className="text-muted-foreground hover:text-white transition-colors cursor-pointer text-xs font-black p-1"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
