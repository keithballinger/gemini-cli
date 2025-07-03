#!/bin/bash

# Kill any existing HUD or CLI processes
pkill -f "GeminiHUD" || true
pkill -f "gemini --ipc" || true

# Clean up log files
rm -f /tmp/hud_test.log
rm -f /Users/keithballinger/Desktop/projects/gemini-cli/gui/GeminiHUD/Sources/gemini-hud.log
rm -f /Users/keithballinger/Desktop/projects/gemini-cli/gui/GeminiHUD/gemini-hud.log

echo "Starting GeminiHUD test..."

# Start the HUD app
cd /Users/keithballinger/Desktop/projects/gemini-cli
/Users/keithballinger/Desktop/projects/gemini-cli/gui/GeminiHUD/.build/debug/GeminiHUD &

# Give it time to start
sleep 3

echo "HUD should be running now."
echo ""
echo "Test steps:"
echo "1. Check that the approval mode toggle appears in the header (should show 'Auto' by default)"
echo "2. Type: 'list files in current directory' and press Enter"
echo "3. Watch for the tool execution to be displayed separately from the message"
echo "4. Toggle to 'Ask permission' mode using the menu"
echo "5. Type: 'show git status' and press Enter" 
echo "6. You should see an approval request for the tool"
echo ""
echo "To check logs, run: tail -f gui/GeminiHUD/gemini-hud.log"
echo ""
echo "Press Ctrl+C to stop the test"

# Keep the script running
tail -f /dev/null