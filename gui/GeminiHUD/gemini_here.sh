#!/bin/bash

# Simple script to launch Gemini in current Finder location
# Can be added to Finder toolbar or used from command line

# Get the frontmost Finder window path
FINDER_PATH=$(osascript -e '
tell application "Finder"
    if (count of windows) > 0 then
        set currentFolder to (target of front window) as text
        POSIX path of currentFolder
    else
        POSIX path of (path to desktop)
    end if
end tell' 2>/dev/null)

if [ -n "$FINDER_PATH" ]; then
    echo "Launching Gemini in: $FINDER_PATH"
    open "gemini://launch$FINDER_PATH"
else
    echo "Could not get Finder path, using Desktop"
    open "gemini://launch$HOME/Desktop/"
fi