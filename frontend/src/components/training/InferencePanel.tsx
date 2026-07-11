import { useState } from 'react';
import { Play, Sparkles, BarChart2, Loader2 } from 'lucide-react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useWeaveStore } from '../../store/useWeaveStore';

export function InferencePanel() {
  const { inferredDatasetShape, getFormattedGraph } = useWeaveStore();

  const [checkpointPath, setCheckpointPath] = useState('data/checkpoints/best.pt');
  const [inferenceInput, setInferenceInput] = useState('');
  const [inferenceLoading, setInferenceLoading] = useState(false);
  const [inferenceResult, setInferenceResult] = useState<any | null>(null);
  const [inferenceError, setInferenceError] = useState<string | null>(null);

  const generatePresetInput = (type: 'random' | 'zeros' | 'ones') => {
    const inputShape = inferredDatasetShape || [3, 224, 224];
    const totalSize = inputShape.reduce((a, b) => a * b, 1);

    let values: number[] = [];
    if (type === 'random') {
      values = Array.from({ length: totalSize }, () => Math.random());
    } else if (type === 'zeros') {
      values = Array.from({ length: totalSize }, () => 0);
    } else if (type === 'ones') {
      values = Array.from({ length: totalSize }, () => 1);
    }

    setInferenceInput(JSON.stringify([values]));
  };

  const handleRunInference = async () => {
    setInferenceLoading(true);
    setInferenceError(null);
    setInferenceResult(null);
    try {
      let parsedInput: number[][];
      try {
        parsedInput = JSON.parse(inferenceInput);
        if (!Array.isArray(parsedInput) || !Array.isArray(parsedInput[0])) {
          throw new Error('Input must be a 2D JSON array, e.g. [[1.0, 2.0, ...]]');
        }
      } catch (e: any) {
        const values = inferenceInput
          .split(',')
          .map((s) => parseFloat(s.trim()))
          .filter((n) => !isNaN(n));
        if (values.length === 0) {
          throw new Error('Unable to parse inputs. Please enter a valid comma-separated list or JSON 2D array.');
        }
        parsedInput = [values];
      }

      const formattedGraph = getFormattedGraph();
      const res = await fetch(`${import.meta.env.VITE_ENGINE_URL || 'http://localhost:8000'}/inference/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graph: formattedGraph,
          checkpoint_path: checkpointPath,
          input: parsedInput
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.status === 'success') {
        setInferenceResult(data);
      } else {
        setInferenceError(data.message || 'Inference execution failed.');
      }
    } catch (err: any) {
      setInferenceError(err.message || 'Inference call failed.');
    } finally {
      setInferenceLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm max-w-5xl h-full select-none">
      {/* Input Config Panel */}
      <div className="space-y-4 text-left overflow-y-auto pr-2">
        <h3 className="text-xs text-primary font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles size={13} className="text-primary" /> Predict Input Parameters
        </h3>

        <div className="space-y-1.5 flex flex-col">
          <Label className="text-[10px] text-muted-foreground uppercase font-bold">Model Checkpoint Path</Label>
          <Input
            type="text"
            value={checkpointPath}
            onChange={(e) => setCheckpointPath(e.target.value)}
            className="bg-background border border-border rounded-xl h-10 text-xs text-foreground"
            placeholder="e.g. data/checkpoints/best.pt"
          />
        </div>

        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <Label className="text-[10px] text-muted-foreground uppercase font-bold">Input Values (2D JSON or CSV)</Label>
            <span className="text-[10px] text-primary font-mono">
              Expected shape: {inferredDatasetShape ? `[1, ${inferredDatasetShape.join(', ')}]` : 'Any'}
            </span>
          </div>
          <textarea
            value={inferenceInput}
            onChange={(e) => setInferenceInput(e.target.value)}
            rows={4}
            className="w-full text-xs font-mono bg-background border border-border rounded-xl p-3.5 focus:outline-none focus:border-primary text-foreground nodrag"
            placeholder="[[1.0, 1.0, 1.0...]] or comma-separated numbers"
          />

          {/* Preset Actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => generatePresetInput('random')}
              className="px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary hover:text-foreground transition-all text-[9px] font-black uppercase tracking-wider cursor-pointer"
            >
              🎲 Random Noise
            </button>
            <button
              onClick={() => generatePresetInput('zeros')}
              className="px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary hover:text-foreground transition-all text-[9px] font-black uppercase tracking-wider cursor-pointer"
            >
              All Zeros
            </button>
            <button
              onClick={() => generatePresetInput('ones')}
              className="px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary hover:text-foreground transition-all text-[9px] font-black uppercase tracking-wider cursor-pointer"
            >
              All Ones
            </button>
          </div>
        </div>

        <Button
          onClick={handleRunInference}
          disabled={inferenceLoading}
          className="w-full mt-4 bg-primary hover:brightness-110 text-primary-foreground font-black px-6 rounded-xl flex items-center justify-center gap-2 h-11 cursor-pointer shadow-glow"
        >
          {inferenceLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          RUN PREDICTIVE INFERENCE
        </Button>
      </div>

      {/* Visual Output Panel */}
      <div className="space-y-4 text-left overflow-y-auto pr-2">
        <h3 className="text-xs text-primary font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <BarChart2 size={13} /> Evaluation Output
        </h3>

        <div className="bg-background border border-border rounded-xl p-4 min-h-[200px] flex flex-col justify-center select-text">
          {inferenceError && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg leading-relaxed font-mono">
              ❌ Evaluation Error:
              <br />
              {inferenceError}
            </div>
          )}

          {inferenceResult && (
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase font-black tracking-wider border-b border-border pb-1.5">
                <span>Status: {inferenceResult.status}</span>
                <span>Output Shape: [{inferenceResult.output_shape?.join(', ')}]</span>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-bold text-weave-teal uppercase tracking-wider">Predictions:</div>
                <pre className="p-3 bg-foreground/40 border border-border rounded-xl text-[10px] overflow-x-auto text-foreground leading-relaxed max-h-[160px] overflow-y-auto">
                  {JSON.stringify(inferenceResult.prediction, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {!inferenceResult && !inferenceError && (
            <div className="text-center text-muted-foreground/30 text-[10px] uppercase font-bold tracking-widest py-8">
              Waiting for evaluation run...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
