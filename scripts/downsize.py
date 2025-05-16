from PIL import Image, ImageSequence, ImageOps
from pathlib import Path

SUPPORTED_EXTENSIONS = [".gif", ".jpg", ".jpeg", ".png"]

TOTEM_LED_SIZE = (64, 64)
repo_root = Path(__file__).parent.parent
images_dir = repo_root / "images"


def thumbnails(frames):
    for frame in frames:
        thumb = ImageOps.fit(
            frame, TOTEM_LED_SIZE, method=Image.LANCZOS, centering=(0.5, 0.5)
        )
        yield thumb


def downsize():
    for p in images_dir.rglob("*.*"):
        if p.suffix.lower() not in SUPPORTED_EXTENSIONS:
            print(f"Skipping {p} - not a supported extension")
            continue

        image_path = str(p)
        if p.suffix.lower().endswith(".gif"):
            with Image.open(image_path) as img:
                if img.height == 64 and img.width == 64:
                    continue
                frames = ImageSequence.Iterator(img)
                frames = thumbnails(frames)
                om = next(frames)
                om.info = img.info
                print(f"Saving {image_path}")
                om.save(image_path, save_all=True, append_images=list(frames))
        else:
            with Image.open(image_path) as img:
                if img.height == 64 and img.width == 64:
                    continue
                thumb = ImageOps.fit(
                    img, TOTEM_LED_SIZE, method=Image.LANCZOS, centering=(0.5, 0.5)
                )
                print(f"Saving {image_path}")
                thumb.save(image_path)


downsize()
