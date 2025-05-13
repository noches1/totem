#!/bin/bash
echo "Checking connectivity..."
if ! ping -c 1 totem.local >/dev/null 2>&1; then
        echo "Error: Cannot connect to totem.local"
        exit 1
fi
echo "Connected!"

echo "Building client..."
pnpm --filter client build
echo "Client built!"

echo "Zipping archive..."
stashName=$(git stash create)
git archive --format=zip -o totem.zip $stashName
echo "Created zip archive"

echo "Uploading zip archive..."
scp -i ./scripts/deploy_key totem.zip totem@totem.local:~

echo "SSH into totem and extracting archive..."
ssh -i ./scripts/deploy_key totem@totem.local "sudo rm -rf totem && unzip totem.zip -d totem"
echo "Extracted archive successful"

echo "Restarting totem service..."
ssh -i ./scripts/deploy_key totem@totem.local "sudo systemctl restart totem.service"
echo "Successfully deployed totem service"
