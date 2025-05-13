import glob
import os

from PIL import Image

SUPPORTED_EXTENSIONS = [".gif", ".jpg", ".jpeg", ".png"]

TOTEM_LED_SIZE = (64, 64)
base_dir = os.path.dirname(os.path.dirname(__file__))
pattern = os.path.join(base_dir, "images", "**", "*.*")


def downsize():
    for image_path in glob.glob(pattern):
        print(image_path)
        for ext in SUPPORTED_EXTENSIONS:
            if not image_path.endswith(ext):
                continue

        with Image.open(image_path) as img:
            img = img.resize(TOTEM_LED_SIZE)
            print(f"Saving {image_path}")
            img.save(image_path)
        # if image_path.endswith(".png"):
        #     with open(image_path, "rb") as f:
        #         image = Image.open(f)
        #         image = image.resize(TOTEM_LED_SIZE, Image.ANTIALIAS)
        #         image.save(image_path, format="PNG", optimize=True)


# def downsize_all_images():
#     image = Image.open()


downsize()
