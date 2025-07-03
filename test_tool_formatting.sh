#!/bin/bash

# Kill any existing HUD or CLI processes
pkill -f "GeminiHUD" || true
pkill -f "gemini --ipc" || true

# Clean up log files
rm -f /tmp/hud_test.log
rm -f /Users/keithballinger/Desktop/projects/gemini-cli/gui/GeminiHUD/Sources/gemini-hud.log

echo "Starting GeminiHUD test..."

# Start the HUD app
open /Users/keithballinger/Library/Developer/Xcode/DerivedData/GeminiHUD-emxvvmtuywoquldojbnsnnwxbwbw/Build/Products/Debug/GeminiHUD.app &

# Give it time to start
sleep 3

echo "HUD should be running now."
echo "Test steps:"
echo "1. Check that the approval mode toggle appears in the header (should show 'Auto' by default)"
echo "2. Type: 'list files in current directory' and press Enter"
echo "3. Watch for the tool execution to be displayed separately from the message"
echo "4. Toggle to 'Ask permission' mode using the menu"
echo "5. Type: 'show git status' and press Enter" 
echo "6. You should see an approval request for the tool"
echo ""
echo "Press Ctrl+C to stop the test"

# Keep the script running
tail -f /dev/null