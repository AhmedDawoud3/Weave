from __future__ import annotations

import os
from typing import Any

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".webp"}
AUDIO_EXTENSIONS = {".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac"}
TEXT_EXTENSIONS = {".txt", ".csv", ".tsv", ".json", ".jsonl"}


def scan_folder(path: str) -> dict[str, Any]:
    """Analyze a folder to detect class subfolders and count images.

    Walks the directory tree to find subfolders (treated as class labels)
    and counts image files (by extension) in those subfolders.

    Args:
        path: Path to the dataset root folder.

    Returns:
        dict: A dictionary with keys:
            - "classes" (list[str]): Subfolder names (class labels).
            - "num_classes" (int): Number of class subfolders.
            - "total_images" (int): Total count of image files.

    Raises:
        ValueError: If the path does not exist or is not a directory.
    """
    if not os.path.isdir(path):
        raise ValueError("Path does not exist or is not a directory!")

    normalized_path = os.path.normcase(os.path.normpath(os.path.abspath(path)))

    classes = []
    total_images = 0

    for root, dirs, files in os.walk(path):
        normalized_root = os.path.normcase(os.path.normpath(os.path.abspath(root)))
        if normalized_root == normalized_path:
            classes = dirs
        else:
            total_images += sum(
                1 for f in files if os.path.splitext(f)[1].lower() in IMAGE_EXTENSIONS
            )

    return {
        "classes": classes,
        "num_classes": len(classes),
        "total_images": total_images,
    }


def scan_csv(path: str) -> dict[str, Any]:
    """Analyze a CSV file to extract column info and row count.

    Args:
        path: Path to the CSV file.

    Returns:
        dict: A dictionary with keys:
            - "columns" (list[str]): Column names.
            - "num_rows" (int): Number of data rows (excluding header).
            - "dtypes" (dict[str, str]): Column name to inferred dtype.
            - "sample_rows" (list[dict]): First 3 rows as dicts.

    Raises:
        ValueError: If the file does not exist or is not a CSV.
    """
    if not os.path.isfile(path):
        raise ValueError(f"File does not exist: {path}")

    import pandas as pd

    df = pd.read_csv(path, nrows=100)  # Only read first 100 rows for scanning
    full_count = sum(1 for _ in open(path)) - 1  # Fast row count

    return {
        "columns": list(df.columns),
        "num_rows": full_count,
        "dtypes": {col: str(df[col].dtype) for col in df.columns},
        "sample_rows": df.head(3).to_dict(orient="records"),
    }


def scan_text_file(path: str) -> dict[str, Any]:
    """Analyze a text data file for basic statistics.

    Args:
        path: Path to the text/CSV file.

    Returns:
        dict: A dictionary with keys:
            - "columns" (list[str]): Column names (if CSV).
            - "num_rows" (int): Number of data rows.
            - "text_preview" (list[str]): First 3 text entries.

    Raises:
        ValueError: If the file does not exist.
    """
    if not os.path.isfile(path):
        raise ValueError(f"File does not exist: {path}")

    import pandas as pd

    ext = os.path.splitext(path)[1].lower()
    if ext in {".csv", ".tsv"}:
        sep = "\t" if ext == ".tsv" else ","
        df = pd.read_csv(path, sep=sep, nrows=100)
        full_count = sum(1 for _ in open(path)) - 1

        # Find the most likely text column (longest string values)
        text_col = None
        max_avg_len = 0
        for col in df.columns:
            if df[col].dtype == object:
                avg_len = df[col].astype(str).str.len().mean()
                if avg_len > max_avg_len:
                    max_avg_len = avg_len
                    text_col = col

        text_preview = []
        if text_col:
            text_preview = df[text_col].head(3).astype(str).tolist()

        return {
            "columns": list(df.columns),
            "num_rows": full_count,
            "text_column_hint": text_col,
            "text_preview": text_preview,
        }
    else:
        # Plain text file
        with open(path, encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()

        return {
            "columns": [],
            "num_rows": len(lines),
            "text_column_hint": None,
            "text_preview": [line.strip() for line in lines[:3]],
        }


def scan_audio_folder(path: str) -> dict[str, Any]:
    """Analyze a folder structure for audio datasets.

    Args:
        path: Path to the audio dataset root folder.

    Returns:
        dict: A dictionary with keys:
            - "classes" (list[str]): Subfolder names (class labels).
            - "num_classes" (int): Number of class subfolders.
            - "total_files" (int): Total count of audio files.
            - "extensions_found" (list[str]): Audio file extensions present.

    Raises:
        ValueError: If the path does not exist or is not a directory.
    """
    if not os.path.isdir(path):
        raise ValueError(f"Path does not exist or is not a directory: {path}")

    normalized_path = os.path.normcase(os.path.normpath(os.path.abspath(path)))

    classes = []
    total_files = 0
    extensions_found: set[str] = set()

    for root, dirs, files in os.walk(path):
        normalized_root = os.path.normcase(os.path.normpath(os.path.abspath(root)))
        if normalized_root == normalized_path:
            classes = dirs
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in AUDIO_EXTENSIONS:
                total_files += 1
                extensions_found.add(ext)

    return {
        "classes": classes,
        "num_classes": len(classes),
        "total_files": total_files,
        "extensions_found": sorted(extensions_found),
    }


def smart_scan(path: str, modality: str | None = None) -> dict[str, Any]:
    """Auto-detect the data type at a path and scan accordingly.

    If ``modality`` is provided, dispatches to the appropriate scanner.
    If not, attempts to detect based on file extension and directory structure.

    Args:
        path: Path to a file or directory.
        modality: Optional hint — "image", "text", "tabular", or "audio".

    Returns:
        dict: Scanner result (structure depends on the detected type).

    Raises:
        ValueError: If the path does not exist or modality is unknown.
    """
    if modality == "image":
        return scan_folder(path)
    elif modality in ("text", "tabular"):
        return scan_text_file(path) if os.path.isfile(path) else {"error": "Expected a file for text/tabular modality"}
    elif modality == "audio":
        return scan_audio_folder(path)

    # Auto-detect
    if os.path.isfile(path):
        ext = os.path.splitext(path)[1].lower()
        if ext in {".csv", ".tsv"}:
            return scan_csv(path)
        elif ext in TEXT_EXTENSIONS:
            return scan_text_file(path)
        return {"error": f"Cannot determine scan type for file: {path}"}

    if os.path.isdir(path):
        # Check if it looks like audio or image
        audio_count = 0
        image_count = 0
        for _, _, files in os.walk(path):
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in AUDIO_EXTENSIONS:
                    audio_count += 1
                elif ext in IMAGE_EXTENSIONS:
                    image_count += 1

        if audio_count > image_count:
            return scan_audio_folder(path)
        return scan_folder(path)

    raise ValueError(f"Path does not exist: {path}")
