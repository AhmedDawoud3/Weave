import json
import os
from .tokenizer import BPETokenizer

def save_tokenizer(tokenizer: BPETokenizer, filepath: str):
    json_merges = {f"{k[0]},{k[1]}": v for k, v in tokenizer.merges.items()}
    # Save frequencies if present on tokenizer
    frequencies = getattr(tokenizer, "frequencies", {})
    data = {
        "merges": json_merges,
        "frequencies": frequencies,
        "special_tokens": tokenizer.special_tokens,
        "pattern": tokenizer.pattern
    }
    os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def load_tokenizer(filepath: str) -> BPETokenizer:
    with open(filepath, encoding="utf-8") as f:
        data = json.load(f)
    
    merges = {}
    for k, v in data["merges"].items():
        p0, p1 = map(int, k.split(","))
        merges[(p0, p1)] = v
        
    special_tokens = data.get("special_tokens", {})
    pattern = data.get("pattern")
    frequencies = data.get("frequencies", {})
    
    vocab = {i: bytes([i]) for i in range(256)}
    sorted_merges = sorted(merges.items(), key=lambda x: x[1])
    for (p0, p1), new_id in sorted_merges:
        vocab[new_id] = vocab[p0] + vocab[p1]
        
    for token_str, token_id in special_tokens.items():
        vocab[token_id] = token_str.encode("utf-8")
        
    tokenizer = BPETokenizer(merges=merges, vocab=vocab, special_tokens=special_tokens, pattern=pattern)
    tokenizer.frequencies = frequencies
    return tokenizer
