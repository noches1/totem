import glob
import os

from PIL import Image, ImageSequence

SUPPORTED_EXTENSIONS = [".gif", ".jpg", ".jpeg", ".png"]

TOTEM_LED_SIZE = (64, 64)
base_dir = os.path.dirname(os.path.dirname(__file__))
pattern = os.path.join(base_dir, "images", "**", "*.*")


def thumbnails(frames):
    for frame in frames:
        thumbnail = frame.copy()
        thumbnail.thumbnail(TOTEM_LED_SIZE)
        yield thumbnail


def downsize():
    for image_path in glob.glob(pattern):
        print(image_path)
        for ext in SUPPORTED_EXTENSIONS:
            if not image_path.endswith(ext):
                continue

        if image_path.endswith(".gif"):
            with Image.open(image_path) as img:
                frames = ImageSequence.Iterator(img)
                frames = thumbnails(frames)
                om = next(frames)
                om.info = img.info
                om.save(image_path, save_all=True, append_images=list(frames))
        else:
            with Image.open(image_path) as img:
                img = img.resize(TOTEM_LED_SIZE)
                print(f"Saving {image_path}")
                img.save(image_path)


downsize()
