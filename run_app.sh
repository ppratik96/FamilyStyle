#!/bin/bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install and switch to Node 20 (Required for newer Metro versions)
echo "Installing/Switching to Node 20 to support Metro..."
nvm install 20
nvm use 20

# Start the app
echo "Starting BillSplitter with Node $(node -v)..."
npx expo start
