#!/usr/bin/env python
from totem import Totem
from rgbmatrix import graphics
import time
from PIL import Image
import argparse
import requests
from PIL import Image
from io import BytesIO

class Picture(Totem):
    def __init__(self, *args, **kwargs):
        super(Picture, self).__init__(*args, **kwargs)

        self.parser.add_argument("--img", help="URL of image to download, resize, and render", type=str)
        self.parser.add_argument("--gif", help="URL of GIF to download, resize, and render", type=str)
        self.parser.add_argument("--txt", help="Text to scroll across", type=str)
        self.parser.add_argument("--name", help='Name for downloaded content', type=str)
        
    def run(self):
        name = self.args.name if self.args.name else 'default'
        if self.args.img:
            resize_image(self.args.img, f'/home/totem/totem/images/{name}.png')
            image = Image.open(f'/home/totem/totem/images/{name}.png')
            self.matrix.SetImage(image.convert('RGB'))
        elif self.args.gif:
            resize_gif(self.args.gif, f'/home/totem/totem/images/{name}.gif')
            gif = Image.open(f'/home/totem/totem/images/{name}.gif')
            num_frames = gif.n_frames
            # Preprocess the gifs frames into canvases to improve playback performance
            canvases = []
            for frame_index in range(0, num_frames):
                gif.seek(frame_index)
                # must copy the frame out of the gif, since thumbnail() modifies the image in-place
                frame = gif.copy()
                frame.thumbnail((self.matrix.width, self.matrix.height), Image.LANCZOS)
                canvas = self.matrix.CreateFrameCanvas()
                canvas.SetImage(frame.convert("RGB"))
                canvases.append(canvas)
            # Close the gif file to save memory now that we have copied out all of the frames
            gif.close()

            cur_frame = 0
            while(True):
                self.matrix.SwapOnVSync(canvases[cur_frame], framerate_fraction=10)
                if cur_frame == num_frames - 1:
                    cur_frame = 0
                else:
                    cur_frame += 1
        elif self.args.txt:
            offscreen_canvas = self.matrix.CreateFrameCanvas()
            font = graphics.Font()
            font.LoadFont("/home/totem/totem/fonts/9x18.bdf") 
            textColor = graphics.Color(255, 0, 0)
            pos = offscreen_canvas.width

            while True:
                offscreen_canvas.Clear()
                len = graphics.DrawText(offscreen_canvas, font, pos, 32, textColor, self.args.txt)
                pos -= 1
                if (pos + len < 0):
                    pos = offscreen_canvas.width

                time.sleep(0.05)
                offscreen_canvas = self.matrix.SwapOnVSync(offscreen_canvas)

        time.sleep(10)

# Main function
if __name__ == "__main__":
    picture = Picture()
    if (not picture.process()):
        picture.print_help()
