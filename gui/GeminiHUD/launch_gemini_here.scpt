-- AppleScript to launch Gemini HUD in current Finder location
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