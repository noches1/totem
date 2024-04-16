#!/usr/bin/python3
 
import dbus
import os
import time
 
from advertisement import Advertisement
from service import Application, Service, Characteristic, Descriptor
from matrix import Matrix
from PIL import Image
from rgbmatrix import graphics
import threading

GATT_CHRC_IFACE = "org.bluez.GattCharacteristic1"
DIR = '/home/totem/totem'

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

class Picture(Matrix):
    def __init__(self, *args, **kwargs):
        super(Picture, self).__init__(*args, **kwargs)
        self.value = 'cry'
        self.thread = None
        
    def run(self):
        names = [x.split('.')[0] for x in os.listdir(f'{DIR}/images')]
        filenames = os.listdir(f'{DIR}/images')

        print('Running image...')

        try:
            loc = names.index(self.value)
            file = filenames[loc]
        except ValueError:
            file = None

        if file is None:
            self.thread = StoppableThread(target=self.scroll_text, args=(self.value,))
            print('Starting text thread')
            self.thread.start()
        elif file.split('.')[1] == 'png':
            image = Image.open(f'{DIR}/images/{file}')
            self.matrix.SetImage(image.convert('RGB'))
        elif file.split('.')[1] == 'gif':
            gif = Image.open(f'{DIR}/images/{file}')
            num_frames = gif.n_frames
            frames = []
            for frame_index in range(0, num_frames):
                gif.seek(frame_index)
                frame = gif.copy()
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
        cur_frame = 0
        while(True):
            self.matrix.SwapOnVSync(frames[cur_frame], framerate_fraction=10)
            if cur_frame == num_frames - 1:
                cur_frame = 0
            else:
                cur_frame += 1
            if self.thread.stopped():
                break

    def scroll_text(self, string):
        offscreen_canvas = self.matrix.CreateFrameCanvas()
        font = graphics.Font()
        font.LoadFont(f'{DIR}/fonts/9x18.bdf') 
        color = graphics.Color(255, 0, 0)
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

class TotemAdvertisement(Advertisement):
    def __init__(self, index):
        Advertisement.__init__(self, index, "peripheral")
        self.add_local_name("Totem")
        self.include_tx_power = True
 
class TotemService(Service):
    TOTEM_SVC_UUID = "00000001-dead-dead-dead-3e5b444bc3c1"
 
    def __init__(self, index):
        self.value = 'default'

        Service.__init__(self, index, self.TOTEM_SVC_UUID, True)
        self.add_characteristic(TotemCharacteristic(self))

        self.totem = Picture()
        self.totem.process()
 
class TotemCharacteristic(Characteristic):
    TOTEM_CHARACTERISTIC_UUID = "00000002-dead-dead-dead-3e5b444bc3c1"
 
    def __init__(self, service):
        Characteristic.__init__(
                self, self.TOTEM_CHARACTERISTIC_UUID,
                ["read", "write"], service)
 
    def ReadValue(self, options):
        text = f'Displaying {self.service.totem.value}'
        value = []
        for c in text:
            value.append(dbus.Byte(c.encode())) 
        return value

    def WriteValue(self, value, options):
        if self.service.totem.thread is not None:
            self.service.totem.thread.stop()
        self.service.totem.thread.join()
        self.service.totem.value = ''.join([str(x) for x in value])
        print(f'Changing totem to: {self.service.totem.value}')
        self.service.totem.run()

app = Application()
app.add_service(TotemService(0))
app.register()
 
adv = TotemAdvertisement(0)
adv.register()
 
try:
    app.run()
except KeyboardInterrupt:
    app.quit()
