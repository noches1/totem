#!/bin/bash
echo "Checking connectivity..."
if ! ping -c 1 totem.local >/dev/null 2>&1; then
        echo "Error: Cannot connect to totem.local"
        exit 1
fi
echo "Connected!"

echo "Building client..."
pnpm --offline --no-update-notifier --filter client build
if [ $? -ne 0 ]; then
        echo "Error: TypeScript type checking failed. Aborting deployment."
        exit 1
fi
echo "Client built!"

echo "Zipping archive..."
rm -f totem.zip
if [[ $1 == "fast" ]]; then
        zip -r totem.zip . -x "*.git*" -x "*.DS_Store*" -x "*.pnpm*" -x "*node_modules*" -x "images/*" -x "fonts/*" -x "*.venv*" -x "*__pycache__*"
else
        zip -r totem.zip . -x "*.git*" -x "*.DS_Store*" -x "*.pnpm*" -x "*node_modules*" -x "*.venv*" -x "*__pycache__*"
fi
echo "Created zip archive"

echo "Uploading zip archive..."
scp -i ./scripts/deploy_key totem.zip totem@totem.local:~

echo "SSH into totem and extracting archive..."
if [[ $1 == "fast" ]]; then
        ssh -i ./scripts/deploy_key totem@totem.local "unzip -o totem.zip -d totem"
else
        ssh -i ./scripts/deploy_key totem@totem.local "sudo rm -rf totem && unzip totem.zip -d totem"
fi
echo "Extracted archive successful"

echo "Restarting totem service..."
ssh -i ./scripts/deploy_key totem@totem.local "sudo systemctl restart totem.service"
echo "Successfully deployed totem service"
