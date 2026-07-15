import re

class BPETokenizer:
    def __init__(self, merges=None, vocab=None, special_tokens=None, pattern=None):
        self.merges = merges or {}  # (int, int) -> int
        self.vocab = vocab or {}    # int -> bytes
        self.special_tokens = special_tokens or {}  # str -> int
        self.inverse_special_tokens = {v: k for k, v in self.special_tokens.items()}
        self.pattern = pattern or r"'s|'t|'re|'ve|'m|'ll|'d| ?[a-zA-Z]+| ?[0-9]+| ?[^a-zA-Z0-9\s]+|\s+(?!\S)| \s+"
        self.compiled_pattern = re.compile(self.pattern)

    def encode(self, text: str, allowed_special: str | set[str] = "all") -> list[int]:
        if not self.special_tokens:
            return self._encode_chunk(text)

        # Sort keys by length descending to match longest first
        sorted_specials = sorted(self.special_tokens.keys(), key=len, reverse=True)
        special_pattern = re.compile("(" + "|".join(re.escape(t) for t in sorted_specials) + ")")
        
        parts = special_pattern.split(text)
        ids = []
        for part in parts:
            if part in self.special_tokens:
                if allowed_special == "all" or part in allowed_special:
                    ids.append(self.special_tokens[part])
                else:
                    ids.extend(self._encode_chunk(part))
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
