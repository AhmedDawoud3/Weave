import os

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".webp"}


def scan_folder(path: str):
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
