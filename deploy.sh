#!/bin/bash
echo "Checking connectivity..."
if ! ping -c 1 totem.local > /dev/null 2>&1; then
    echo "Error: Cannot connect to totem.local"
    exit 1
fi
echo "Connected!"

echo "Zipping archive..."
git archive --format=zip HEAD -o totem.zip
echo "Created zip archive"

echo "Uploading zip archive..."
scp totem.zip totem@totem.local:~

echo "SSH into totem and unzipping archive..."
ssh totem@totem.local "sudo rm -rf totem && unzip totem.zip"
echo "Archive unzipped successfully on totem"

echo "SSH into totem and starting totem service..."
ssh totem@totem.local "sudo pkill -f totem.py && cd totem && sudo python3 totem.py &"
echo "Totem service restarted successfully"
