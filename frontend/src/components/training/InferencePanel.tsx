import { useState, useEffect } from 'react';
import { Play, Sparkles, BarChart2, Loader2, Sparkle, RefreshCw } from 'lucide-react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useWeaveStore } from '../../store/useWeaveStore';
import { useTrainingStore } from '../../store/useTrainingStore';

export function InferencePanel() {
  const { inferredDatasetShape, getFormattedGraph, datasetConfig } = useWeaveStore();
  const { activeRunId } = useTrainingStore();

  const [panelTab, setPanelTab] = useState<'predict' | 'generate'>('predict');

  // Predict mode state
  const [checkpointPath, setCheckpointPath] = useState('data/checkpoints/best.pt');
  const [inferenceInput, setInferenceInput] = useState('');
  const [inferenceLoading, setInferenceLoading] = useState(false);
  const [inferenceResult, setInferenceResult] = useState<any | null>(null);
  const [inferenceError, setInferenceError] = useState<string | null>(null);

  // Generative mode state
  const [runId, setRunId] = useState('');
  const [prompt, setPrompt] = useState('Once upon a time');
  const [maxTokens, setMaxTokens] = useState(100);
  const [temperature, setTemperature] = useState(0.8);
  const [genLoading, setGenLoading] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [genError, setGenError] = useState<string | null>(null);

  // Sync runId from store
  useEffect(() => {
    if (activeRunId) {
      setRunId(activeRunId);
    }
  }, [activeRunId]);

  // Set default tab based on dataset config type
  useEffect(() => {
    if (datasetConfig?.source === 'custom' && (datasetConfig as any).modality === 'text') {
      setPanelTab('generate');
    } else {
      setPanelTab('predict');
    }
  }, [datasetConfig]);

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

  const handleGenerateText = async () => {
    if (!runId) {
      setGenError('Run ID is required for generative text models.');
      return;
    }
    setGenLoading(true);
    setGenError(null);
    setGeneratedText('');

    try {
      const response = await fetch(`${import.meta.env.VITE_ENGINE_URL || 'http://localhost:8000'}/inference/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_id: runId,
          prompt: prompt,
          max_tokens: maxTokens,
          temperature: temperature
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response stream not readable.');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.token) {
                setGeneratedText((prev) => prev + data.token);
              }
              if (data.done) {
                break;
              }
            } catch (e) {
              // Parse error
            }
          }
        }
      }
    } catch (err: any) {
      setGenError(err.message || 'Streaming generation failed.');
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-sm h-full select-none">
      {/* Header Selector */}
      <div className="flex bg-foreground/45 border border-border rounded-xl p-0.5 shrink-0 self-start text-xs nodrag">
        <button
          onClick={() => setPanelTab('predict')}
          className={`px-3 py-1.5 font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${panelTab === 'predict'
            ? 'bg-primary/20 text-primary border border-primary/10 shadow-[0_0_8px_rgba(108,60,225,0.1)]'
            : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Predictive Mode
        </button>
        <button
          onClick={() => setPanelTab('generate')}
          className={`px-3 py-1.5 font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${panelTab === 'generate'
            ? 'bg-primary/20 text-primary border border-primary/10 shadow-[0_0_8px_rgba(108,60,225,0.1)]'
            : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Text Generation Mode
        </button>
      </div>

      {panelTab === 'predict' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 min-h-0">
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 min-h-0">
          {/* Autoregressive config */}
          <div className="space-y-4 text-left overflow-y-auto pr-2">
            <h3 className="text-xs text-primary font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkle size={13} className="text-primary" /> Text Generation Parameters
            </h3>

            <div className="space-y-1.5 flex flex-col">
              <Label className="text-[10px] text-muted-foreground uppercase font-bold">Active Run ID</Label>
              <Input
                type="text"
                value={runId}
                onChange={(e) => setRunId(e.target.value)}
                className="bg-background border border-border rounded-xl h-10 text-xs text-foreground"
                placeholder="e.g. 1a2b3c4d..."
              />
            </div>

            <div className="space-y-1.5 flex flex-col">
              <Label className="text-[10px] text-muted-foreground uppercase font-bold">Prompt Context</Label>
              <Input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="bg-background border border-border rounded-xl h-10 text-xs text-foreground"
                placeholder="e.g. Once upon a time"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 flex flex-col">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">Max Tokens</Label>
                <Input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="bg-background border border-border rounded-xl h-10 text-xs text-foreground"
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">Temperature</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-xs font-mono w-8 text-right">{temperature}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerateText}
              disabled={genLoading}
              className="w-full mt-4 bg-primary hover:brightness-110 text-primary-foreground font-black px-6 rounded-xl flex items-center justify-center gap-2 h-11 cursor-pointer shadow-glow"
            >
              {genLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              START TEXT STREAM GENERATION
            </Button>
          </div>

          {/* Autoregressive Text Output */}
          <div className="space-y-4 text-left overflow-y-auto pr-2">
            <h3 className="text-xs text-primary font-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <BarChart2 size={13} /> Generated Text Output
            </h3>

            <div className="bg-background border border-border rounded-xl p-5 min-h-[220px] flex flex-col select-text font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[300px]">
              {genError && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg leading-relaxed font-mono">
                  ❌ Streaming Error:
                  <br />
                  {genError}
                </div>
              )}

              {generatedText ? (
                <span className="text-foreground">{generatedText}</span>
              ) : (
                !genError && (
                  <div className="text-center text-muted-foreground/30 text-[10px] uppercase font-bold tracking-widest py-12 self-center">
                    {genLoading ? 'Spawning language model & streaming...' : 'Waiting to generate sequence...'}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
