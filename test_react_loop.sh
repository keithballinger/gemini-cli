#!/bin/bash

echo "Testing IPC server React loop with tool retry behavior..."

# Kill any existing HUD processes
pkill -f GeminiHUD

# Start the HUD in the background
cd gui/GeminiHUD
.build/debug/GeminiHUD &
HUD_PID=$!

echo "Started HUD with PID: $HUD_PID"

# Give it a moment to start
sleep 2

# Test tool retry behavior by asking for list directory which should fail and retry
echo "Testing tool retry behavior with list_directory..."
echo "You should see:"
echo "1. Tool fails with 'Error: Failed to execute tool'"
echo "2. React loop continues automatically"  
echo "3. Gemini tries a different approach or retries"

echo ""
echo "Please test by:"
echo "1. Setting mode to YOLO (auto-approve)"
echo "2. Send message: 'use the shell command to list files in current directory'"
echo "3. Observe if the tool retries after failure"

echo ""
echo "Press any key to stop the test..."
read -n 1

# Kill the HUD
kill $HUD_PID 2>/dev/null
echo "Test complete."