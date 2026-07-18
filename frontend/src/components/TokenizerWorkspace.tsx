import { useState } from 'react';
import { Sparkles, Loader2, Play, Search, Code, BookOpen, Layers } from 'lucide-react';
import { Button } from './ui/button';

interface MergeRule {
  pair: [number, number];
  pair_str: [string, string];
  new_id: number;
  new_str: string;
  frequency: number;
}

export function TokenizerWorkspace() {
  // Train Form State
  const [textSource, setTextSource] = useState<'builtin' | 'paste'>('builtin');
  const [builtinName, setBuiltinName] = useState('names');
  const [pasteContent, setPasteContent] = useState('');
  const [vocabSize, setVocabSize] = useState(300);
  const [specialTokens, setSpecialTokens] = useState('<|endoftext|>');
  const [training, setTraining] = useState(false);
  const [tokenizerId, setTokenizerId] = useState<string | null>(null);

  // Loaded Tokenizer Data
  const [vocab, setVocab] = useState<Record<string, string>>({});
  const [merges, setMerges] = useState<MergeRule[]>([]);
  const [vocabSearch, setVocabSearch] = useState('');
  const [mergeSearch, setMergeSearch] = useState('');

  // Interactive Test State
  const [testText, setTestText] = useState('hello world! this is BPE tokenization test.');
  const [encodedTokens, setEncodedTokens] = useState<number[]>([]);
  const [encodedTokensDecoded, setEncodedTokensDecoded] = useState<string[]>([]);
  const [decodedText, setDecodedText] = useState('');
  const [encoding, setEncoding] = useState(false);
  const [decoding, setDecoding] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('weave_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const handleTrain = async () => {
    setTraining(true);
    setTokenizerId(null);
    try {
      const payload = {
        text_source: textSource,
        builtin_name: textSource === 'builtin' ? builtinName : '',
        text_content: textSource === 'paste' ? pasteContent : '',
        vocab_size: vocabSize,
        special_tokens: specialTokens ? specialTokens.split(',').map(s => s.trim()) : [],
        pattern: "'s|'t|'re|'ve|'m|'ll|'d| ?[a-zA-Z]+| ?[0-9]+| ?[^a-zA-Z0-9\\s]+|\\s+(?!\\S)|\\s+"
      };

      const res = await fetch(`/api/Engine/tokenizer/train`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === 'success') {
        setTokenizerId(data.tokenizer_id);
        
        // Fetch Vocab and Merges
        const vocabRes = await fetch(`/api/Engine/tokenizer/${data.tokenizer_id}/vocab`, {
          headers: getAuthHeaders()
        });
        const vocabData = await vocabRes.json();
        if (vocabData.status === 'success') {
          setVocab(vocabData.vocab);
        }

        const mergesRes = await fetch(`/api/Engine/tokenizer/${data.tokenizer_id}/merges`, {
          headers: getAuthHeaders()
        });
        const mergesData = await mergesRes.json();
        if (mergesData.status === 'success') {
          setMerges(mergesData.merges);
        }
      } else {
        alert('Tokenizer training failed: ' + data.message);
      }
    } catch (err: any) {
      alert('Error during tokenizer training: ' + err.message);
    } finally {
      setTraining(false);
    }
  };

  const handleEncode = async () => {
    if (!tokenizerId) return;
    setEncoding(true);
    try {
      const res = await fetch(`/api/Engine/tokenizer/encode`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tokenizer_id: tokenizerId, text: testText })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setEncodedTokens(data.tokens);
        setEncodedTokensDecoded(data.tokens_decoded);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setEncoding(false);
    }
  };

  const handleDecode = async () => {
    if (!tokenizerId || encodedTokens.length === 0) return;
    setDecoding(true);
    try {
      const res = await fetch(`/api/Engine/tokenizer/decode`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tokenizer_id: tokenizerId, tokens: encodedTokens })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setDecodedText(data.text);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setDecoding(false);
    }
  };

  // Filter lists
  const filteredVocab = Object.entries(vocab).filter(([id, val]) => {
    const s = vocabSearch.toLowerCase();
    return id.includes(s) || val.toLowerCase().includes(s);
  });

  const filteredMerges = merges.filter(m => {
    const s = mergeSearch.toLowerCase();
    return m.new_str.toLowerCase().includes(s) || 
           m.pair_str.some(p => p.toLowerCase().includes(s)) ||
           String(m.new_id).includes(s);
  });

  return (
    <div className="flex-1 flex overflow-hidden min-h-0 bg-background text-foreground p-6 gap-6">
      {/* LEFT: Config / Training Panel */}
      <div className="w-80 flex flex-col gap-6 shrink-0 overflow-y-auto pr-2">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col gap-4">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-primary" />
            <span className="text-[11px] text-primary font-medium uppercase tracking-wide">BPE Trainer</span>
          </div>
          <h3 className="text-base font-bold text-foreground">Train tokenizer</h3>
          <p className="text-xs text-muted-foreground leading-normal">
            Configure byte-pair encoding (BPE) merges from raw training corpus.
          </p>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Text source</label>
              <div className="flex bg-background border border-border rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setTextSource('builtin')}
                  className={`flex-1 py-1 rounded-md transition-all font-medium cursor-pointer ${textSource === 'builtin' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                >
                  Builtin dataset
                </button>
                <button
                  onClick={() => setTextSource('paste')}
                  className={`flex-1 py-1 rounded-md transition-all font-medium cursor-pointer ${textSource === 'paste' ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                >
                  Paste text
                </button>
              </div>
            </div>

            {textSource === 'builtin' ? (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Dataset Name</label>
                <select
                  value={builtinName}
                  onChange={(e) => setBuiltinName(e.target.value)}
                  className="w-full h-9 bg-background border border-border rounded-lg px-2 text-xs focus:outline-none focus:border-primary text-foreground"
                >
                  <option value="names">Names (names.txt)</option>
                  <option value="tiny_shakespeare">Shakespeare (input.txt)</option>
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Pasted Corpus</label>
                <textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  className="w-full h-24 bg-background border border-border rounded-lg p-2 text-xs focus:outline-none focus:border-primary font-mono text-foreground"
                  placeholder="Paste text to train tokenizer on..."
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Target Vocab Size</label>
              <input
                type="number"
                value={vocabSize}
                onChange={(e) => setVocabSize(Number(e.target.value))}
                className="w-full h-9 bg-background border border-border rounded-lg px-2.5 text-xs focus:outline-none focus:border-primary text-foreground"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-muted-foreground">Special Tokens (comma separated)</label>
              <input
                type="text"
                value={specialTokens}
                onChange={(e) => setSpecialTokens(e.target.value)}
                className="w-full h-9 bg-background border border-border rounded-lg px-2.5 text-xs focus:outline-none focus:border-primary text-foreground"
                placeholder="e.g. <|endoftext|>"
              />
            </div>

            <Button
              onClick={handleTrain}
              disabled={training}
              className="w-full h-9 bg-primary hover:brightness-110 text-primary-foreground font-medium rounded-lg flex items-center justify-center gap-1.5 cursor-pointer text-xs"
            >
              {training ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Training...
                </>
              ) : (
                <>
                  <Play size={14} /> Train tokenizer
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status / Quick Stats */}
        {tokenizerId && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-lg flex flex-col gap-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Tokenizer Meta</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-border/50 pb-1">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono text-[10px] max-w-[150px] truncate">{tokenizerId}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1">
                <span className="text-muted-foreground">Vocab Size:</span>
                <span className="font-extrabold text-weave-teal">{Object.keys(vocab).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Merges:</span>
                <span className="font-extrabold text-weave-teal">{merges.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CENTER & RIGHT Content */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden min-w-0">
        {/* TOP: Test Bench */}
        {tokenizerId ? (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-lg flex flex-col gap-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <Code size={14} className="text-primary" />
              <span className="text-[11px] text-primary font-medium uppercase tracking-wide">Tokenizer Sandbox</span>
            </div>
            <h3 className="text-sm font-semibold">Interactive test bench</h3>

            <div className="flex gap-4">
              {/* Text Input area */}
              <div className="flex-1 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Input Text</span>
                <textarea
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  className="w-full h-16 bg-background border border-border rounded-xl p-3 text-xs focus:outline-none focus:border-primary text-foreground"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col justify-end gap-2">
                <Button
                  onClick={handleEncode}
                  disabled={encoding}
                  className="bg-weave-indigo hover:brightness-110 text-white font-bold text-xs uppercase px-4 h-9 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  {encoding ? <Loader2 size={12} className="animate-spin" /> : null}
                  Encode
                </Button>
                <Button
                  onClick={handleDecode}
                  disabled={decoding || encodedTokens.length === 0}
                  className="bg-weave-teal hover:brightness-110 text-white font-bold text-xs uppercase px-4 h-9 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  {decoding ? <Loader2 size={12} className="animate-spin" /> : null}
                  Decode
                </Button>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 gap-4 mt-1 text-xs">
              <div className="bg-background border border-border p-3.5 rounded-xl flex flex-col gap-2">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Tokens Visualizer (IDs & Decoded Strings)</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto leading-normal">
                  {encodedTokens.length > 0 ? (
                    encodedTokens.map((t, idx) => (
                      <span
                        key={idx}
                        className="bg-primary/10 border border-primary/20 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 select-all cursor-pointer"
                        title={`Decoded: "${encodedTokensDecoded[idx] || ''}"`}
                      >
                        <span className="text-primary font-bold">{t}</span>
                        <span className="text-muted-foreground">|</span>
                        <span className="text-weave-teal font-medium">
                          {reprString(encodedTokensDecoded[idx] || '')}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground italic text-[11px]">Click encode to tokenize input text.</span>
                  )}
                </div>
              </div>

              <div className="bg-background border border-border p-3.5 rounded-xl flex flex-col gap-2">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Decoded Result</span>
                <div className="flex-1 font-mono text-[11px] max-h-24 overflow-y-auto whitespace-pre-wrap select-text leading-normal">
                  {decodedText ? (
                    <span className="text-foreground">{decodedText}</span>
                  ) : (
                    <span className="text-muted-foreground italic">Click decode to reconstruct source string.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-card border border-border border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center text-muted-foreground shadow-sm">
            <Layers size={48} className="text-muted-foreground/30 mb-4 animate-bounce" />
            <h3 className="text-base font-black uppercase text-foreground mb-1">Tokenizer Not Trained Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm">Configure the parameters on the left sidebar and click Train to initialize vocabulary merges.</p>
          </div>
        )}

        {/* BOTTOM: Vocab Browser & Merges Preview Tabs */}
        {tokenizerId && (
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-6">
            {/* Merges Column */}
            <div className="bg-card border border-border rounded-2xl p-5 flex flex-col min-h-0 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                <div className="flex items-center gap-1.5">
                  <BookOpen size={14} className="text-weave-teal" />
                  <h4 className="text-xs font-black uppercase tracking-wider">Learned Merges</h4>
                </div>
                {/* Search merges */}
                <div className="flex items-center bg-background border border-border px-2 rounded-lg text-xs h-7">
                  <Search size={12} className="text-muted-foreground mr-1.5" />
                  <input
                    type="text"
                    placeholder="Search merges..."
                    value={mergeSearch}
                    onChange={(e) => setMergeSearch(e.target.value)}
                    className="bg-transparent border-none text-xs text-foreground focus:outline-none w-32"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border/50 text-[10px] font-black uppercase">
                      <th className="pb-2">Pair IDs</th>
                      <th className="pb-2">Pair Strings</th>
                      <th className="pb-2">Merged ID</th>
                      <th className="pb-2">New Token</th>
                      <th className="pb-2 text-right">Frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMerges.length > 0 ? (
                      filteredMerges.map((m, idx) => (
                        <tr key={idx} className="border-b border-border/30 hover:bg-foreground/5 font-mono text-[10px]">
                          <td className="py-2 text-muted-foreground">({m.pair[0]}, {m.pair[1]})</td>
                          <td className="py-2 text-weave-indigo font-medium">({reprString(m.pair_str[0])}, {reprString(m.pair_str[1])})</td>
                          <td className="py-2 text-primary font-bold">{m.new_id}</td>
                          <td className="py-2 text-weave-teal font-extrabold">{reprString(m.new_str)}</td>
                          <td className="py-2 text-right text-muted-foreground">{m.frequency}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-muted-foreground italic">No merges found matching query.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vocab Column */}
            <div className="bg-card border border-border rounded-2xl p-5 flex flex-col min-h-0 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                <div className="flex items-center gap-1.5">
                  <BookOpen size={14} className="text-weave-indigo" />
                  <h4 className="text-xs font-black uppercase tracking-wider">Vocabulary Mapping</h4>
                </div>
                {/* Search vocab */}
                <div className="flex items-center bg-background border border-border px-2 rounded-lg text-xs h-7">
                  <Search size={12} className="text-muted-foreground mr-1.5" />
                  <input
                    type="text"
                    placeholder="Search vocab..."
                    value={vocabSearch}
                    onChange={(e) => setVocabSearch(e.target.value)}
                    className="bg-transparent border-none text-xs text-foreground focus:outline-none w-32"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-3 gap-2">
                  {filteredVocab.length > 0 ? (
                    filteredVocab.map(([id, val]) => (
                      <div
                        key={id}
                        className="bg-background border border-border p-2 rounded-xl flex items-center justify-between hover:border-primary transition-all font-mono text-[10px] leading-normal"
                      >
                        <span className="text-primary font-bold">{id}</span>
                        <span className="text-weave-teal font-extrabold text-right max-w-[80px] truncate select-all" title={val}>
                          {reprString(val)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 text-center py-4 text-muted-foreground italic">No vocabulary matches.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function reprString(val: string): string {
  if (val === ' ') return '␣';
  if (val === '\n') return '↵';
  if (val === '\t') return '⇥';
  return val;
}
