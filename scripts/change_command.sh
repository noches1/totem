#!/bin/bash
echo "Checking connectivity..."
if ! ping -c 1 totem.local >/dev/null 2>&1; then
        echo "Error: Cannot connect to totem.local"
        exit 1
fi
echo "Connected!"

echo "SSH into totem and changing default command..."
ssh -i ./scripts/deploy_key totem@totem.local "echo '$1' | sudo tee ~/.default_command > /dev/null"
echo "Change command successful"

echo "Restarting totem service..."
ssh -i ./scripts/deploy_key totem@totem.local "sudo systemctl restart totem.service"
echo "Successfully deployed totem service"
