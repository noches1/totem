#!/usr/bin/env python
from matrix import Matrix
from rgbmatrix import graphics
import time
from PIL import Image
import argparse
import requests
from PIL import Image, ImageOps
from io import BytesIO
import os
import threading

def resize_image(url, output_path, new_size=(64, 64)):
    try:
        # Download the image from the URL
        response = requests.get(url)
        if response.status_code == 200:
            # Open the image using PIL
            image = Image.open(BytesIO(response.content))
            # Resize the image
            resized_image = image.resize(new_size)
            # Save the resized image
            resized_image.save(output_path)
        else:
            print("Failed to download image. Status code:", response.status_code)
    except Exception as e:
        print("An error occurred:", e)

def resize_gif(url, output_path, new_size=(64, 64)):
    try:
        # Download the image from the URL
        response = requests.get(url)
        if response.status_code == 200:
            # Open the image using PIL
            image = Image.open(BytesIO(response.content))
            frames = []
            for frame in range(image.n_frames):
                image.seek(frame)
                resized_frame = image.resize(new_size, Image.LANCZOS)
                frames.append(resized_frame.copy())

            frames[0].save(
                output_path,
                save_all=True,
                append_images=frames[1:],
                optimize=True,
                duration=image.info['duration'],
                loop=image.info['loop']
            )
        else:
            print("Failed to download image. Status code:", response.status_code)
    except Exception as e:
        print("An error occurred:", e)


class StoppableThread(threading.Thread):
    """Thread class with a stop() method. The thread itself has to check
    regularly for the stopped() condition."""

    def __init__(self,  *args, **kwargs):
        super(StoppableThread, self).__init__(*args, **kwargs)
        self._stop_event = threading.Event()

    def stop(self):
        self._stop_event.set()

    def stopped(self):
        return self._stop_event.is_set()

DIR = '/home/totem/totem'

class Picture(Matrix):
    def __init__(self, *args, **kwargs):
        super(Picture, self).__init__(*args, **kwargs)
        self.name = 'cry'
        self.thread = None
        self.color = graphics.Color(255, 0, 0)

        self.parser.add_argument("--img", help="URL of image to download, resize, and render", type=str)
        self.parser.add_argument("--gif", help="URL of GIF to download, resize, and render", type=str)
        self.parser.add_argument("--txt", help="Text to scroll across", type=str)
        self.parser.add_argument("--name", help='Name for downloaded content', type=str)

        self.colors = {
            '-r': graphics.Color(255, 0, 0),
            '-g': graphics.Color(0, 255, 0),
            '-b': graphics.Color(0, 0 , 255)
        }

    def double(self, image):
        flip = ImageOps.flip(image)
        flip = ImageOps.mirror(flip)
        images = [image, flip]
        doubled = Image.new('RGB', (image.size[0], image.size[1] * 2))
        y_offset = 0
        for im in images:
            doubled.paste(im, (0, y_offset))
            y_offset += im.size[1]
        return doubled
        
    def run(self):
        if self.args.name:
            self.name = self.args.name
        if self.args.img:
            resize_image(self.args.img, f'{DIR}/images/{self.name}.png', (64, 64))
        if self.args.gif:
            resize_gif(self.args.gif, f'{DIR}/images/{self.name}.gif')

        names = [x.split('.')[0] for x in os.listdir(f'{DIR}/images')]
        filenames = os.listdir(f'{DIR}/images')

        print('Running image...')

        try:
            loc = names.index(self.name)
            file = filenames[loc]
        except ValueError:
            file = None

        if file is None:
            for c in self.colors.keys():
                if c in self.name:
                    self.color = self.colors[c]
            self.thread = StoppableThread(target=self.scroll_text, args=(self.name,))
            print('Starting text thread')
            self.thread.start()
        elif file.split('.')[1] == 'png':
            image = Image.open(f'{DIR}/images/{file}')
            image = self.double(image)
            self.matrix.SetImage(image.convert('RGB'))
        elif file.split('.')[1] == 'gif':
            gif = Image.open(f'{DIR}/images/{file}')
            num_frames = gif.n_frames
            frames = []
            for frame_index in range(0, num_frames):
                gif.seek(frame_index)
                frame = gif.copy()
                frame = self.double(frame)
                frame.thumbnail((self.matrix.width, self.matrix.height), Image.LANCZOS)
                canvas = self.matrix.CreateFrameCanvas()
                canvas.SetImage(frame.convert("RGB"))
                frames.append(canvas)
            gif.close()
            self.thread = StoppableThread(target=self.gif, args=(frames, num_frames))
            print('Starting GIF thread')
            self.thread.start()
        elif file.split('.')[1] == 'txt':
            with open(f'images/{file}', 'r') as f:
                text = f.readline().rstrip()

            self.thread = StoppableThread(target=self.scroll_text, args=(text,))
            print('Starting text thread')
            self.thread.start()

    def gif(self, frames, num_frames):
        cur_frame = 1 # TODO why does frame 0 glitch?
        while(True):
            self.matrix.SwapOnVSync(frames[cur_frame], framerate_fraction=10)
            if cur_frame == num_frames - 1:
                cur_frame = 1
            else:
                cur_frame += 1
            if self.thread.stopped():
                break

    def scroll_text(self, string):
        offscreen_canvas = self.matrix.CreateFrameCanvas()
        font = graphics.Font()
        font.LoadFont(f'{DIR}/fonts/9x18.bdf') 
        color = self.color
        pos = offscreen_canvas.width
        while True:
            offscreen_canvas.Clear()
            length = graphics.DrawText(offscreen_canvas, font, pos, 32, color, string)
            pos -= 1
            if (pos + length < 0):
                pos = offscreen_canvas.width
            time.sleep(0.05)
            offscreen_canvas = self.matrix.SwapOnVSync(offscreen_canvas)
            if self.thread.stopped():
                break

# Main function
if __name__ == "__main__":
    picture = Picture()
    if (not picture.process()):
        picture.print_help()

    time.sleep(10)
