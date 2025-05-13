from PIL import Image, ImageSequence
from pathlib import Path

SUPPORTED_EXTENSIONS = [".gif", ".jpg", ".jpeg", ".png"]

TOTEM_LED_SIZE = (64, 64)
repo_root = Path(__file__).parent.parent
images_dir = repo_root / "images"


def thumbnails(frames):
    for frame in frames:
        thumbnail = frame.copy()
        thumbnail.thumbnail(TOTEM_LED_SIZE)
        yield thumbnail


def downsize():
    for p in images_dir.rglob("*.*"):
        image_path = str(p)
        path = Path(image_path)
        parts = list(path.parts)
        try:
            idx = parts.index("images")
            parts[idx] = "images-64x64"
            old_path = image_path
            new_path = Path(*parts)
            print(f"{old_path} -> {new_path}")
        except ValueError:
            print(f"Error with {image_path}")
            continue

        for ext in SUPPORTED_EXTENSIONS:
            if not image_path.endswith(ext):
                continue

        new_path.parent.mkdir(parents=True, exist_ok=True)
        image_path = str(new_path)

        if image_path.endswith(".gif"):
            with Image.open(old_path) as img:
                frames = ImageSequence.Iterator(img)
                frames = thumbnails(frames)
                om = next(frames)
                om.info = img.info
                om.save(image_path, save_all=True, append_images=list(frames))
        else:
            with Image.open(old_path) as img:
                img = img.resize(TOTEM_LED_SIZE)
                print(f"Saving {image_path}")
                img.save(image_path)


downsize()
