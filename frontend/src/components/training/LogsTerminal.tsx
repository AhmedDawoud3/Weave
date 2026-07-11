import { useEffect, useRef } from 'react';
import { useTrainingStore } from '../../store/useTrainingStore';

export function LogsTerminal() {
  const { trainingLogs } = useTrainingStore();
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto Scroll Terminal to bottom on changes
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [trainingLogs]);

  // Color code log lines based on keywords
  const colorCodeLog = (log: string) => {
    const lower = log.toLowerCase();
    if (lower.includes('error') || lower.includes('exception') || lower.includes('failed')) {
      return <span className="text-red-400 font-bold">{log}</span>;
    }
    if (lower.includes('warning')) {
      return <span className="text-yellow-400 font-bold">{log}</span>;
    }
    if (lower.includes('success') || lower.includes('completed') || lower.includes('done')) {
      return <span className="text-emerald-400 font-bold">{log}</span>;
    }

    // Split and highlight inline matches: Epochs, losses, accuracies, and steps
    const regex = /(Epoch \d+|Loss: \d+\.\d+|loss: \d+\.\d+|accuracy: \d+\.\d+%?|acc: \d+\.\d+%?|step \d+\/\d+)/gi;
    const parts = log.split(regex);
    
    return parts.map((part, i) => {
      if (part.match(/Epoch \d+/i)) {
        return <span key={i} className="text-primary font-extrabold">{part}</span>;
      }
      if (part.match(/loss: \d+\.\d+|Loss: \d+\.\d+/i)) {
        return <span key={i} className="text-amber-400 font-bold font-mono">{part}</span>;
      }
      if (part.match(/accuracy: \d+\.\d+%?|acc: \d+\.\d+%?/i)) {
        return <span key={i} className="text-emerald-400 font-bold font-mono">{part}</span>;
      }
      if (part.match(/step \d+\/\d+/i)) {
        return <span key={i} className="text-weave-blue font-semibold font-mono">{part}</span>;
      }
      return part;
    });
  };

  return (
    <div className="h-full bg-background border border-border rounded-xl p-4 font-mono text-xs overflow-y-auto flex flex-col gap-1.5 text-foreground/80 scroll-smooth">
      {trainingLogs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground/35 text-[10px] uppercase tracking-widest select-none">
          No logs recorded yet. Build graph & click training to initiate logs.
        </div>
      ) : (
        <>
          {trainingLogs.map((log, idx) => (
            <div key={idx} className="leading-relaxed break-all font-mono text-foreground/90">
              <span className="text-primary select-none mr-2 font-black">&gt;</span>
              {colorCodeLog(log)}
            </div>
          ))}
          <div ref={terminalEndRef} />
        </>
      )}
    </div>
  );
}
