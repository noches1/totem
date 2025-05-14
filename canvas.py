import time

from PIL import Image


def current_time():
    return time.time() * 1000


class Canvas:
    def __init__(
        self,
        width: int = 64,
        height: int = 64,
    ):
        self.width = width
        self.height = height
        self.grid = [[0 for _ in range(width)] for _ in range(height)]
        self.last_updated_at = current_time()

    def clear(self):
        self.grid = [[0 for _ in range(self.width)] for _ in range(self.height)]
        self.last_updated_at = current_time()

    def update(self, grid):
        if len(grid) != self.height or len(grid[0]) != self.width:
            return
        self.grid = grid
        self.last_updated_at = current_time()


art_canvas = Canvas()


def rgb332_to_rgb(byte: int) -> tuple[int, int, int, int]:
    r3 = (byte >> 5) & 0x07
    g3 = (byte >> 2) & 0x07
    b2 = byte & 0x03

    r = round((r3 / 7) * 255)
    g = round((g3 / 7) * 255)
    b = round((b2 / 3) * 255)
    return (r, g, b, 255)


def double(image):
    images = [image, image]
    doubled = Image.new("RGB", (image.size[0], image.size[1] * 2))
    y_offset = 0
    for im in images:
        doubled.paste(im, (0, y_offset))
        y_offset += im.size[1]
    return doubled


last_rendered = 0


def render_canvas(canvases, matrix):
    global last_rendered
    if last_rendered >= art_canvas.last_updated_at:
        return
    last_rendered = current_time()
    img = Image.new("RGB", (art_canvas.width, art_canvas.height))
    for j, row in enumerate(art_canvas.grid):
        for i, cell in enumerate(row):
            img.putpixel((i, j), rgb332_to_rgb(cell))
    canvases[0].SetImage(double(img))
    matrix.SwapOnVSync(canvases[0])
