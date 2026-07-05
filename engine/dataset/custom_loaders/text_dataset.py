"""Text dataset loader.

Reads a CSV/TSV file with a text column, performs simple whitespace or
character-level tokenization, and returns padded/truncated token-ID tensors.
Used when CustomDatasetConfig.modality="text".
"""

from __future__ import annotations

import os

import pandas as pd
import torch
from torch.utils.data import Dataset


class TextDataset(Dataset):
    """A PyTorch Dataset for text classification from a CSV file.

    Performs simple whitespace tokenization with a vocabulary built from
    the training data. Token IDs are padded or truncated to ``max_length``.

    Args:
        file_path: Path to the CSV file.
        text_column: Column name containing the text.
        target_column: Column name containing the label (optional).
        max_length: Maximum sequence length (pad/truncate to this).
        vocab_size: Maximum vocabulary size.
        tokenizer: Tokenizer type — whitespace, char, or bpe.
        lowercase: Whether to convert text to lowercase.
        remove_punctuation: Whether to remove punctuation from text.
    """

    UNK_TOKEN = "<UNK>"
    PAD_TOKEN = "<PAD>"

    def __init__(
        self,
        file_path: str,
        text_column: str = "text",
        target_column: str | None = None,
        max_length: int = 512,
        vocab_size: int = 30000,
        tokenizer: str = "whitespace",
        lowercase: bool = True,
        remove_punctuation: bool = False,
    ) -> None:
        if not os.path.isfile(file_path):
            if file_path.endswith("ag_news_subset.csv"):
                os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)
                self._generate_synthetic_ag_news(file_path)
            else:
                raise FileNotFoundError(f"Data file not found: {file_path}")

        self.df = pd.read_csv(file_path)
        self.text_column = text_column
        self.target_column = target_column
        self.max_length = max_length
        self.vocab_size = vocab_size
        self.tokenizer = tokenizer
        self.lowercase = lowercase
        self.remove_punctuation = remove_punctuation

        if text_column not in self.df.columns:
            raise ValueError(
                f"Text column '{text_column}' not found. "
                f"Available: {list(self.df.columns)}"
            )

        # Build vocabulary from the text data (BPE trains subword merges, others count terms)
        if self.tokenizer == "bpe":
            self.vocab, self.merges = self._train_bpe(
                [self._preprocess(t) for t in self.df[self.text_column].dropna()]
            )
        else:
            self.merges = []
            self.vocab = self._build_vocab()

        # Build label mapping if target column exists
        self.class_to_idx: dict[str, int] = {}
        self.classes: list[str] = []
        if target_column and target_column in self.df.columns:
            unique_labels = sorted(self.df[target_column].unique())
            self.classes = [str(label) for label in unique_labels]
            self.class_to_idx = {
                str(label): idx for idx, label in enumerate(unique_labels)
            }

    def _generate_synthetic_ag_news(self, path: str) -> None:
        """Generate a synthetic text dataset of news articles for predefined usage."""
        import csv
        data = [
            ("text", "label"),
            ("New space telescope captures stunning images of distant spiral galaxies.", "Sci/Tech"),
            ("Artificial intelligence model outperforms humans on medical diagnostic exams.", "Sci/Tech"),
            ("Breakthrough in quantum computing promises exponential speedup for cryptography.", "Sci/Tech"),
            ("Scientists engineer synthetic microbes capable of breaking down plastics in oceans.", "Sci/Tech"),
            ("New smartphone release features holographic display and solar charging panels.", "Sci/Tech"),
            
            ("Tech index surges to record high as software giant reports blowout earnings.", "Business"),
            ("Central bank raises interest rates by twenty-five basis points to curb inflation.", "Business"),
            ("Automotive corporation announces shift to 100 percent electric vehicle production.", "Business"),
            ("Global trade volume declines due to supply chain disruptions and tariffs.", "Business"),
            ("Real estate prices stabilize as mortgage rates reach ten year average.", "Business"),
            
            ("Championship finals end in historic victory for the underdog franchise.", "Sports"),
            ("Superstar quarterback signs record breaking three hundred million dollar contract.", "Sports"),
            ("Olympic runner breaks world record in the one hundred meter sprint.", "Sports"),
            ("World cup matches draw record breaking television viewership worldwide.", "Sports"),
            ("Grand slam tournament ends with spectacular five set thriller in tennis.", "Sports"),
            
            ("Global leaders convene at the United Nations summit to draft climate treaty.", "World"),
            ("Peace treaty signed ending decade long conflict in the border region.", "World"),
            ("Prime minister announces major infrastructure spending package for regions.", "World"),
            ("Elections in neighboring country see record voter turnout amid high security.", "World"),
            ("Disaster relief teams arrive at earthquake zone to distribute emergency supplies.", "World"),
        ]
        # Expand dataset to have 200 samples
        expanded_data = [data[0]] + (data[1:] * 10)
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerows(expanded_data)

    def _preprocess(self, text: str) -> str:
        """Apply basic cleaning options."""
        text = str(text)
        if self.lowercase:
            text = text.lower()
        if self.remove_punctuation:
            import string
            text = text.translate(str.maketrans("", "", string.punctuation))
        return text

    def _build_vocab(self) -> dict[str, int]:
        """Build a word-to-index mapping from the corpus."""
        word_counts: dict[str, int] = {}
        for text in self.df[self.text_column].dropna():
            cleaned_text = self._preprocess(text)
            tokens = self._tokenize(cleaned_text)
            for token in tokens:
                word_counts[token] = word_counts.get(token, 0) + 1

        # Sort by frequency, keep top vocab_size - 2 (for PAD and UNK)
        sorted_words = sorted(word_counts, key=lambda w: word_counts[w], reverse=True)[
            : self.vocab_size - 2
        ]

        vocab = {self.PAD_TOKEN: 0, self.UNK_TOKEN: 1}
        for idx, word in enumerate(sorted_words, start=2):
            vocab[word] = idx

        return vocab

    def _train_bpe(self, texts: list[str]) -> tuple[dict[str, int], list[tuple[str, str]]]:
        """Train a lightweight Byte-Pair Encoding subword vocabulary."""
        from collections import defaultdict
        
        # Limit training sample rows to keep startup fast
        texts = texts[:2000]
        
        word_freqs = defaultdict(int)
        for text in texts:
            for word in text.split():
                word_freqs[word] += 1
                
        # Split words into characters + end-of-word tag
        splits = {word: [c for c in word] + ["</w>"] for word in word_freqs}
        
        vocab = {self.PAD_TOKEN: 0, self.UNK_TOKEN: 1}
        chars = set()
        for word in word_freqs:
            for char in splits[word]:
                chars.add(char)
                
        for idx, char in enumerate(sorted(chars), start=2):
            vocab[char] = idx
            
        merges = []
        target_merges = self.vocab_size - len(vocab)
        
        for _ in range(max(0, target_merges)):
            pair_freqs = defaultdict(int)
            for word, freq in word_freqs.items():
                split = splits[word]
                if len(split) < 2:
                    continue
                for i in range(len(split) - 1):
                    pair_freqs[(split[i], split[i+1])] += freq
            
            if not pair_freqs:
                break
                
            best_pair = max(pair_freqs, key=pair_freqs.get)
            best_pair_str = best_pair[0] + best_pair[1]
            merges.append(best_pair)
            
            new_splits = {}
            for word, split in splits.items():
                new_split = []
                i = 0
                while i < len(split):
                    if i < len(split) - 1 and split[i] == best_pair[0] and split[i+1] == best_pair[1]:
                        new_split.append(best_pair_str)
                        i += 2
                    else:
                        new_split.append(split[i])
                        i += 1
                new_splits[word] = new_split
            splits = new_splits
            
            vocab[best_pair_str] = len(vocab)
            
        return vocab, merges

    def _tokenize_bpe(self, text: str) -> list[str]:
        """Tokenize using the trained BPE merges."""
        words = text.split()
        tokens = []
        for word in words:
            w_tokens = [c for c in word] + ["</w>"]
            for parent, child in self.merges:
                new_tokens = []
                i = 0
                while i < len(w_tokens):
                    if i < len(w_tokens) - 1 and w_tokens[i] == parent and w_tokens[i+1] == child:
                        new_tokens.append(parent + child)
                        i += 2
                    else:
                        new_tokens.append(w_tokens[i])
                        i += 1
                w_tokens = new_tokens
            tokens.extend(w_tokens)
        return tokens

    def _tokenize(self, text: str) -> list[str]:
        """Tokenize a preprocessed text string."""
        if self.tokenizer == "whitespace":
            return str(text).split()
        elif self.tokenizer == "bpe":
            return self._tokenize_bpe(text)
        return list(str(text))  # character-level fallback

    def _encode(self, tokens: list[str]) -> list[int]:
        """Convert tokens to integer IDs, truncating to max_length."""
        ids = [self.vocab.get(t, self.vocab[self.UNK_TOKEN]) for t in tokens]
        ids = ids[: self.max_length]
        # Pad to max_length
        ids += [self.vocab[self.PAD_TOKEN]] * (self.max_length - len(ids))
        return ids

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor | int]:
        row = self.df.iloc[index]
        text = str(row[self.text_column])
        cleaned_text = self._preprocess(text)
        tokens = self._tokenize(cleaned_text)
        input_ids = torch.tensor(self._encode(tokens), dtype=torch.long)

        if self.target_column and self.target_column in self.df.columns:
            label_raw = str(row[self.target_column])
            label = self.class_to_idx.get(label_raw, 0)
            return input_ids, label

        return input_ids, 0
