#!/bin/bash

# Start the bridge in the background
echo "Starting Gemini bridge..."
cd nodejs-bridge && npm start &
BRIDGE_PID=$!

# Wait for bridge to be ready
echo "Waiting for bridge to start..."
sleep 3

# Test the shell
echo "Testing Gemini shell..."
cd .. && echo "g translate README.md to spanish" | ./target/release/gemini-shell

# Kill the bridge
kill $BRIDGE_PID 2>/dev/null