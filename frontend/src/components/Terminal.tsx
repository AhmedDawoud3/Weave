import { useEffect, useRef } from 'react';

interface TerminalProps {
  output: string;
  isRunning: boolean;
}

function Terminal({ output, isRunning }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="h-56 bg-black border-t border-slate-800 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <span className="text-xs uppercase tracking-wider text-slate-500">Terminal</span>
        <span className={`text-xs ${isRunning ? 'text-emerald-400' : 'text-slate-600'}`}>
          {isRunning ? 'Running' : 'Idle'}
        </span>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto px-3 py-2 text-xs font-mono text-green-200 whitespace-pre-wrap"
      >
        {output || 'No output yet.'}
      </div>
    </div>
  );
}

export default Terminal;
