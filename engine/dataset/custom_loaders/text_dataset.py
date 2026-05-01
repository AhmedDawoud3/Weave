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
        tokenizer: Tokenizer type — currently only ``"whitespace"`` supported.
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
    ) -> None:
        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"Data file not found: {file_path}")

        self.df = pd.read_csv(file_path)
        self.text_column = text_column
        self.target_column = target_column
        self.max_length = max_length
        self.vocab_size = vocab_size
        self.tokenizer = tokenizer

        if text_column not in self.df.columns:
            raise ValueError(
                f"Text column '{text_column}' not found. "
                f"Available: {list(self.df.columns)}"
            )

        # Build vocabulary from the text data
        self.vocab = self._build_vocab()

        # Build label mapping if target column exists
        self.class_to_idx: dict[str, int] = {}
        self.classes: list[str] = []
        if target_column and target_column in self.df.columns:
            unique_labels = sorted(self.df[target_column].unique())
            self.classes = [str(label) for label in unique_labels]
            self.class_to_idx = {str(label): idx for idx, label in enumerate(unique_labels)}

    def _build_vocab(self) -> dict[str, int]:
        """Build a word-to-index mapping from the corpus."""
        word_counts: dict[str, int] = {}
        for text in self.df[self.text_column].dropna():
            tokens = str(text).split() if self.tokenizer == "whitespace" else list(str(text))
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

    def _tokenize(self, text: str) -> list[str]:
        """Tokenize a text string."""
        if self.tokenizer == "whitespace":
            return str(text).split()
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
        tokens = self._tokenize(text)
        input_ids = torch.tensor(self._encode(tokens), dtype=torch.long)

        if self.target_column and self.target_column in self.df.columns:
            label_raw = str(row[self.target_column])
            label = self.class_to_idx.get(label_raw, 0)
            return input_ids, label

        return input_ids, 0
