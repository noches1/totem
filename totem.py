#!/usr/bin/python3

import dbus
import threading

from advertisement import Advertisement
from service import Application, Service, Characteristic
from picture import Picture
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import subprocess


GATT_CHRC_IFACE = "org.bluez.GattCharacteristic1"
DIR = "/home/totem/totem"


class TotemAdvertisement(Advertisement):
    def __init__(self, index):
        Advertisement.__init__(self, index, "peripheral")
        self.add_local_name("Totem")
        self.include_tx_power = True


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

    def run(self):
        self.totem.run()


app = Application()
totem_service = TotemService(0)
app.add_service(totem_service)
app.register()

adv = TotemAdvertisement(0)
adv.register()


def start_flask_app():
    flask_app = Flask(__name__, static_folder="./web/client/dist", static_url_path="")
    CORS(flask_app)

    def run_redis_cli(*args):
        try:
            proc = subprocess.run(
                ["redis-cli", *args], capture_output=True, text=True, check=True
            )
            return proc.stdout.strip()
        except:
            return None

    @flask_app.route("/api/hello")
    def hello():
        return "hello"

    @flask_app.route("/api/command", methods=["POST"])
    def command():
        data = request.get_json(force=True)
        if "command" not in data:
            return jsonify({"error": "No command provided"}), 400
        totem_service.totem.run_command(data["command"])
        return jsonify({"command": data["command"]})

    @flask_app.route("/api/command", methods=["GET"])
    def current_command():
        return jsonify({"command": run_redis_cli("GET", "command")})

    @flask_app.route("/", defaults={"path": ""})
    @flask_app.route("/<path:path>")
    def serve(path):
        """
        Serve any file out of dist/ if it exists,
        otherwise fall back to index.html (for SPA routing).
        """
        if path and os.path.exists(os.path.join(flask_app.static_folder, path)):
            return send_from_directory(flask_app.static_folder, path)
        # either “/” or missing file → serve index.html
        return send_from_directory(flask_app.static_folder, "index.html")

    flask_app.run("0.0.0.0", port=80, debug=False)


thread = threading.Thread(target=start_flask_app)

try:
    thread.start()
    app.run()
except KeyboardInterrupt:
    app.quit()
