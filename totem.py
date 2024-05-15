#!/usr/bin/python3
 
import dbus
import os
import time
 
from advertisement import Advertisement
from service import Application, Service, Characteristic, Descriptor
from picture import Picture

GATT_CHRC_IFACE = "org.bluez.GattCharacteristic1"
DIR = '/home/totem/totem'

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
        self.add_characteristic(Command(self))
        self.add_characteristic(Brightness(self))

        self.totem = Picture()
        self.totem.process()
        self.totem.run()

class Command(Characteristic):
    TOTEM_CHARACTERISTIC_UUID = "00000002-dead-dead-dead-3e5b444bc3c1"
 
    def __init__(self, service):
        Characteristic.__init__(
                self, self.TOTEM_CHARACTERISTIC_UUID,
                ["read", "write"], service)
 
    def ReadValue(self, options):
        text = f'Displaying {self.service.totem.name}'
        value = []
        for c in text:
            value.append(dbus.Byte(c.encode())) 
        return value

    def WriteValue(self, value, options):
        if self.service.totem.thread is not None:
            self.service.totem.thread.stop()
            self.service.totem.thread.join()
        self.service.totem.name = ''.join([str(x) for x in value])
        print(f'Changing totem to: {self.service.totem.name}')
        self.service.totem.run()

class Brightness(Characteristic):
    TOTEM_CHARACTERISTIC_UUID = "00000003-dead-dead-dead-3e5b444bc3c1"
 
    def __init__(self, service):
        Characteristic.__init__(
                self, self.TOTEM_CHARACTERISTIC_UUID,
                ["read", "write"], service)
 
    def ReadValue(self, options):
        text = f'Brightness: {self.service.totem.matrix.brightness}'
        value = []
        for c in text:
            value.append(dbus.Byte(c.encode())) 
        return value

    def WriteValue(self, value, options):
        brightness = int(''.join([str(x) for x in value]))
        print(brightness)
        if brightness > 0 and brightness <= 100:
            print(f'!!! {brightness}')
            self.totem.matrix.SetBrightness
            print(self.totem.matrix)
            print('asdf')
            self.service.totem.matrix.SetBrightness(brightness)
            #self.totem.process(100)
            #self.totem.run()
            print(self.totem.matrix)

app = Application()
app.add_service(TotemService(0))
app.register()
 
adv = TotemAdvertisement(0)
adv.register()
 
try:
    app.run()
except KeyboardInterrupt:
    app.quit()
