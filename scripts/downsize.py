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


def downsize_gif(in_path: str, out_path: str, size=(64, 64)):
    with Image.open(in_path) as gif:
        if gif.height == 64 and gif.width == 64:
            return
        frames = []
        durations = []

        for frame in ImageSequence.Iterator(gif):
            # 1) record the frame duration
            durations.append(frame.info.get("duration", 100))

            # 2) get an RGBA copy and resize it
            rgba = frame.convert("RGBA").resize(size, Image.LANCZOS)

            # 3) composite over a black background
            black_bg = Image.new("RGBA", size, (0, 0, 0, 255))
            composited = Image.alpha_composite(black_bg, rgba)

            # 4) convert to a palette image (GIF) if you like, or just to RGB
            paletted = composited.convert("RGB").quantize(method=Image.MEDIANCUT)

            frames.append(paletted)

        # 5) save as an animated GIF—no transparency needed now
        frames[0].save(
            out_path,
            save_all=True,
            append_images=frames[1:],
            loop=0,
            duration=durations,
            optimize=False,
        )
        print(f"Saving {out_path}")


def downsize():
    for p in images_dir.rglob("*.*"):
        if p.suffix.lower() not in SUPPORTED_EXTENSIONS:
            print(f"Skipping {p} - not a supported extension")
            continue

        image_path = str(p)
        if p.suffix.lower().endswith(".gif"):
            downsize_gif(image_path, image_path, size=TOTEM_LED_SIZE)
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
