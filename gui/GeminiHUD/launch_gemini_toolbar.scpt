-- AppleScript app for Finder toolbar integration
-- This can be dragged to the Finder toolbar for easy access

try
    tell application "Finder"
        if (count of windows) > 0 then
            set currentFolder to (target of front window) as text
            set currentPath to POSIX path of currentFolder
        else
            set currentPath to (POSIX path of (path to desktop))
        end if
    end tell
    
    set geminiURL to "gemini://launch" & currentPath
    do shell script "open " & quoted form of geminiURL
    
    -- Optional: Show notification
    display notification "Launching Gemini in " & currentPath with title "Gemini HUD"
    
on error errMsg
    display alert "Error launching Gemini" message errMsg
end try