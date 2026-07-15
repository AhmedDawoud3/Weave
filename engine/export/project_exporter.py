import os
import io
import zipfile
import json
from schemas import TrainingConfig
from compiler.exporter import generate_pytorch_code

def export_project(config: TrainingConfig, tokenizer_path: str | None = None) -> bytes:
    """Generates a complete standalone PyTorch project and returns it as zip bytes."""
    
    # Check if this is a GPT-2 (124M) model template
    is_gpt2 = False
    for node in config.model_graph.nodes:
        node_type = getattr(node, "type", "")
        if "GPT-2" in node_type or "GPT2" in node_type or "gpt2" in node_type.lower():
            is_gpt2 = True
            break

    # 1. Generate model.py
    if is_gpt2:
        model_code = get_gpt2_model_code()
    else:
        model_code = generate_pytorch_code(config.model_graph)

    # 2. Generate config.py
    config_code = get_config_code(config)

    # 3. Generate dataset.py
    dataset_code = get_dataset_code(config)

    # 4. Generate train.py
    train_code = get_train_code(config, is_gpt2)

    # 5. Generate generate.py (for sequence models)
    is_seq_model = config.dataset_config.source == "text"
    generate_code = get_generate_code(config, is_gpt2) if is_seq_model else ""

    # 6. Generate requirements.txt
    requirements = get_requirements_txt(config)

    # 7. Generate README.md
    readme = get_readme_md(config, is_gpt2)

    # Build the zip archive in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("model.py", model_code)
        zip_file.writestr("config.py", config_code)
        zip_file.writestr("dataset.py", dataset_code)
        zip_file.writestr("train.py", train_code)
        zip_file.writestr("requirements.txt", requirements)
        zip_file.writestr("README.md", readme)
        
        if is_seq_model and generate_code:
            zip_file.writestr("generate.py", generate_code)

        # Include tokenizer files if applicable
        if is_seq_model and tokenizer_path and os.path.exists(tokenizer_path):
            try:
                with open(tokenizer_path, encoding="utf-8") as f:
                    tok_data = f.read()
                zip_file.writestr("tokenizer.json", tok_data)
                
                # Standalone tokenizer.py loader
                tokenizer_module_code = get_tokenizer_module_code()
                zip_file.writestr("tokenizer.py", tokenizer_module_code)
            except Exception:
                pass

    return zip_buffer.getvalue()

def get_config_code(config: TrainingConfig) -> str:
    # Format config values into a clean dictionary and variables
    loss_dict = config.loss.model_dump()
    opt_dict = config.optimizer.model_dump()
    sched_dict = config.scheduler.model_dump() if config.scheduler else None
    train_dict = config.training.model_dump()
    
    return f"""# config.py - Hyperparameter configurations for training and inference

CONFIG = {{
    "epochs": {train_dict.get('epochs', 10)},
    "batch_size": {train_dict.get('dataloader', {}).get('batch_size', 32) if train_dict.get('dataloader') else 32},
    "device": "{train_dict.get('device', 'cuda')}",
    "mixed_precision": {train_dict.get('mixed_precision', False)},
    "gradient_clip_norm": {train_dict.get('gradient_clip_norm', 1.0)},
    "gradient_accumulation_steps": {train_dict.get('gradient_accumulation_steps', 1)},
    "validation_frequency": {train_dict.get('validation_frequency', 1)},
    
    # Optimizer settings
    "optimizer_type": "{opt_dict.get('type', 'AdamW')}",
    "optimizer_params": {json.dumps(opt_dict.get('params', {}), indent=4)},
    
    # Loss settings
    "loss_type": "{loss_dict.get('type', 'CrossEntropyLoss')}",
    "loss_params": {json.dumps(loss_dict.get('params', {}), indent=4)},
    
    # Scheduler settings
    "scheduler": {json.dumps(sched_dict, indent=4)}
}}
"""

def get_dataset_code(config: TrainingConfig) -> str:
    ds_config = config.dataset_config
    if ds_config.source == "text":
        code = """# dataset.py - Autoregressive Sequence/Text dataset
import os
import torch
from torch.utils.data import Dataset, DataLoader

class StandaloneTextDataset(Dataset):
    def __init__(self, text_path=None, text_content=None, context_length=8, split="train", train_split=0.9, tokenization="char"):
        self.context_length = context_length
        self.tokenization = tokenization
        
        # 1. Load Text
        if text_path and os.path.exists(text_path):
            with open(text_path, encoding="utf-8") as f:
                text = f.read()
        elif text_content:
            text = text_content
        else:
            text = "Dummy text corpus to fallback on for testing model training." * 100

        # 2. Tokenization setup
        if tokenization == "bpe" and os.path.exists("tokenizer.json"):
            from tokenizer import StandaloneBPETokenizer
            self.tokenizer = StandaloneBPETokenizer.load("tokenizer.json")
            self.vocab_size = len(self.tokenizer.vocab)
            encoded = self.tokenizer.encode(text)
            data = torch.tensor(encoded, dtype=torch.long)
        else:
            self.tokenizer = None
            chars = sorted(list(set(text)))
            self.vocab_size = len(chars)
            self.stoi = {c: i for i, c in enumerate(chars)}
            self.itos = {i: c for i, c in enumerate(chars)}
            data = torch.tensor([self.stoi[c] for c in text if c in self.stoi], dtype=torch.long)
            
        n = int(train_split * len(data))
        self.data = data[:n] if split == "train" else data[n:]

    def __len__(self):
        return max(0, len(self.data) - self.context_length)

    def __getitem__(self, idx):
        chunk = self.data[idx : idx + self.context_length + 1]
        x = chunk[:-1]
        y = chunk[1:]
        return x, y

def get_dataloaders(batch_size=32):
    # Setup dataset configurations
    train_dataset = StandaloneTextDataset(
        context_length=CONTEXT_LENGTH_PLACEHOLDER,
        tokenization="TOKENIZATION_PLACEHOLDER",
        train_split=TRAIN_SPLIT_PLACEHOLDER
    )
    val_dataset = StandaloneTextDataset(
        context_length=CONTEXT_LENGTH_PLACEHOLDER,
        tokenization="TOKENIZATION_PLACEHOLDER",
        split="val",
        train_split=TRAIN_SPLIT_PLACEHOLDER
    )
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    return train_loader, val_loader, train_dataset
"""
        return code.replace("CONTEXT_LENGTH_PLACEHOLDER", str(getattr(ds_config, "context_length", 8)))\
                   .replace("TOKENIZATION_PLACEHOLDER", getattr(ds_config, "tokenization", "char"))\
                   .replace("TRAIN_SPLIT_PLACEHOLDER", str(getattr(ds_config, "train_split", 0.9)))
    else:
        # Standard predefined or custom image/tabular loader
        return """# dataset.py - Dataset loaders for Image/Tabular datasets
import torch
import torchvision
import torchvision.transforms as transforms
from torch.utils.data import DataLoader

def get_dataloaders(batch_size=32):
    # Fallback to predefined MNIST for demonstration/testing
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,))
    ])
    
    train_dataset = torchvision.datasets.MNIST(root='./data', train=True, download=True, transform=transform)
    val_dataset = torchvision.datasets.MNIST(root='./data', train=False, download=True, transform=transform)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    
    return train_loader, val_loader, train_dataset
"""

def get_train_code(config: TrainingConfig, is_gpt2: bool) -> str:
    code = """# train.py - Full Standalone training script
import os
import torch
import torch.nn as nn
import torch.optim as optim
from config import CONFIG
from model import Model
from dataset import get_dataloaders

def train():
    device = torch.device(CONFIG["device"] if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}")
    
    # 1. Load data loaders
    train_loader, val_loader, dataset = get_dataloaders(batch_size=CONFIG["batch_size"])
    
    # 2. Instantiate model
    model = Model().to(device)
    
    # If GPT-2, tie weights & optionally load HuggingFace weights
    if IS_GPT2_PLACEHOLDER:
        print("Initializing GPT-2 weights...")
        # (Weight tying is handled in model.py)
        
    # 3. Optimizer and Loss Setup
    opt_type = CONFIG["optimizer_type"]
    if opt_type == "AdamW":
        optimizer = optim.AdamW(model.parameters(), **CONFIG["optimizer_params"])
    elif opt_type == "Adam":
        optimizer = optim.Adam(model.parameters(), **CONFIG["optimizer_params"])
    else:
        optimizer = optim.SGD(model.parameters(), **CONFIG["optimizer_params"])
        
    # Loss
    if CONFIG["loss_type"] == "CrossEntropyLoss":
        loss_fn = nn.CrossEntropyLoss()
    elif CONFIG["loss_type"] == "MSELoss":
        loss_fn = nn.MSELoss()
    else:
        loss_fn = nn.BCEWithLogitsLoss()
        
    best_loss = float("inf")
    
    # 4. Training Loop
    for epoch in range(1, CONFIG["epochs"] + 1):
        model.train()
        total_loss = 0.0
        for batch_idx, (inputs, targets) in enumerate(train_loader):
            inputs, targets = inputs.to(device), targets.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            
            # Reshape inputs/outputs if sequence modeling
            if outputs.dim() == 3:
                # (B, T, V) -> (B*T, V)
                outputs = outputs.view(-1, outputs.size(-1))
                targets = targets.view(-1)
                
            loss = loss_fn(outputs, targets)
            loss.backward()
            
            if CONFIG["gradient_clip_norm"] > 0:
                nn.utils.clip_grad_norm_(model.parameters(), CONFIG["gradient_clip_norm"])
                
            optimizer.step()
            total_loss += loss.item()
            
        avg_train_loss = total_loss / len(train_loader)
        
        # Validation
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for val_inputs, val_targets in val_loader:
                val_inputs, val_targets = val_inputs.to(device), val_targets.to(device)
                val_outputs = model(val_inputs)
                if val_outputs.dim() == 3:
                    val_outputs = val_outputs.view(-1, val_outputs.size(-1))
                    val_targets = val_targets.view(-1)
                loss = loss_fn(val_outputs, val_targets)
                val_loss += loss.item()
                
        avg_val_loss = val_loss / len(val_loader)
        print(f"Epoch {epoch}/{CONFIG['epochs']} | Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f}")
        
        # Save checkpoint
        if avg_val_loss < best_loss:
            best_loss = avg_val_loss
            os.makedirs("checkpoints", exist_ok=True)
            torch.save(model.state_dict(), "checkpoints/best.pt")
            print("  --> Saved best model checkpoint!")

if __name__ == "__main__":
    train()
"""
    return code.replace("IS_GPT2_PLACEHOLDER", "True" if is_gpt2 else "False")

def get_generate_code(config: TrainingConfig, is_gpt2: bool) -> str:
    code = """# generate.py - Autoregressive Sequence Generator
import os
import torch
from model import Model
from dataset import StandaloneTextDataset

def generate(prompt="", max_tokens=100, temperature=0.8):
    device = torch.device("DEVICE_PLACEHOLDER" if torch.cuda.is_available() else "cpu")
    
    # Load dataset to access vocab/stoi
    dataset = StandaloneTextDataset(context_length=CONTEXT_LENGTH_PLACEHOLDER, tokenization="TOKENIZATION_PLACEHOLDER")
    is_bpe = dataset.tokenization == "bpe"
    
    model = Model().to(device)
    if os.path.exists("checkpoints/best.pt"):
        model.load_state_dict(torch.load("checkpoints/best.pt", map_location=device))
        print("Loaded weights from checkpoints/best.pt")
    model.eval()
    
    # Encode prompt
    if is_bpe:
        context_ids = dataset.tokenizer.encode(prompt) if prompt else [0]
    else:
        context_ids = [dataset.stoi[c] for c in prompt if c in dataset.stoi] if prompt else [0]
        
    print(f"Generating from prompt: {repr(prompt)}")
    print("---------------------------------")
    
    current_context = list(context_ids)
    
    for _ in range(max_tokens):
        # Crop context to model's context_length
        input_ids = current_context[-dataset.context_length:]
        x = torch.tensor([input_ids], dtype=torch.long).to(device)
        
        with torch.no_grad():
            logits = model(x)
            
        if logits.dim() == 3:
            logits = logits[0, -1, :]
        elif logits.dim() == 2:
            logits = logits[0, :]
            
        logits = logits / max(temperature, 1e-5)
        probs = torch.softmax(logits, dim=-1)
        next_id = torch.multinomial(probs, num_samples=1).item()
        
        current_context.append(next_id)
        
        # Decode and print next token in real-time
        if is_bpe:
            print(dataset.tokenizer.decode([next_id]), end="", flush=True)
        else:
            print(dataset.itos.get(next_id, ""), end="", flush=True)
    print("\\n---------------------------------")

if __name__ == "__main__":
    import sys
    prompt = sys.argv[1] if len(sys.argv) > 1 else "Once upon a time"
    generate(prompt=prompt, max_tokens=100)
"""
    return code.replace("DEVICE_PLACEHOLDER", getattr(config.training, "device", "cuda"))\
               .replace("CONTEXT_LENGTH_PLACEHOLDER", str(getattr(config.dataset_config, "context_length", 8)))\
               .replace("TOKENIZATION_PLACEHOLDER", getattr(config.dataset_config, "tokenization", "char"))

def get_tokenizer_module_code() -> str:
    return """# tokenizer.py - Standalone BPE Tokenizer
import re
import json

class StandaloneBPETokenizer:
    def __init__(self, merges=None, vocab=None, special_tokens=None, pattern=None):
        self.merges = merges or {}
        self.vocab = vocab or {}
        self.special_tokens = special_tokens or {}
        self.inverse_special_tokens = {v: k for k, v in self.special_tokens.items()}
        self.pattern = pattern or r"'s|'t|'re|'ve|'m|'ll|'d| ?[a-zA-Z]+| ?[0-9]+| ?[^a-zA-Z0-9\\s]+|\\s+(?!\\S)|\\s+"
        self.compiled_pattern = re.compile(self.pattern)

    @classmethod
    def load(cls, filepath: str):
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
            
        merges = {}
        for k, v in data["merges"].items():
            p0, p1 = map(int, k.split(","))
            merges[(p0, p1)] = v
            
        special_tokens = data.get("special_tokens", {})
        pattern = data.get("pattern")
        
        vocab = {i: bytes([i]) for i in range(256)}
        sorted_merges = sorted(merges.items(), key=lambda x: x[1])
        for (p0, p1), new_id in sorted_merges:
            vocab[new_id] = vocab[p0] + vocab[p1]
            
        for token_str, token_id in special_tokens.items():
            vocab[token_id] = token_str.encode("utf-8")
            
        return cls(merges=merges, vocab=vocab, special_tokens=special_tokens, pattern=pattern)

    def encode(self, text: str) -> list[int]:
        if not self.special_tokens:
            return self._encode_chunk(text)

        sorted_specials = sorted(self.special_tokens.keys(), key=len, reverse=True)
        special_pattern = re.compile("(" + "|".join(re.escape(t) for t in sorted_specials) + ")")
        
        parts = special_pattern.split(text)
        ids = []
        for part in parts:
            if part in self.special_tokens:
                ids.append(self.special_tokens[part])
            else:
                ids.extend(self._encode_chunk(part))
        return ids

    def _encode_chunk(self, text: str) -> list[int]:
        chunks = self.compiled_pattern.findall(text)
        ids = []
        for chunk in chunks:
            chunk_ids = list(chunk.encode("utf-8"))
            while len(chunk_ids) >= 2:
                min_pair = None
                min_val = float("inf")
                for i in range(len(chunk_ids) - 1):
                    pair = (chunk_ids[i], chunk_ids[i+1])
                    if pair in self.merges:
                        val = self.merges[pair]
                        if val < min_val:
                            min_val = val
                            min_pair = pair
                if min_pair is None:
                    break
                
                new_chunk_ids = []
                i = 0
                while i < len(chunk_ids):
                    if i < len(chunk_ids) - 1 and chunk_ids[i] == min_pair[0] and chunk_ids[i+1] == min_pair[1]:
                        new_chunk_ids.append(min_val)
                        i += 2
                    else:
                        new_chunk_ids.append(chunk_ids[i])
                        i += 1
                chunk_ids = new_chunk_ids
            ids.extend(chunk_ids)
        return ids

    def decode(self, ids: list[int]) -> str:
        parts = []
        for token_id in ids:
            if token_id in self.inverse_special_tokens:
                parts.append(self.inverse_special_tokens[token_id].encode("utf-8"))
            elif token_id in self.vocab:
                parts.append(self.vocab[token_id])
            else:
                parts.append(bytes([token_id % 256]))
        return b"".join(parts).decode("utf-8", errors="replace")
"""

def get_requirements_txt(config: TrainingConfig) -> str:
    is_bpe = config.dataset_config.source == "text" and config.dataset_config.tokenization == "bpe"
    pkgs = ["torch>=2.0.0", "torchvision>=0.15.0", "numpy", "pandas"]
    if is_bpe:
        pkgs.append("tiktoken")
    return "\n".join(pkgs) + "\n"

def get_readme_md(config: TrainingConfig, is_gpt2: bool) -> str:
    model_name = "GPT-2 (124M)" if is_gpt2 else "Weave Neural Network"
    return f"""# Standalone Exported Model: {model_name}

This project was automatically compiled and exported from Weave.

## Installation
Ensure you have Python 3.10+ installed. Install python package dependencies using:
```bash
pip install -r requirements.txt
```

## How to Train
Run the training loop script:
```bash
python train.py
```
This will train the model, print train/val losses, and save the best checkpoint weights to `checkpoints/best.pt`.

{"## How to Generate Text\\nRun the text generator using:\\n```bash\\npython generate.py \"Once upon a time\"\\n```" if config.dataset_config.source == "text" else ""}
"""

def get_gpt2_model_code() -> str:
    return '''# model.py - Standalone GPT-2 (124M) PyTorch definition with KV-cache & Weight Tying
import math
import torch
import torch.nn as nn
from torch.nn import functional as F

class GPT2Attention(nn.Module):
    def __init__(self, embed_dim=768, num_heads=12, bias=True, dropout=0.0):
        super().__init__()
        assert embed_dim % num_heads == 0
        self.c_attn = nn.Linear(embed_dim, 3 * embed_dim, bias=bias)
        self.c_proj = nn.Linear(embed_dim, embed_dim, bias=bias)
        self.attn_dropout = nn.Dropout(dropout)
        self.resid_dropout = nn.Dropout(dropout)
        self.embed_dim = embed_dim
        self.num_heads = num_heads
        self.head_dim = embed_dim // num_heads

    def forward(self, x, use_cache=False, cache=None):
        B, T, C = x.size()
        q, k, v = self.c_attn(x).split(self.embed_dim, dim=2)
        
        # Reshape to (B, nh, T, hs)
        q = q.view(B, T, self.num_heads, self.head_dim).transpose(1, 2)
        k = k.view(B, T, self.num_heads, self.head_dim).transpose(1, 2)
        v = v.view(B, T, self.num_heads, self.head_dim).transpose(1, 2)
        
        # KV-caching for efficient text generation
        if use_cache and cache is not None:
            if "k" in cache and "v" in cache:
                k = torch.cat([cache["k"], k], dim=2)
                v = torch.cat([cache["v"], v], dim=2)
            cache["k"] = k
            cache["v"] = v

        # Scaled dot-product attention
        att = (q @ k.transpose(-2, -1)) * (1.0 / math.sqrt(k.size(-1)))
        
        # Causal mask for autoregressive generation
        if not use_cache or cache is None:
            mask = torch.triu(torch.ones(T, T, device=x.device), diagonal=1).bool()
            att = att.masked_fill(mask.unsqueeze(0).unsqueeze(1), float('-inf'))
            
        att = F.softmax(att, dim=-1)
        att = self.attn_dropout(att)
        y = att @ v
        
        # Re-assemble head dimensions
        y = y.transpose(1, 2).contiguous().view(B, T, C)
        y = self.resid_dropout(self.c_proj(y))
        return y

class GPT2Block(nn.Module):
    def __init__(self, embed_dim=768, num_heads=12, bias=True, dropout=0.0):
        super().__init__()
        self.ln_1 = nn.LayerNorm(embed_dim)
        self.attn = GPT2Attention(embed_dim, num_heads, bias, dropout)
        self.ln_2 = nn.LayerNorm(embed_dim)
        self.mlp = nn.Sequential(
            nn.Linear(embed_dim, 4 * embed_dim, bias=bias),
            nn.GELU(),
            nn.Linear(4 * embed_dim, embed_dim, bias=bias),
            nn.Dropout(dropout),
        )

    def forward(self, x, use_cache=False, cache=None):
        x = x + self.attn(self.ln_1(x), use_cache=use_cache, cache=cache)
        x = x + self.mlp(self.ln_2(x))
        return x

class Model(nn.Module):
    def __init__(self, vocab_size=50257, max_seq_len=1024, embed_dim=768, num_heads=12, num_layers=12, dropout=0.0):
        super().__init__()
        self.transformer = nn.ModuleDict(dict(
            wte = nn.Embedding(vocab_size, embed_dim),
            wpe = nn.Embedding(max_seq_len, embed_dim),
            drop = nn.Dropout(dropout),
            h = nn.ModuleList([GPT2Block(embed_dim, num_heads, True, dropout) for _ in range(num_layers)]),
            ln_f = nn.LayerNorm(embed_dim),
        ))
        self.lm_head = nn.Linear(embed_dim, vocab_size, bias=False)
        
        # Weight tying: share embedding and final output projection weights
        self.transformer.wte.weight = self.lm_head.weight
        
        self.apply(self._init_weights)

    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                torch.nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)

    @classmethod
    def from_pretrained(cls, model_type="gpt2"):
        """Loads pre-trained weights from HuggingFace GPT-2 models."""
        from transformers import GPT2LMHeadModel
        print(f"Loading pretrained weights for: {model_type}")
        
        model_hf = GPT2LMHeadModel.from_pretrained(model_type)
        sd_hf = model_hf.state_dict()
        
        config = {
            "gpt2": dict(num_layers=12, num_heads=12, embed_dim=768),
            "gpt2-medium": dict(num_layers=24, num_heads=16, embed_dim=1024),
            "gpt2-large": dict(num_layers=36, num_heads=20, embed_dim=1280),
            "gpt2-xl": dict(num_layers=48, num_heads=25, embed_dim=1600),
        }[model_type]
        
        model = cls(vocab_size=50257, max_seq_len=1024, **config)
        sd = model.state_dict()
        
        # Map state keys from HF to model
        for k in sd.keys():
            if k.endswith(".attn.bias") or k.endswith(".attn.masked_bias"):
                continue
            # Transpose conv1d weights (since HF uses 1d convs)
            if any(x in k for x in [".c_attn.weight", ".c_proj.weight", ".mlp.0.weight", ".mlp.2.weight"]):
                sd[k].copy_(sd_hf[k].t())
            else:
                sd[k].copy_(sd_hf[k])
                
        return model

    def forward(self, idx, use_cache=False, caches=None):
        device = idx.device
        b, t = idx.size()
        pos = torch.arange(0, t, dtype=torch.long, device=device).unsqueeze(0) # (1, t)
        
        x = self.transformer.wte(idx) + self.transformer.wpe(pos)
        x = self.transformer.drop(x)
        
        if caches is None:
            caches = [None] * len(self.transformer.h)
            
        for i, block in enumerate(self.transformer.h):
            x = block(x, use_cache=use_cache, cache=caches[i])
            
        x = self.transformer.ln_f(x)
        logits = self.lm_head(x)
        return logits
'''
