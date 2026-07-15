import re
from collections import Counter

def train_bpe(
    text: str,
    vocab_size: int,
    pattern: str | None = None,
    special_tokens: list[str] | None = None,
) -> tuple[dict[tuple[int, int], int], dict[int, bytes], dict[str, int], dict[str, int]]:
    # default pattern (simplified GPT-2 regex)
    if not pattern:
        pattern = r"'s|'t|'re|'ve|'m|'ll|'d| ?[a-zA-Z]+| ?[0-9]+| ?[^a-zA-Z0-9\s]+|\s+(?!\S)|\s+"
    
    compiled_pattern = re.compile(pattern)
    chunks = compiled_pattern.findall(text)
    
    # Encode each chunk to bytes
    ids_list = [list(chunk.encode("utf-8")) for chunk in chunks]
    
    # Base vocab: 0 to 255 represent bytes
    vocab = {i: bytes([i]) for i in range(256)}
    
    merges = {} # (p0, p1) -> new_id
    frequencies = {} # "p0,p1" -> frequency
    
    num_specials = len(special_tokens) if special_tokens else 0
    num_merges = vocab_size - 256 - num_specials
    
    current_id = 256
    for _ in range(max(0, num_merges)):
        # Count all pairs
        pair_counts = Counter()
        for ids in ids_list:
            for i in range(len(ids) - 1):
                pair_counts[(ids[i], ids[i + 1])] += 1
                
        if not pair_counts:
            break
            
        # Get the most common pair
        best_pair, freq = pair_counts.most_common(1)[0]
        
        # Merge this pair
        merges[best_pair] = current_id
        frequencies[f"{best_pair[0]},{best_pair[1]}"] = freq
        vocab[current_id] = vocab[best_pair[0]] + vocab[best_pair[1]]
        
        # Update ids_list
        ids_list = merge_pair(ids_list, best_pair, current_id)
        current_id += 1
        
    # Now add special tokens to vocab
    special_tokens_map = {}
    if special_tokens:
        for token in special_tokens:
            special_tokens_map[token] = current_id
            vocab[current_id] = token.encode("utf-8")
            current_id += 1
            
    return merges, vocab, special_tokens_map, frequencies

def merge_pair(ids_list: list[list[int]], pair: tuple[int, int], new_id: int) -> list[list[int]]:
    new_ids_list = []
    for ids in ids_list:
        new_ids = []
        i = 0
        while i < len(ids):
            if i < len(ids) - 1 and ids[i] == pair[0] and ids[i + 1] == pair[1]:
                new_ids.append(new_id)
                i += 2
            else:
                new_ids.append(ids[i])
                i += 1
        new_ids_list.append(new_ids)
    return new_ids_list
