#!/usr/bin/python3

import dbus

from advertisement import Advertisement
from service import Application, Service, Characteristic
from picture import Picture

GATT_CHRC_IFACE = "org.bluez.GattCharacteristic1"
DIR = "/home/totem/totem"


class TotemAdvertisement(Advertisement):
    def __init__(self, index):
        Advertisement.__init__(self, index, "peripheral")
        self.add_local_name("Totem")
        self.include_tx_power = True


class TotemService(Service):
    TOTEM_SVC_UUID = "00000001-dead-dead-dead-3e5b444bc3c1"

    def __init__(self, index):
        self.value = "default"

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
            self, self.TOTEM_CHARACTERISTIC_UUID, ["read", "write"], service
        )

    def ReadValue(self, options):
        text = f"Displaying {self.service.totem.name}"
        value = []
        for c in text:
            value.append(dbus.Byte(c.encode()))
        return value

    def WriteValue(self, value, options):
        self.service.totem.run_command(value)


class Brightness(Characteristic):
    TOTEM_CHARACTERISTIC_UUID = "00000003-dead-dead-dead-b12164711e55"  # This is supposed to look like "brightness" in hex characters only

    def __init__(self, service):
        Characteristic.__init__(
            self, self.TOTEM_CHARACTERISTIC_UUID, ["read", "write"], service
        )

    def ReadValue(self, options):
        text = f"Brightness: {self.service.totem.matrix.brightness}"
        print(text)
        value = []
        for c in text:
            value.append(dbus.Byte(c.encode()))
        return value

    def WriteValue(self, value, options):
        brightness = int("".join([str(x) for x in value]))
        if brightness > 0 and brightness <= 100:
            print(f"Changing to brightness: {brightness}")
            self.service.totem.matrix.brightness = brightness
            # Repeat code from above, might be necessary every time we call run() again
            if self.service.totem.thread is not None:
                self.service.totem.thread.stop()
                self.service.totem.thread.join()
            print(
                f"Changing totem brightness to: {self.service.totem.matrix.brightness}"
            )
            self.service.totem.run()
        else:
            print(
                "Please choose a brightness value between 0 and 100, otherwise you will be ignored"
            )


app = Application()
app.add_service(TotemService(0))
app.register()

adv = TotemAdvertisement(0)
adv.register()

try:
    app.run()
except KeyboardInterrupt:
    app.quit()
