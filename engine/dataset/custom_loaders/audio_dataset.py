"""Audio dataset loader.

Loads audio files from a folder structure, computes mel spectrograms
using torchaudio, and returns spectrogram tensors. Used when
CustomDatasetConfig.modality="audio".
"""

from __future__ import annotations

import os
from typing import Any

import torch
from torch.utils.data import Dataset

try:
    import torchaudio

    HAS_TORCHAUDIO = True
except (ImportError, OSError):
    # OSError raised on CPU-only runners where CUDA shared libs are missing
    HAS_TORCHAUDIO = False

AUDIO_EXTENSIONS = {".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac"}


class AudioDataset(Dataset):
    """A PyTorch Dataset for audio files organized in class folders.

    Expects a directory structure like::

        root/
        ├── class_a/
        │   ├── file1.wav
        │   └── file2.wav
        └── class_b/
            ├── file3.wav
            └── file4.wav

    Computes mel spectrograms on the fly using torchaudio transforms.

    Args:
        root: Root directory containing class subfolders.
        sample_rate: Target sample rate (resamples if different).
        max_duration_sec: Maximum audio duration in seconds (pads/truncates).
        n_mels: Number of mel frequency bands.
        feature_extraction: Feature extraction method (currently only "mel_spectrogram").
        transform: Optional additional transform to apply to the spectrogram.
    """

    def __init__(
        self,
        root: str,
        sample_rate: int = 16000,
        max_duration_sec: float = 1.0,
        n_mels: int = 64,
        feature_extraction: str = "mel_spectrogram",
        transform: Any | None = None,
    ) -> None:
        if not HAS_TORCHAUDIO:
            raise ImportError(
                "torchaudio is required for AudioDataset. "
                "Install it with: pip install torchaudio"
            )

        if not os.path.isdir(root):
            raise ValueError(f"Audio root directory not found: {root}")

        self.root = root
        self.sample_rate = sample_rate
        self.max_duration_sec = max_duration_sec
        self.n_mels = n_mels
        self.feature_extraction = feature_extraction
        self.transform = transform

        # Discover classes and files
        self.classes = sorted(
            d for d in os.listdir(root) if os.path.isdir(os.path.join(root, d))
        )
        self.class_to_idx = {cls: idx for idx, cls in enumerate(self.classes)}

        # Build file index
        self.samples: list[tuple[str, int]] = []
        for cls in self.classes:
            cls_dir = os.path.join(root, cls)
            for fname in sorted(os.listdir(cls_dir)):
                ext = os.path.splitext(fname)[1].lower()
                if ext in AUDIO_EXTENSIONS:
                    self.samples.append(
                        (os.path.join(cls_dir, fname), self.class_to_idx[cls])
                    )

        # Mel spectrogram transform
        self._mel_transform = torchaudio.transforms.MelSpectrogram(
            sample_rate=sample_rate,
            n_mels=n_mels,
        )

        # Expected number of time frames
        self._max_samples = int(sample_rate * max_duration_sec)

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, int]:
        file_path, label = self.samples[index]

        waveform, sr = torchaudio.load(file_path)

        # Resample if needed
        if sr != self.sample_rate:
            resampler = torchaudio.transforms.Resample(
                orig_freq=sr, new_freq=self.sample_rate
            )
            waveform = resampler(waveform)

        # Convert to mono if stereo
        if waveform.shape[0] > 1:
            waveform = waveform.mean(dim=0, keepdim=True)

        # Pad or truncate to max_duration
        if waveform.shape[1] < self._max_samples:
            padding = self._max_samples - waveform.shape[1]
            waveform = torch.nn.functional.pad(waveform, (0, padding))
        else:
            waveform = waveform[:, : self._max_samples]

        # Compute mel spectrogram
        mel_spec = self._mel_transform(waveform)  # [1, n_mels, time_frames]

        # Convert to log-mel spectrogram
        mel_spec = torch.log(mel_spec + 1e-9)

        if self.transform is not None:
            mel_spec = self.transform(mel_spec)

        return mel_spec.squeeze(0), label  # [n_mels, time_frames]
