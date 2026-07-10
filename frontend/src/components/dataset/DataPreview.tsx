import { Eye, Loader2, RefreshCw, ChevronLeft, ChevronRight, Music, Table, ArrowDown } from 'lucide-react';
import { Button } from '../ui/button';

interface DataPreviewProps {
  previewLoading: boolean;
  previewResult: {
    samples: any[];
    total_size: number;
    modality: string;
  } | null;
  previewError: string | null;
  previewSampleIndex: number;
  setPreviewSampleIndex: (idx: number | ((prev: number) => number)) => void;
  onFetchPreview: () => void;
}

export function DataPreview({
  previewLoading,
  previewResult,
  previewError,
  previewSampleIndex,
  setPreviewSampleIndex,
  onFetchPreview
}: DataPreviewProps) {
  return (
    <div className="w-[320px] shrink-0 border-l border-sidebar-border bg-sidebar overflow-y-auto no-scrollbar flex flex-col min-w-0">
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between shrink-0 bg-sidebar/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Eye size={15} className="text-[#40d3b6] animate-pulse" />
          <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-[#40d3b6]">Live Preview</h2>
        </div>
        <Button
          onClick={onFetchPreview}
          disabled={previewLoading}
          className="bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/45 rounded-lg h-6 text-[9px] uppercase font-black tracking-wider px-2"
        >
          {previewLoading ? <Loader2 size={10} className="animate-spin mr-1" /> : <RefreshCw size={9} className="mr-1" />}
          Refresh
        </Button>
      </div>

      <div className="p-4 flex-1 min-h-0 space-y-4">
        {previewLoading && !previewResult && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground select-none">
            <Loader2 className="w-8 h-8 animate-spin text-[#40d3b6]" />
            <span className="text-[10px] font-bold tracking-wider uppercase">Loading Previews...</span>
          </div>
        )}

        {previewError && (
          <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl text-red-400 text-[10px] flex gap-2 leading-relaxed">
            <span>⚠️</span>
            <div>
              <span className="font-extrabold uppercase block text-[8px] mb-0.5">Preview State</span>
              {previewError}
            </div>
          </div>
        )}

        {!previewLoading && !previewError && previewResult && (
          <div className="space-y-4">
            {previewResult.samples.length === 0 ? (
              <div className="p-8 text-center text-[10px] text-muted-foreground italic bg-black/10 border border-border rounded-xl">
                No preview samples returned. Verify paths or configurations.
              </div>
            ) : (
              (() => {
                const sample = previewResult.samples[previewSampleIndex];
                if (!sample) return null;
                
                return (
                  <div className="space-y-4 select-text">
                    {/* Pagination Selector */}
                    <div className="flex items-center justify-between bg-black/40 border border-border rounded-xl px-3 py-1.5">
                      <Button
                        disabled={previewSampleIndex === 0}
                        onClick={() => setPreviewSampleIndex(prev => prev - 1)}
                        size="sm"
                        className="h-5 w-5 p-0 bg-white/5 hover:bg-white/10 rounded-md border border-border"
                      >
                        <ChevronLeft size={12} />
                      </Button>
                      <span className="text-[10px] font-mono font-black text-muted-foreground uppercase">
                        Sample {previewSampleIndex + 1} of {previewResult.samples.length}
                      </span>
                      <Button
                        disabled={previewSampleIndex === previewResult.samples.length - 1}
                        onClick={() => setPreviewSampleIndex(prev => prev + 1)}
                        size="sm"
                        className="h-5 w-5 p-0 bg-white/5 hover:bg-white/10 rounded-md border border-border"
                      >
                        <ChevronRight size={12} />
                      </Button>
                    </div>

                    {/* Sample Card */}
                    <div className="bg-black/10 border border-border rounded-2xl overflow-hidden p-4 space-y-4 shadow-lg">
                      {/* Card Header showing Label */}
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                        <span>Sample details</span>
                        <span className="text-[#40d3b6] font-mono font-extrabold bg-[#40d3b6]/10 px-1.5 py-0.5 rounded border border-[#40d3b6]/15">
                          Label: {sample.label}
                        </span>
                      </div>

                      {/* Vertical stack */}
                      <div className="space-y-4">
                        {/* PART A: RAW (BEFORE) */}
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-black uppercase text-muted-foreground/80 tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                            Original (Raw)
                          </div>
                          
                          {previewResult.modality === 'image' && (
                            <div className="aspect-square bg-black/40 border border-border rounded-xl flex items-center justify-center overflow-hidden p-2 relative max-w-[240px] mx-auto">
                              {sample.raw.thumbnail ? (
                                <img src={sample.raw.thumbnail} alt="Raw image" className="max-h-full max-w-full object-contain rounded-lg shadow-md" />
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">Raw preview unavailable</span>
                              )}
                            </div>
                          )}

                          {previewResult.modality === 'text' && (
                            <div className="bg-black/40 border border-border rounded-xl p-3 min-h-[70px] text-xs leading-relaxed text-white/90 font-sans break-words whitespace-pre-wrap select-all">
                              {sample.raw.text || <span className="text-muted-foreground italic">No text content</span>}
                            </div>
                          )}

                          {previewResult.modality === 'tabular' && (
                            <div className="bg-black/40 border border-border rounded-xl p-3 min-h-[70px] text-[10px] font-mono text-white/95 space-y-1 overflow-y-auto max-h-[120px] no-scrollbar select-all">
                              {sample.raw.features && typeof sample.raw.features === 'object' ? (
                                Object.entries(sample.raw.features).map(([k, v]: [string, any]) => (
                                  <div key={k} className="flex justify-between border-b border-border/20 pb-0.5">
                                    <span className="text-muted-foreground truncate mr-2">{k}:</span>
                                    <span className="text-white truncate font-bold">{typeof v === 'number' ? v.toFixed(3) : String(v)}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-muted-foreground italic">No features</span>
                              )}
                            </div>
                          )}

                          {previewResult.modality === 'audio' && (
                            <div className="bg-black/40 border border-border rounded-xl p-3 min-h-[70px] text-[10px] font-mono text-muted-foreground space-y-1 select-all">
                              <div className="text-white font-extrabold uppercase text-[9px] flex items-center gap-1.5"><Music size={11} /> Waveform Stats</div>
                              <div className="space-y-0.5 bg-[#050507] border border-border rounded p-1 text-[10px]">
                                <div className="flex justify-between"><span className="text-muted-foreground">Mean Power:</span><span>{sample.raw.mean?.toFixed(4) || '0'}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Min Amp:</span><span>{sample.raw.min?.toFixed(4) || '0'}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Max Amp:</span><span>{sample.raw.max?.toFixed(4) || '0'}</span></div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Arrow connector */}
                        <div className="flex flex-col items-center gap-0.5 select-none">
                          <ArrowDown size={12} className="text-[#40d3b6] animate-pulse" />
                          <span className="text-[9px] uppercase tracking-wider text-[#40d3b6]/80 font-black">Applied Pipeline</span>
                        </div>

                        {/* PART B: TRANSFORMED (AFTER) */}
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-black uppercase text-[#40d3b6] tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#40d3b6]" />
                            Transformed
                          </div>

                          {previewResult.modality === 'image' && (
                            <div className="aspect-square bg-black/40 border border-[#40d3b6]/20 rounded-xl flex items-center justify-center overflow-hidden p-2 relative max-w-[240px] mx-auto">
                              {sample.transformed.thumbnail ? (
                                <img src={sample.transformed.thumbnail} alt="Transformed image" className="max-h-full max-w-full object-contain rounded-lg shadow-md" />
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">Processed preview unavailable</span>
                              )}
                            </div>
                          )}

                          {previewResult.modality === 'text' && (
                            <div className="bg-black/40 border border-[#40d3b6]/20 rounded-xl p-3 min-h-[70px] text-xs leading-relaxed text-[#40d3b6] font-mono break-words whitespace-pre-wrap select-all">
                              {Array.isArray(sample.transformed.tokens) 
                                ? sample.transformed.tokens.join(', ') 
                                : (sample.transformed.text || <span className="text-muted-foreground italic">No tokens</span>)}
                            </div>
                          )}

                          {previewResult.modality === 'tabular' && (
                            <div className="bg-black/40 border border-[#40d3b6]/20 rounded-xl p-3 min-h-[70px] text-[10px] font-mono text-[#40d3b6] space-y-1 overflow-y-auto max-h-[120px] no-scrollbar select-all">
                              {sample.transformed.features ? (
                                `[${sample.transformed.features.map((n: number) => n.toFixed(4)).join(', ')}]`
                              ) : (
                                <span className="text-muted-foreground italic">No transformed features</span>
                              )}
                            </div>
                          )}

                          {previewResult.modality === 'audio' && (
                            <div className="bg-black/40 border border-[#40d3b6]/20 rounded-xl p-3 min-h-[70px] text-[10px] font-mono text-[#40d3b6] space-y-1.5 select-all">
                              <div className="text-primary font-extrabold uppercase text-[9px] flex items-center justify-between">
                                <span className="flex items-center gap-1.5"><Table size={11} /> Spectral Features</span>
                                {sample.transformed.shape && (
                                  <span>Shape: {sample.transformed.shape.join('×')}</span>
                                )}
                              </div>
                              <div className="space-y-0.5 bg-[#050507] border border-border rounded p-1 text-[10px]">
                                <div className="flex justify-between"><span className="text-muted-foreground">Mean Power:</span><span>{sample.transformed.mean?.toFixed(4) || '0'}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Min Amp:</span><span>{sample.transformed.min?.toFixed(4) || '0'}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Max Amp:</span><span>{sample.transformed.max?.toFixed(4) || '0'}</span></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Extra size/modality banner */}
                    <div className="text-[10px] text-muted-foreground font-mono bg-white/[0.02] border border-border p-2 rounded-xl text-center space-y-0.5">
                      <div>Total Size: <strong className="text-white">{previewResult.total_size}</strong> samples</div>
                      <div>Modality: <strong className="text-[#40d3b6] uppercase font-black">{previewResult.modality}</strong></div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>
    </div>
  );
}
