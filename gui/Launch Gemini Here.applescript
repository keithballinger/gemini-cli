on run
    tell application "Finder"
        try
            set currentFolder to (target of front window) as alias
            set folderPath to POSIX path of currentFolder
        on error
            -- If no Finder window is open, use Desktop
            set folderPath to POSIX path of (path to desktop)
        end try
    end tell
    
    do shell script "open 'gemini://launch" & folderPath & "'"
end run

-- Handle when dropped on the script
on open droppedItems
    repeat with anItem in droppedItems
        set folderPath to POSIX path of anItem
        do shell script "open 'gemini://launch" & folderPath & "'"
    end repeat
end open