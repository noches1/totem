#!/usr/bin/env python
from canvas import render_canvas
from dev import IS_DEV
from matrix import Matrix
import time
from pokerscope import Pokerscope
from pathlib import Path
import requests
from PIL import Image
from io import BytesIO
import os
import threading
import random

if IS_DEV:
    print("rgbmatrix not found, Importing RGBMatrixEmulator")
    from RGBMatrixEmulator import graphics
else:
    from rgbmatrix import graphics  # type: ignore

START_INSTRUCTIONS_STR = "Welcome! Use nRF Connect, connect to `totem`, and edit the UTF-8 value of the characteristic that starts with 000002. Type 'help' for available commands, or just type any text you want!"
TOTEM_LED_SIZE = (64, 64)
WHITE = graphics.Color(255, 255, 255)
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
    graphics.Color(255, 0, 76),
]
RGB_COLORS = [
    graphics.Color(255, 0, 0),
    graphics.Color(0, 255, 0),
    graphics.Color(0, 0, 255),
]
# SPECIAL_COMMANDS = [
#    "affirmations",
#    "help",
#    "random",
# ]


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
                duration=image.info["duration"],
                loop=image.info["loop"],
            )
        else:
            print("Failed to download image. Status code:", response.status_code)
    except Exception as e:
        print("An error occurred:", e)


class StoppableThread(threading.Thread):
    """Thread class with a stop() method. The thread itself has to check
    regularly for the stopped() condition."""

    def __init__(self, *args, **kwargs):
        super(StoppableThread, self).__init__(*args, **kwargs)
        self._stop_event = threading.Event()

    def stop(self):
        self._stop_event.set()

    def stopped(self):
        return self._stop_event.is_set()


default_command = "shrek"
if IS_DEV:
    DIR = os.path.dirname(os.path.abspath(__file__))
else:  # Linux
    DIR = "/home/totem/totem"
    default_command_path = Path("/home/totem/.default_command")
    default_command_path.parent.mkdir(parents=True, exist_ok=True)
    if not default_command_path.exists():
        with open(default_command_path, "w") as f:
            f.write("shrek")
    with open(default_command_path, "r") as f:
        default_command = f.read().strip()


class Picture(Matrix):
    def __init__(self, *args, **kwargs):
        super(Picture, self).__init__(*args, **kwargs)
        defaults = [default_command]
        self.name = random.choice(defaults)
        self.thread = None
        self.color = "party"

        self.parser.add_argument(
            "--img", help="URL of image to download, resize, and render", type=str
        )
        self.parser.add_argument(
            "--gif", help="URL of GIF to download, resize, and render", type=str
        )
        self.parser.add_argument(
            "--txt", help="Text to scroll across", type=str
        )  # Not used
        self.parser.add_argument(
            "--name", help="Name for downloaded content", type=str, default=None
        )

        self.colors = {
            "-r": graphics.Color(255, 0, 0),
            "-g": graphics.Color(0, 255, 0),
            "-b": graphics.Color(0, 0, 255),
            "-w": graphics.Color(255, 255, 255),
            "-p": "party",
            "-party": "party",
        }
        paths_unsorted = {}
        self.all_subdirs = []
        for path, subdirs, files in os.walk(f"{DIR}/images"):
            self.all_subdirs.extend(subdirs)
            for name in files:
                simple_name = name.split(".")[0].lower()
                paths_unsorted[simple_name] = os.path.join(path, name)
        # List all the pre-downloaded images/gifs
        self.paths = {k: paths_unsorted[k] for k in sorted(paths_unsorted.keys())}

    def double(self, image):
        images = [image, image]
        doubled = Image.new("RGB", (image.size[0], image.size[1] * 2))
        y_offset = 0
        for im in images:
            doubled.paste(im, (0, y_offset))
            y_offset += im.size[1]
        return doubled

    def run_command(self, value):
        if self.thread is not None:
            self.thread.stop()
            self.thread.join()
        self.name = "".join([str(x) for x in value])
        print(f"Changing totem to: {self.name}")
        self.run()

    def run(self):
        if self.args.name:
            self.name = self.args.name
        lowercase_name = self.name.lower().strip()
        print(f"lowercase version of input: {lowercase_name}")

        all_file_names = list(self.paths.keys())

        print("All subdirs that you can choose to cycle through")
        print(self.all_subdirs)
        # Check if it's a special command
        if lowercase_name.startswith("affirmations"):
            print("Special command: affirmations")
            if len(lowercase_name.split(":")) > 1:
                name = lowercase_name.split(":")[1].split("-")[0].title()
            else:
                name = "You"
            split_str = lowercase_name.split("-")
            # Only update color if it's specifically affirmations-{color}
            if len(split_str) == 2 and split_str[0] == "affirmations":
                split_color = split_str[-1]
                color_key = f"-{split_color}"
                print(f"Updating color to {color_key}!")
                if color_key in self.colors.keys():
                    print("Actually updated")
                    self.color = self.colors[color_key]
            self.thread = StoppableThread(
                target=self.display_affirmations, args=(name,)
            )
            print("Starting affirmations text thread")
            self.thread.start()
            return
        elif lowercase_name.startswith("single"):
            print("Special command: single")
            name = lowercase_name.split(":")[1].split("-")[0]
            text = lowercase_name.split(":")[2].split("-")[0]
            self.thread = StoppableThread(target=self.single, args=(name, text))
            self.thread.start()
            return
        elif lowercase_name in self.all_subdirs:
            print(
                f"Cycling through everything from {lowercase_name}! Only cycling through images for now"
            )
            gif = False
            for f in os.listdir(f"{DIR}/images/{lowercase_name}"):
                if f.split(".")[-1].lower() == "gif":
                    gif = True
                    break
            if gif:
                self.thread = StoppableThread(
                    target=self.cycle_dir_gifs, args=(lowercase_name,)
                )
                self.thread.start()
            else:
                self.thread = StoppableThread(
                    target=self.cycle_dir_imgs, args=(lowercase_name,)
                )
                self.thread.start()
            return
        elif lowercase_name == "random":
            print("Special command: random")
            lowercase_name = random.choice(all_file_names)
            print(f"Randomly chose this image/gif: {lowercase_name}")
        elif lowercase_name == "help":
            print("Special command: help")
            self.thread = StoppableThread(target=self.display_help)
            self.thread.start()
            return
        elif lowercase_name == "pokerscope":
            print("Special command: pokerscope")
            self.thread = StoppableThread(target=self.pokerscope)
            self.thread.start()
            return
        elif lowercase_name == "canvas":
            print("Special command: canvas")
            self.thread = StoppableThread(target=self.canvas_)
            self.thread.start()
            return
        elif lowercase_name == "howto":
            self.name = START_INSTRUCTIONS_STR
        # textsize = 'small' if lowercase_name == 'help' else 'normal'  # We actually never use this anymore oops

        # If image/gif can be downloaded
        if lowercase_name not in all_file_names:
            if self.args.img or self.args.gif:
                print("Image/gif does not exist, downloading from provided url...")
                if self.args.img:
                    download_image(
                        self.args.img,
                        f"{DIR}/images/{lowercase_name}.png",
                        resize_to=TOTEM_LED_SIZE,
                    )
                    self.paths[lowercase_name] = f"{DIR}/images/{lowercase_name}.png"
                    all_file_names.append(lowercase_name)
                if self.args.gif:
                    download_gif(
                        self.args.gif,
                        f"{DIR}/images/{lowercase_name}.gif",
                        resize_to=TOTEM_LED_SIZE,
                    )
                    self.paths[lowercase_name] = f"{DIR}/images/{lowercase_name}.gif"
                    all_file_names.append(lowercase_name)
            else:
                print(f"Displaying text {self.name}")

        print("Running image...")

        try:
            file = self.paths[lowercase_name]
        except KeyError:
            file = None

        # Display text if no image/gif to display
        if file is None:
            print("In text display thread")
            text_to_display = self.name
            for c in self.colors.keys():
                if self.name.endswith(c):
                    self.color = self.colors[c]
                    text_to_remove = self.name.rsplit("-", 1)[-1]
                    text_to_display = self.name[: -(len(text_to_remove) + 1)]
            self.thread = StoppableThread(
                target=self.scroll_text, args=(text_to_display, 0.04)
            )
            print("Starting text thread")
            self.thread.start()
        elif file.split(".")[-1] == "png":
            image = Image.open(f"{file}")
            self.matrix.SetImage(image.convert("RGB"))
        elif file.split(".")[-1] == "gif":
            gif = Image.open(f"{file}")
            num_frames = gif.n_frames
            durations = []
            frames = []
            for frame_index in range(0, num_frames):
                gif.seek(frame_index)
                duration = gif.info["duration"]
                durations.append(duration)
                frame = gif.copy()
                if frame_index >= len(self.canvases):
                    self.canvases.append(self.matrix.CreateFrameCanvas())
                self.canvases[frame_index].SetImage(frame.convert("RGB"))
                frames.append(self.canvases[frame_index])
            gif.close()
            self.thread = StoppableThread(
                target=self.gif, args=(frames, num_frames, durations)
            )
            print("Starting GIF thread")
            self.thread.start()
        elif file.split(".")[-1] == "txt":
            with open(f"images/{file}", "r") as f:
                text = f.readline().rstrip()

            self.thread = StoppableThread(target=self.scroll_text, args=(text,))
            print("Starting text thread")
            self.thread.start()

    def gif(self, frames, num_frames, durations):
        cur_frame = 0
        while True:
            if IS_DEV:
                self.matrix.SwapOnVSync(frames[cur_frame])
                time.sleep(durations[cur_frame] / 1000)
            else:
                self.matrix.SwapOnVSync(
                    frames[cur_frame],
                    framerate_fraction=max(durations[cur_frame] // 6.25, 1),
                )
            if cur_frame == num_frames - 1:
                cur_frame = 0
            else:
                cur_frame += 1
            if self.thread.stopped():
                break

    def gif_n(self, frames, num_frames, iters, framerate, durations):
        cur_frame = 0
        i = 0
        while i < iters:
            if IS_DEV:
                self.matrix.SwapOnVSync(frames[cur_frame])
                time.sleep(durations[cur_frame] / 1000)
            else:
                self.matrix.SwapOnVSync(
                    frames[cur_frame],
                    framerate_fraction=max(durations[cur_frame] // 6.25, 1),
                )
            if cur_frame == num_frames - 1:
                cur_frame = 0
                i += 1
            else:
                cur_frame += 1
            if self.thread.stopped():
                break

    def scroll_text(self, string, wait_time=0.05, textsize="normal", once=False):
        font = graphics.Font()
        if textsize == "normal":
            font.LoadFont(f"{DIR}/fonts/9x18.bdf")
        elif textsize == "small":
            font.LoadFont(f"{DIR}/fonts/4x6.bdf")
        else:
            raise ValueError(
                "Should never have a text size that is not normal or small"
            )
        color = self.color
        pos = self.canvas.width
        while True:
            if self.color == "party":
                color = RAINBOW_COLORS[(pos // 2) % 20]
            self.canvas.Clear()
            length = graphics.DrawText(self.canvas, font, pos, 32, color, string)
            pos -= 1
            if pos + length < 0:
                pos = self.canvas.width
                if once:
                    break
            time.sleep(wait_time)
            self.canvas = self.matrix.SwapOnVSync(self.canvas)
            if self.thread.stopped():
                break

    def cycle_dir_imgs(self, dirname, pause_time=2):
        full_dirname = f"{DIR}/images/{dirname}"
        imgs_to_cycle = os.listdir(full_dirname)
        random.shuffle(imgs_to_cycle)  # For fun
        img_idx = 0
        while True:
            img_name = imgs_to_cycle[img_idx]
            image = Image.open(os.path.join(full_dirname, img_name))
            self.matrix.SetImage(image.convert("RGB"))

            time.sleep(pause_time)
            img_idx = (img_idx + 1) % len(imgs_to_cycle)
            if self.thread.stopped():
                break

    def cycle_dir_gifs(self, dirname):
        if dirname == "aot":
            iters = 1
            framerate = 15
        elif dirname == "anime":
            iters = 1
            framerate = 10
        elif dirname == "fireforce":
            iters = 1
            framerate = 12
        elif dirname == "demon":
            iters = 1
            framerate = 10
        elif dirname == "pope":
            iters = 1
            framerate = 10
        else:
            iters = 2
            framerate = 10
        full_dirname = f"{DIR}/images/{dirname}"
        gifs_to_cycle = os.listdir(full_dirname)
        random.shuffle(gifs_to_cycle)
        img_idx = 0
        print(gifs_to_cycle)
        while True:
            gif = Image.open(f"{full_dirname}/{gifs_to_cycle[img_idx]}")
            print(img_idx, gifs_to_cycle[img_idx])
            num_frames = gif.n_frames
            frames = []
            durations = []
            for frame_index in range(0, num_frames):
                gif.seek(frame_index)
                durations.append(gif.info["duration"])
                frame = gif.copy()
                if frame_index >= len(self.canvases):
                    self.canvases.append(self.matrix.CreateFrameCanvas())
                self.canvases[frame_index].SetImage(frame.convert("RGB"))
                frames.append(self.canvases[frame_index])
            gif.close()
            self.gif_n(frames, num_frames, iters, framerate, durations)
            img_idx = (img_idx + 1) % len(gifs_to_cycle)
            if self.thread.stopped():
                break

    def single(self, name="tim", text="is single"):
        try:
            file = self.paths[name]
            print(file)
        except KeyError:
            return

        while True:
            image = Image.open(file)
            self.matrix.SetImage(image.convert("RGB"))
            time.sleep(5)

            self.scroll_text(text, once=True)

            if self.thread.stopped():
                break

    def display_affirmations(self, name="You"):
        font = graphics.Font()
        font.LoadFont(f"{DIR}/fonts/9x18.bdf")
        # font.LoadFont(f'{DIR}/fonts/4x6.bdf')
        smallfont = graphics.Font()
        smallfont.LoadFont(f"{DIR}/fonts/6x13.bdf")
        color = self.color
        counter = 0
        wait_counter = 0
        WAIT_TIME = 32
        word_counter = 0
        words_to_cycle = [
            "enough",
            "loved",
            "needed",
            "unique",
            "strong",
            "perfect",
            "worthy",
        ]  # Don't do any words longer than 7 letters otherwise it will be too long

        def staircase_function(x):
            if x < 32:
                return x
            elif x > 64:
                return x - 32
            else:
                return 32

        while True:
            if self.color == "party":
                color = RAINBOW_COLORS[(counter // 2) % 20]
            self.canvas.Clear()
            aff_word = words_to_cycle[word_counter]
            x_pos = counter - len(aff_word) * 9
            counter += 1

            if name == "You":
                graphics.DrawText(self.canvas, font, 19, 20, color, "You")
                graphics.DrawText(self.canvas, font, 19, 32, color, "are")
            else:
                graphics.DrawText(self.canvas, font, 19, 32, color, "is")
                graphics.DrawText(self.canvas, smallfont, 8, 20, color, name)
            length1 = graphics.DrawText(self.canvas, font, x_pos, 44, color, aff_word)

            # Pause at the halfway point
            if (
                x_pos + length1 // 2 > self.canvas.width // 2
                and wait_counter < WAIT_TIME
            ):
                wait_counter += 1
                counter -= (
                    1  # Decrement the normal counter so it's as if it didn't go up
                )

            if x_pos > self.canvas.width:
                counter = 0
                wait_counter = 0
                word_counter = (word_counter + 1) % len(words_to_cycle)
            time.sleep(0.05)
            self.canvas = self.matrix.SwapOnVSync(self.canvas)
            if self.thread.stopped():
                break

    def display_help(self):
        print("Inside self.display_help")
        font = graphics.Font()
        font.LoadFont(f"{DIR}/fonts/9x18.bdf")
        color = self.color
        x_positions = [self.canvas.width for _ in range(3)]
        special_commands_str = " | ".join(
            ["special commands: affirmations | help | howto | random"]
            + self.all_subdirs
        )
        print(special_commands_str)
        all_full_paths = list(self.paths.values())
        pngs_available = [
            (x.split("/")[-1])[: -(len(".png"))]
            for x in all_full_paths
            if x.endswith(".png")
        ]
        gifs_available = [
            (x.split("/")[-1])[: -(len(".gif"))]
            for x in all_full_paths
            if x.endswith(".gif")
        ]

        IGNORE_PREFIXES = ["duck"]
        for prefix in IGNORE_PREFIXES:
            pngs_available = [x for x in pngs_available if not x.startswith(prefix)]
            gifs_available = [x for x in gifs_available if not x.startswith(prefix)]
        # Hardcoded
        gifs_available.append("duck[X]")
        gifs_available = sorted(gifs_available)

        pngs_str = "pngs available: " + " | ".join(pngs_available)
        gifs_str = "gifs available: " + " | ".join(gifs_available)
        color_counter = 0
        while True:
            if self.color == "party":
                color_counter += 1
                colors = [RAINBOW_COLORS[(color_counter // 2) % 20] for _ in range(3)]
            else:
                colors = RGB_COLORS
            self.canvas.Clear()
            lengths = [
                graphics.DrawText(
                    self.canvas,
                    font,
                    x_positions[0],
                    14,
                    colors[0],
                    special_commands_str,
                ),
                graphics.DrawText(
                    self.canvas, font, x_positions[1], 32, colors[1], pngs_str
                ),
                graphics.DrawText(
                    self.canvas, font, x_positions[2], 50, colors[2], gifs_str
                ),
            ]

            for i in range(len(x_positions)):
                x_positions[i] -= 1
                if x_positions[i] + lengths[i] < 0:
                    x_positions[i] = self.canvas.width

            time.sleep(0.015)
            self.canvas = self.matrix.SwapOnVSync(self.canvas)
            if self.thread.stopped():
                break

    def pokerscope(self):
        print("Inside self.pokerscope")
        pokerscope = Pokerscope(f"{DIR}/fonts", self.canvas)
        while True:
            self.canvas.Clear()
            pokerscope.tick(self.canvas)
            time.sleep(0.015)
            self.canvas = self.matrix.SwapOnVSync(self.canvas)
            if self.thread.stopped():
                break

    def canvas_(self):
        print("Inside self.canvas_")
        while True:
            render_canvas(self.canvases, self.matrix)
            time.sleep(0.015)
            if self.thread.stopped():
                break


# Main function
if __name__ == "__main__":
    picture = Picture()
    if not picture.process():
        picture.print_help()

    time.sleep(10)
