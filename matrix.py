import argparse
import time
import sys
import os

from dev import IS_DEV

sys.path.append(os.path.abspath(os.path.dirname(__file__) + "/.."))

if IS_DEV:
    print("rgbmatrix not found, Importing RGBMatrixEmulator")
    from RGBMatrixEmulator import RGBMatrix, RGBMatrixOptions
else:
    from rgbmatrix import RGBMatrix, RGBMatrixOptions  # type: ignore


class Matrix(object):
    def __init__(self, *args, **kwargs):
        self.parser = argparse.ArgumentParser()

        self.parser.add_argument(
            "-r",
            "--led-rows",
            action="store",
            help="Display rows. 16 for 16x32, 32 for 32x32. Default: 32",
            default=32,
            type=int,
        )
        self.parser.add_argument(
            "--led-cols",
            action="store",
            help="Panel columns. Typically 32 or 64. (Default: 32)",
            default=32,
            type=int,
        )
        self.parser.add_argument(
            "-c",
            "--led-chain",
            action="store",
            help="Daisy-chained boards. Default: 1.",
            default=1,
            type=int,
        )
        self.parser.add_argument(
            "-P",
            "--led-parallel",
            action="store",
            help="For Plus-models or RPi2: parallel chains. 1..3. Default: 1",
            default=1,
            type=int,
        )
        self.parser.add_argument(
            "-p",
            "--led-pwm-bits",
            action="store",
            help="Bits used for PWM. Something between 1..11. Default: 11",
            default=11,
            type=int,
        )
        self.parser.add_argument(
            "-m",
            "--led-gpio-mapping",
            help="Hardware Mapping: regular, adafruit-hat, adafruit-hat-pwm",
            choices=["regular", "regular-pi1", "adafruit-hat", "adafruit-hat-pwm"],
            type=str,
        )
        self.parser.add_argument(
            "--led-scan-mode",
            action="store",
            help="Progressive or interlaced scan. 0 Progressive, 1 Interlaced (default)",
            default=1,
            choices=range(2),
            type=int,
        )
        self.parser.add_argument(
            "--led-pwm-lsb-nanoseconds",
            action="store",
            help="Base time-unit for the on-time in the lowest significant bit in nanoseconds. Default: 300",
            default=300,
            type=int,
        )
        self.parser.add_argument(
            "--led-show-refresh",
            action="store_true",
            help="Shows the current refresh rate of the LED panel",
        )
        self.parser.add_argument(
            "--led-slowdown-gpio",
            action="store",
            help="Slow down writing to GPIO. Range: 0..4. Default: 1",
            default=1,
            type=int,
        )
        self.parser.add_argument(
            "--led-no-hardware-pulse",
            action="store",
            help="Don't use hardware pin-pulse generation",
        )
        self.parser.add_argument(
            "--led-rgb-sequence",
            action="store",
            help="Switch if your matrix has led colors swapped. Default: RGB",
            default="RGB",
            type=str,
        )
        self.parser.add_argument(
            "--led-pixel-mapper",
            action="store",
            help='Apply pixel mappers. e.g "Rotate:90"',
            default="",
            type=str,
        )
        self.parser.add_argument(
            "--led-row-addr-type",
            action="store",
            help="0 = default; 1=AB-addressed panels; 2=row direct; 3=ABC-addressed panels; 4 = ABC Shift + DE direct",
            default=0,
            type=int,
            choices=[0, 1, 2, 3, 4],
        )
        self.parser.add_argument(
            "--led-multiplexing",
            action="store",
            help="Multiplexing type: 0=direct; 1=strip; 2=checker; 3=spiral; 4=ZStripe; 5=ZnMirrorZStripe; 6=coreman; 7=Kaler2Scan; 8=ZStripeUneven... (Default: 0)",
            default=0,
            type=int,
        )
        self.parser.add_argument(
            "--led-panel-type",
            action="store",
            help="Needed to initialize special panels. Supported: 'FM6126A'",
            default="",
            type=str,
        )
        self.parser.add_argument(
            "--led-no-drop-privs",
            dest="drop_privileges",
            help="Don't drop privileges from 'root' after initializing the hardware.",
            action="store_false",
        )
        self.parser.set_defaults(drop_privileges=True)

    def usleep(self, value):
        time.sleep(value / 1000000.0)

    def run(self):
        print("Running")

    def process(self, brightness=50):
        self.args = self.parser.parse_args()

        options = RGBMatrixOptions()

        if self.args.led_gpio_mapping != None:
            options.hardware_mapping = self.args.led_gpio_mapping
        if IS_DEV:
            options.rows = 128
            options.cols = 64
        else:
            options.rows = 32
            options.cols = 64
        options.chain_length = 1 if IS_DEV else 2
        options.parallel = self.args.led_parallel
        options.row_address_type = self.args.led_row_addr_type

        options.pwm_bits = self.args.led_pwm_bits
        options.brightness = brightness
        options.pwm_lsb_nanoseconds = self.args.led_pwm_lsb_nanoseconds
        options.led_rgb_sequence = self.args.led_rgb_sequence
        options.pixel_mapper_config = "V-Mapper"
        options.panel_type = self.args.led_panel_type
        options.limit_refresh_rate_hz = 100

        options.gpio_slowdown = 5

        if self.args.led_show_refresh:
            options.show_refresh_rate = 1

        if self.args.led_no_hardware_pulse:
            options.disable_hardware_pulsing = True
        options.drop_privileges = False

        self.matrix = RGBMatrix(options=options)
        self.canvas = self.matrix.CreateFrameCanvas()

        self.canvases = [self.matrix.CreateFrameCanvas() for i in range(10)]

        return True
