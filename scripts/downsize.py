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
        if p.suffix.lower() not in SUPPORTED_EXTENSIONS:
            print(f"Skipping {p} - not a supported extension")
            continue

        image_path = str(p)
        if p.suffix.lower().endswith(".gif"):
            with Image.open(image_path) as img:
                frames = ImageSequence.Iterator(img)
                frames = thumbnails(frames)
                om = next(frames)
                om.info = img.info
                print(f"Saving {image_path}")
                om.save(image_path, save_all=True, append_images=list(frames))
        else:
            with Image.open(image_path) as img:
                img = img.resize(TOTEM_LED_SIZE)
                print(f"Saving {image_path}")
                img.save(image_path)


downsize()
