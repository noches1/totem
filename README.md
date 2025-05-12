## Powering on
Plug the wire coming out of the totem into the 12V IN/OUT plug of the battery. Turn on the battery by flipping the switch. The totem will turn on and play a GIF.

## Connecting via SSH
The totem will attempt to search for known WiFI networks. If no known WiFi networks are in range, the totem will host its own access point.
SSID: odiri
password: audreyli

Connect to the same network as the totem and SSH into the totem with <code>ssh totem@totem.local</code>

## Connecting via Bluetooth
1. Run <code>sudo bluetoothctl</code>
2. Scan for devices with <code>scan on</code> and enable discoverability with <code>discover on</code>
3. Figure out your phone's MAC address.
4. Pair the phone to the totem with <code>pair MAC_ADDRESS</code>. 
5. The totem should show up as <code>totem</code> on your phone. Some phone should appear on your phone. Click Pair.
6. Enable automatic Bluetooth connections in the future with <code>discover on</code>

## Running the totem.
1. Download nRF Connect on the Apple App Store
2. Connect to the totem via Bluetooth
3. Find the totem in nRF Connect and open up the Bluetooth details
4. The first characteristic determines what is running on the totem. Write a value encoded as UTF-8. The totem will search for a local image or GIF sharing the same name as the value. If no value is found, the totem will scroll the text across the screen.

## MacOS local running
pip3 install -r requirements.txt
python3 run_dev.py
we have a local copy of libsixel in the git repo because mac os is cringe with C library detection