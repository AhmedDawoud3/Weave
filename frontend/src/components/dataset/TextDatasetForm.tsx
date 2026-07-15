interface TextDatasetFormProps {
  datasetConfig: any;
  onConfigChange: (config: any) => void;
}

export function TextDatasetForm({ datasetConfig, onConfigChange }: TextDatasetFormProps) {
  const textSource = datasetConfig.text_source ?? 'builtin';
  const tokenization = datasetConfig.tokenization ?? 'char';

  return (
    <div className="space-y-5">
      {/* Text Ingest Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
          Corpus Source
        </label>
        <div className="grid grid-cols-3 gap-1 bg-foreground/40 p-1 border border-border rounded-xl">
          {(['builtin', 'upload', 'paste'] as const).map((src) => {
            const labelMap = {
              builtin: 'Built-in',
              upload: 'File Upload',
              paste: 'Paste Text'
            };
            const isActive = textSource === src;
            return (
              <button
                key={src}
                onClick={() => onConfigChange({ 
                  ...datasetConfig, 
                  text_source: src,
                  // clear out other sources if switching
                  builtin_name: src === 'builtin' ? 'tiny_shakespeare' : undefined,
                  file_path: src === 'upload' ? '' : undefined,
                  text_content: src === 'paste' ? 'hello world character level lm model' : undefined
                })}
                className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-primary/20 text-[#40d3b6] shadow-[0_0_8px_rgba(108,60,225,0.15)]' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {labelMap[src]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditional settings based on source */}
      {textSource === 'builtin' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
            Select Corpus
          </label>
          <select
            value={datasetConfig.builtin_name ?? 'tiny_shakespeare'}
            onChange={(e) => onConfigChange({ ...datasetConfig, builtin_name: e.target.value })}
            className="text-xs bg-foreground/40 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary nodrag cursor-pointer"
          >
            <option value="tiny_shakespeare">Tiny Shakespeare (Transformer/LM)</option>
            <option value="names">Names.txt (makemore Bigram/MLP)</option>
          </select>
        </div>
      )}

      {textSource === 'upload' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
            Server File Path
          </label>
          <input
            type="text"
            value={datasetConfig.file_path || ''}
            onChange={(e) => onConfigChange({ ...datasetConfig, file_path: e.target.value })}
            className="text-xs bg-foreground/45 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary nodrag"
            placeholder="e.g. /home/datasets/my_corpus.txt"
          />
        </div>
      )}

      {textSource === 'paste' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
            Paste Corpus Text
          </label>
          <textarea
            value={datasetConfig.text_content || ''}
            onChange={(e) => onConfigChange({ ...datasetConfig, text_content: e.target.value })}
            rows={4}
            className="text-xs bg-foreground/45 border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary nodrag resize-none font-mono"
            placeholder="Type or paste text content here to train next-character predictions..."
          />
        </div>
      )}

      <Separator />

      {/* Tokenization selection */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
          Tokenization Strategy
        </label>
        <div className="grid grid-cols-2 gap-1 bg-foreground/40 p-1 border border-border rounded-xl w-48">
          {(['char', 'bpe'] as const).map((tok) => {
            const labelMap = {
              char: 'Character',
              bpe: 'BPE (Subword)'
            };
            const isActive = tokenization === tok;
            return (
              <button
                key={tok}
                onClick={() => onConfigChange({ ...datasetConfig, tokenization: tok })}
                className={`py-1 text-[10px] font-black uppercase rounded-md transition-all cursor-pointer ${
                  isActive ? 'bg-primary/20 text-[#40d3b6]' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {labelMap[tok]}
              </button>
            );
          })}
        </div>
      </div>

      {tokenization === 'bpe' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
            BPE Vocab Size
          </label>
          <input
            type="number"
            value={datasetConfig.bpe_vocab_size ?? 256}
            onChange={(e) => onConfigChange({ ...datasetConfig, bpe_vocab_size: parseInt(e.target.value) || 256 })}
            className="text-xs bg-foreground/45 border border-border rounded-xl px-3 py-1.5 text-foreground focus:outline-none focus:border-primary nodrag"
          />
        </div>
      )}

      {/* Context Length */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
          Context Length (Block Size)
        </label>
        <input
          type="number"
          value={datasetConfig.context_length ?? 8}
          onChange={(e) => onConfigChange({ ...datasetConfig, context_length: parseInt(e.target.value) || 8 })}
          className="text-xs bg-foreground/45 border border-border rounded-xl px-3 py-1.5 text-foreground focus:outline-none focus:border-primary nodrag font-mono"
        />
        <p className="text-[9px] text-muted-foreground leading-normal">
          Number of historical tokens (T) used to predict the next token.
        </p>
      </div>

      {/* Split Ratio Slider */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
            Train Split Ratio
          </label>
          <span className="text-[10px] text-[#40d3b6] font-mono font-bold">
            {Math.round((datasetConfig.train_split ?? 0.9) * 100)}% Train / {Math.round((1 - (datasetConfig.train_split ?? 0.9)) * 100)}% Val
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="0.95"
          step="0.05"
          value={datasetConfig.train_split ?? 0.9}
          onChange={(e) => onConfigChange({ ...datasetConfig, train_split: parseFloat(e.target.value) })}
          className="w-full accent-primary focus:outline-none nodrag cursor-pointer"
        />
      </div>
    </div>
  );
}

function Separator() {
  return <div className="h-[1px] bg-border my-2" />;
}
