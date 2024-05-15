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
import random

TOTEM_LED_SIZE = (64, 64)
RAINBOW_COLORS = [
    graphics.Color(255, 0, 0),
    graphics.Color(255, 76, 0),
    graphics.Color(255, 153, 0),
    graphics.Color(255, 229, 0),
    graphics.Color(203, 255, 0),
    graphics.Color(127, 255, 0),
    graphics.Color(51, 255, 0),
    graphics.Color(0, 255, 25),
    graphics.Color(0, 255, 102),
    graphics.Color(0, 255, 178),
    graphics.Color(0, 255, 255),
    graphics.Color(0, 178, 255),
    graphics.Color(0, 102, 255),
    graphics.Color(0, 25, 255),
    graphics.Color(50, 0, 255),
    graphics.Color(127, 0, 255),
    graphics.Color(204, 0, 255),
    graphics.Color(255, 0, 229),
    graphics.Color(255, 0, 152),
    graphics.Color(255, 0, 76)
]
#SPECIAL_COMMANDS = [
#    "affirmations",
#    "help",
#    "random",
#]

def download_image(url, output_path, resize_to=TOTEM_LED_SIZE):
    try:
        # Download the image from the URL
        response = requests.get(url)
        if response.status_code == 200:
            # Open the image using PIL
            image = Image.open(BytesIO(response.content))
            # Resize the image
            resized_image = image.resize(resize_to)
            # Save the resized image
            resized_image.save(output_path)
        else:
            print("Failed to download image. Status code:", response.status_code)
    except Exception as e:
        print("An error occurred:", e)

def download_gif(url, output_path, resize_to=TOTEM_LED_SIZE):
    try:
        # Download the image from the URL
        response = requests.get(url)
        if response.status_code == 200:
            # Open the image using PIL
            image = Image.open(BytesIO(response.content))
            frames = []
            for frame in range(image.n_frames):
                image.seek(frame)
                resized_frame = image.resize(resize_to, Image.LANCZOS)
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
        self.name = 'yoshi'
        self.thread = None
        self.color = graphics.Color(255, 0, 0)

        self.parser.add_argument("--img", help="URL of image to download, resize, and render", type=str)
        self.parser.add_argument("--gif", help="URL of GIF to download, resize, and render", type=str)
        self.parser.add_argument("--txt", help="Text to scroll across", type=str)  # Not used
        self.parser.add_argument("--name", help='Name for downloaded content', type=str, default=None)

        self.colors = {
            '-r': graphics.Color(255, 0, 0),
            '-g': graphics.Color(0, 255, 0),
            '-b': graphics.Color(0, 0 , 255),
            '-p': 'party',
            '-party': 'party',
        }

    def double(self, image):
        images = [image, image]
        doubled = Image.new('RGB', (image.size[0], image.size[1] * 2))
        y_offset = 0
        for im in images:
            doubled.paste(im, (0, y_offset))
            y_offset += im.size[1]
        return doubled
        
    def run(self):
        if self.args.name:
            self.name = self.args.name
        lowercase_name = self.name.lower().strip()

        # List all the pre-downloaded images/gifs
        names = sorted([x.split('.')[0].lower() for x in os.listdir(f'{DIR}/images')])

        # Check if it's a special command
        if lowercase_name.startswith('affirmations'):
            split_str = lowercase_name.split('-')
            # Only update color if it's specifically affirmations-{color}
            if len(split_str) == 2 and split_str[0] == 'affirmations':
                split_color = split_str[-1]
                color_key = f'-{split_color}'
                print(f'Updating color to {color_key}!')
                if color_key in self.colors.keys():
                    print('Actually updated')
                    self.color = self.colors[color_key]
            self.thread = StoppableThread(target=self.display_affirmations)
            print('Starting affirmations text thread')
            self.thread.start()
            return  # TODO: Double check that this doesn't mess anything up
        elif lowercase_name == 'random':
            lowercase_name = random.choice(names)
            print(f'Randomly chose this image/gif: {lowercase_name}')
        elif lowercase_name == 'help':
            self.name = " | ".join(names)  # Just show all the text, which happens to go through self.name for some reason
            print('Looking at help')
        textsize = 'small' if lowercase_name == 'help' else 'normal'

        # If image/gif can be downloaded
        if lowercase_name not in names:
            if self.args.img or self.args.gif:
                print('Image/gif does not exist, downloading from provided url...')
                if self.args.img:
                    download_image(self.args.img, f'{DIR}/images/{lowercase_name}.png', resize_to=TOTEM_LED_SIZE)
                if self.args.gif:
                    download_gif(self.args.gif, f'{DIR}/images/{lowercase_name}.gif', resize_to=TOTEM_LED_SIZE)
            else:
                print(f'Displaying text {self.name}')

        print('Running image...')

        filenames = sorted(os.listdir(f'{DIR}/images'))
        try:
            loc = names.index(lowercase_name)
            file = filenames[loc]
        except ValueError:
            file = None

        # Display text if no image/gif to display
        if file is None:
            text_to_display = self.name
            for c in self.colors.keys():
                if self.name.endswith(c):
                    self.color = self.colors[c]
                    text_to_remove = self.name.rsplit('-', 1)[-1]
                    text_to_display = self.name[:-(len(text_to_remove)+1)]
            self.thread = StoppableThread(target=self.scroll_text, args=(text_to_display, textsize))
            print('Starting text thread')
            self.thread.start()
        elif file.split('.')[1] == 'png':
            image = Image.open(f'{DIR}/images/{file}')
            # Resize every time
            image = image.resize(TOTEM_LED_SIZE)
            image = self.double(image)
            self.matrix.SetImage(image.convert('RGB'))
        elif file.split('.')[1] == 'gif':
            gif = Image.open(f'{DIR}/images/{file}')
            num_frames = gif.n_frames
            frames = []
            for frame_index in range(0, num_frames):
                gif.seek(frame_index)
                frame = gif.copy()
                # Resize every time
                frame = frame.resize(TOTEM_LED_SIZE, Image.LANCZOS)
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

            self.thread = StoppableThread(target=self.scroll_text, args=(text, textsize))
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

    def scroll_text(self, string, textsize = 'normal'):
        offscreen_canvas = self.matrix.CreateFrameCanvas()
        font = graphics.Font()
        if textsize == 'normal':
            font.LoadFont(f'{DIR}/fonts/9x18.bdf')
        elif textsize == 'small':
            font.LoadFont(f'{DIR}/fonts/4x6.bdf')
        else:
            raise ValueError('Should never have a text size that is not normal or small')
        color = self.color
        pos = offscreen_canvas.width
        while True:
            if self.color == 'party':
                color = RAINBOW_COLORS[(pos//2) % 20]
            offscreen_canvas.Clear()
            length = graphics.DrawText(offscreen_canvas, font, pos, 32, color, string)
            length2 = graphics.DrawText(offscreen_canvas, font, pos, 96, color, string)
            pos -= 1
            if (pos + length < 0):
                pos = offscreen_canvas.width
            time.sleep(0.05)
            offscreen_canvas = self.matrix.SwapOnVSync(offscreen_canvas)
            if self.thread.stopped():
                break


    def display_affirmations(self):
        offscreen_canvas = self.matrix.CreateFrameCanvas()
        font = graphics.Font()
        font.LoadFont(f'{DIR}/fonts/9x18.bdf') 
        # font.LoadFont(f'{DIR}/fonts/4x6.bdf') 
        color = self.color
        counter = 0
        wait_counter = 0
        WAIT_TIME = 32
        word_counter = 0
        words_to_cycle = ["enough", "loved", "needed", 
                          "unique", "strong", "perfect",
                          "worthy"]  # Don't do any words longer than 7 letters otherwise it will be too long

        def staircase_function(x):
            if x < 32:
                return x
            elif x > 64:
                return x - 32
            else:
                return 32

        while True:
            if self.color == 'party':
                color = RAINBOW_COLORS[(counter//2) % 20]
            offscreen_canvas.Clear()
            aff_word = words_to_cycle[word_counter]
            # y_pos = staircase_function(counter)
            # x_pos = staircase_function(counter) - len(aff_word) * 9
            x_pos = counter - len(aff_word)*9
            counter += 1

            graphics.DrawText(offscreen_canvas, font, 19, 20, color, "You")
            graphics.DrawText(offscreen_canvas, font, 19, 32, color, "are")
            graphics.DrawText(offscreen_canvas, font, 19, 20+64, color, "You")
            graphics.DrawText(offscreen_canvas, font, 19, 32+64, color, "are")
            length1 = graphics.DrawText(offscreen_canvas, font, x_pos, 44 , color, aff_word)
            length2 = graphics.DrawText(offscreen_canvas, font, x_pos, 44+64, color, aff_word)

            # Pause at the halfway point
            if x_pos + length1//2 > offscreen_canvas.width//2 and wait_counter < WAIT_TIME:
                wait_counter += 1
                counter -= 1  # Decrement the normal counter so it's as if it didn't go up

            if x_pos > offscreen_canvas.width:
            #you_are_text1 = graphics.DrawText(offscreen_canvas, font, 2, 32, color, "You are")
            #you_are_text2 = graphics.DrawText(offscreen_canvas, font, 2, 96, color, "You are")
            #length1 = graphics.DrawText(offscreen_canvas, font, 34, y_pos   , color, aff_word)
            #length2 = graphics.DrawText(offscreen_canvas, font, 34, y_pos+64, color, aff_word)
            #if (y_pos + 64 > offscreen_canvas.height):
                counter = 0
                wait_counter = 0
                word_counter = (word_counter+1) % len(words_to_cycle)
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
