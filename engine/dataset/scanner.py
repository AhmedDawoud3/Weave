import os

def scan_folder(path: str):
    if not os.path.exists(path):
        raise ValueError("Path does not exist!")

    classes = []
    total_images = 0

    for root, dirs, files in os.walk(path):
        if root == path:
            classes = dirs
        else:
            total_images += len(files)

    return {
        "classes": classes,
        "num_classes": len(classes),
        "total_images": total_images
    }