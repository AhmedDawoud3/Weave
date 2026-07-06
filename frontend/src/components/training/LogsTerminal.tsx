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

  return (
    <div className="h-full bg-black/40 border border-primary/10 rounded-xl p-4 font-mono text-xs overflow-y-auto flex flex-col gap-1.5 text-foreground/80 scroll-smooth">
      {trainingLogs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground/30 text-[10px] uppercase tracking-widest select-none">
          No logs recorded yet. Build graph & click training to initiate logs.
        </div>
      ) : (
        <>
          {trainingLogs.map((log, idx) => (
            <div key={idx} className="leading-relaxed break-all font-mono text-white/90">
              <span className="text-[#40d3b6] select-none mr-2 font-black">&gt;</span> {log}
            </div>
          ))}
          <div ref={terminalEndRef} />
        </>
      )}
    </div>
  );
}
