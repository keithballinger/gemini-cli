# Finder Integration Setup

The Finder context menu requires manual setup because macOS restricts automatic service registration.

## Option 1: Enable the Service (Recommended)

1. **Open System Preferences**
   - Go to System Preferences → Keyboard → Shortcuts → Services
   - OR System Preferences → Extensions → Finder

2. **Find the Service**
   - Look for "Launch Gemini in this folder" under "Files and Folders"
   - Check the box to enable it

3. **Restart Finder**
   ```bash
   killall Finder
   ```

## Option 2: Use AppleScript App

Double-click `launch_gemini_here.app` when you have a Finder window open - it will launch Gemini in that folder.

## Option 3: Use URL Scheme Directly

```bash
open "gemini://launch/path/to/folder"
```

## Option 4: Drag & Drop to Dock

1. Drag `launch_gemini_here.app` to your Dock
2. Click it whenever you want to launch Gemini in the current Finder location

## Testing

Once enabled, right-click on any folder in Finder and you should see "Launch Gemini in this folder" in the context menu.

## Alternative: Create Toolbar Button

1. Open Finder
2. View → Customize Toolbar
3. Drag `launch_gemini_here.app` to the toolbar
4. Click "Done"

Now you have a toolbar button to launch Gemini in the current folder!