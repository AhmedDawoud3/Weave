import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface CodeTooltipProps {
  code: string;
  children: ReactNode;
}

export function CodeTooltip({ code, children }: CodeTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 280;
    const tooltipHeight = 120;
    const padding = 12;

    let x = rect.left + rect.width / 2 - tooltipWidth / 2;
    let y = rect.top - tooltipHeight - padding;

    // Keep tooltip within viewport
    if (x < padding) x = padding;
    if (x + tooltipWidth > window.innerWidth - padding) {
      x = window.innerWidth - tooltipWidth - padding;
    }

    // If tooltip would go above viewport, show below instead
    if (y < padding) {
      y = rect.bottom + padding;
    }

    setPosition({ x, y });
  }, [isVisible]);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-full"
      >
        {children}
      </div>
      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[9999] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150"
            style={{
              left: position.x,
              top: position.y,
            }}
          >
            <div className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 shadow-xl max-w-[280px]">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5 font-semibold">
                PyTorch Code
              </div>
              <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-words leading-relaxed">
                {code}
              </pre>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default CodeTooltip;
