import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Download, Code2, X, Terminal, Loader2, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useWeaveStore } from '../store/useWeaveStore';
import { api } from '../services/api';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';

interface ExportModalProps {
  onClose: () => void;
}

export function ExportModal({ onClose }: ExportModalProps) {
  const { inferredDatasetShape, getFormattedGraph } = useWeaveStore();
  const [activeTab, setActiveTab] = useState<'pytorch' | 'onnx' | 'torchscript'>('pytorch');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [compileShape, setCompileShape] = useState(() => {
    if (inferredDatasetShape) {
      return [1, ...inferredDatasetShape].join(', ');
    }
    return '1, 3, 224, 224';
  });

  const [onnxStatus, setOnnxStatus] = useState<'idle' | 'compiling' | 'success' | 'error'>('idle');
  const [onnxError, setOnnxError] = useState<string | null>(null);

  const [tsStatus, setTsStatus] = useState<'idle' | 'compiling' | 'success' | 'error'>('idle');
  const [tsError, setTsError] = useState<string | null>(null);

  // Compile PyTorch on mount / tab swap
  useEffect(() => {
    if (activeTab === 'pytorch') {
      fetchPyTorch();
    }
  }, [activeTab]);

  // Trigger Prism highlighting when code updates
  useEffect(() => {
    if (activeTab === 'pytorch' && code) {
      Prism.highlightAll();
    }
  }, [code, activeTab]);

  const fetchPyTorch = async () => {
    setLoading(true);
    try {
      const res = await api.engine.exportPyTorch(getFormattedGraph());
      setCode(res.code || '');
    } catch (err: any) {
      setCode(`# Failed to export compiled PyTorch model.\n# Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parseShape = (shapeStr: string): number[] => {
    return shapeStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
  };

  const handleDownloadONNX = async () => {
    setOnnxStatus('compiling');
    setOnnxError(null);
    try {
      const parsedShape = parseShape(compileShape);
      const res = await api.engine.exportONNX(getFormattedGraph(), parsedShape);
      if (res.status === 'success') {
        setOnnxStatus('success');
        if (res.output_path) {
          const dlUrl = `${import.meta.env.VITE_ENGINE_URL || 'http://localhost:8000'}/download?path=${encodeURIComponent(res.output_path)}`;
          window.open(dlUrl, '_blank');
        }
      } else {
        setOnnxStatus('error');
        setOnnxError(res.message || 'ONNX translation failed.');
      }
    } catch (err: any) {
      setOnnxStatus('error');
      setOnnxError(err.message || 'Unable to export ONNX model.');
    }
  };

  const handleDownloadTorchScript = async () => {
    setTsStatus('compiling');
    setTsError(null);
    try {
      const parsedShape = parseShape(compileShape);
      const res = await api.engine.exportTorchScript(getFormattedGraph(), parsedShape);
      if (res.status === 'success') {
        setTsStatus('success');
        if (res.output_path) {
          const dlUrl = `${import.meta.env.VITE_ENGINE_URL || 'http://localhost:8000'}/download?path=${encodeURIComponent(res.output_path)}`;
          window.open(dlUrl, '_blank');
        }
      } else {
        setTsStatus('error');
        setTsError(res.message || 'TorchScript compilation failed.');
      }
    } catch (err: any) {
      setTsStatus('error');
      setTsError(err.message || 'Unable to export TorchScript model.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl h-[550px] bg-card border border-border p-8 rounded-2xl shadow-2xl relative flex flex-col justify-between overflow-hidden text-foreground"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground rounded-lg transition-all cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col gap-1 mb-6 shrink-0">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-primary animate-pulse" />
            <span className="text-[10px] text-primary font-black uppercase tracking-widest">Model Exporter</span>
          </div>
          <h2 className="text-2xl font-black uppercase text-foreground tracking-wide">Export Compiled Artifacts</h2>
          <p className="text-xs text-muted-foreground">Download or copy structural code representations generated by the compilation engine.</p>
        </div>

        {/* Export Tabs */}
        <div className="flex gap-4 border-b border-border mb-6 shrink-0">
          <button
            onClick={() => setActiveTab('pytorch')}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'pytorch' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code2 size={14} /> PyTorch Code
          </button>
          <button
            onClick={() => setActiveTab('onnx')}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'onnx' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Terminal size={14} /> ONNX Graph binary
          </button>
          <button
            onClick={() => setActiveTab('torchscript')}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider pb-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'torchscript' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Terminal size={14} /> TorchScript binary
          </button>
        </div>

        {/* Compilation Input Shape Configuration */}
        {activeTab !== 'pytorch' && (
          <div className="flex items-center gap-3 bg-background border border-border px-4 py-2.5 rounded-xl mb-4 shrink-0 text-xs select-none">
            <span className="font-extrabold uppercase text-primary tracking-wider text-[10px] shrink-0">
              Compilation Shape:
            </span>
            <input
              type="text"
              value={compileShape}
              onChange={(e) => setCompileShape(e.target.value)}
              className="flex-1 bg-foreground/40 border border-border rounded-lg px-2.5 py-1 text-foreground font-mono focus:outline-none focus:border-primary nodrag"
              placeholder="e.g. 1, 3, 224, 224"
            />
            <span className="text-[10px] text-muted-foreground italic">
              (Batch, Channels, Height, Width)
            </span>
          </div>
        )}

        {/* Content Box */}
        <div className="flex-1 min-h-0 bg-background rounded-xl border border-border p-4 font-mono text-xs overflow-y-auto mb-6 relative">
          {activeTab === 'pytorch' ? (
            loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 size={24} className="animate-spin text-primary" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Synthesizing PyTorch Module...</p>
              </div>
            ) : (
              <pre className="language-python text-foreground/90 leading-relaxed whitespace-pre-wrap select-text p-0 m-0 bg-transparent">
                <code className="language-python">{code}</code>
              </pre>
            )
          ) : activeTab === 'onnx' ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-6 max-w-md mx-auto">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                <Terminal size={24} className="text-primary/70" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-2">Export ONNX Binary Graph</h3>
                <p className="text-xs text-muted-foreground leading-normal">ONNX compiles your visual network configurations into cross-platform binary representations, enabling low-latency inference runtimes in C++, Rust, or JavaScript.</p>
              </div>

              {onnxStatus === 'compiling' && (
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-primary animate-pulse">
                  <Loader2 size={12} className="animate-spin" /> Compiling ONNX structure...
                </div>
              )}

              {onnxStatus === 'success' && (
                <div className="text-[10px] uppercase font-bold text-weave-teal">
                  🎉 Graph successfully compiled & download initiated!
                </div>
              )}

              {onnxStatus === 'error' && (
                <div className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
                  ❌ Compilation Failed: {onnxError}
                </div>
              )}

              <Button
                onClick={handleDownloadONNX}
                disabled={onnxStatus === 'compiling'}
                className="mt-2 bg-primary hover:brightness-110 text-primary-foreground font-extrabold px-6 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Download size={14} /> GENERATE & DOWNLOAD ONNX
              </Button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-6 max-w-md mx-auto">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                <Terminal size={24} className="text-primary/70" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider mb-2">Export TorchScript Binary</h3>
                <p className="text-xs text-muted-foreground leading-normal">TorchScript serializes your visual model graph into a compiled TorchScript tracing configuration, ready for high-performance deployment without any Python runtime dependency.</p>
              </div>

              {tsStatus === 'compiling' && (
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-primary animate-pulse">
                  <Loader2 size={12} className="animate-spin" /> Tracing TorchScript structure...
                </div>
              )}

              {tsStatus === 'success' && (
                <div className="text-[10px] uppercase font-bold text-weave-teal">
                  🎉 Model successfully traced & download initiated!
                </div>
              )}

              {tsStatus === 'error' && (
                <div className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
                  ❌ Compilation Failed: {tsError}
                </div>
              )}

              <Button
                onClick={handleDownloadTorchScript}
                disabled={tsStatus === 'compiling'}
                className="mt-2 bg-primary hover:brightness-110 text-primary-foreground font-extrabold px-6 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Download size={14} /> GENERATE & DOWNLOAD TORCHSCRIPT
              </Button>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex justify-end gap-4 shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-border hover:bg-foreground/5 text-muted-foreground hover:text-foreground rounded-xl px-6 h-11 text-xs font-bold cursor-pointer"
          >
            CLOSE
          </Button>
          {activeTab === 'pytorch' && (
            <Button
              onClick={handleCopy}
              disabled={loading}
              className="bg-primary hover:brightness-110 text-primary-foreground font-extrabold rounded-xl px-6 h-11 text-xs uppercase flex items-center gap-2 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={14} /> COPIED!
                </>
              ) : (
                <>
                  <Copy size={14} /> COPY MODULE CODE
                </>
              )}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
