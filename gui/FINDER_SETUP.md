# Finder Context Menu Setup

Your Gemini HUD Finder integration is ready! You just need to enable it:

## Quick Setup (30 seconds):

1. **Open System Preferences** (or System Settings on newer macOS)
2. **Go to Keyboard > Services** (or Keyboard > Keyboard Shortcuts > Services)
3. **Scroll down to "Files and Folders" section**
4. **Check the box next to "Launch Gemini in this folder"**
5. **Done!** 

## How to Use:

- **Right-click any folder** in Finder
- **Choose "Launch Gemini in this folder"** from the Services submenu
- **Gemini HUD will open** with that folder as the working directory

## Alternative Methods:

If you prefer not to use the Services menu:

### Method 1: Desktop App
- Double-click **"Launch Gemini Here.app"** on your Desktop
- Works with the currently open Finder window

### Method 2: Direct URL
- Type `gemini://launch/path/to/folder` in any browser
- Or use Terminal: `open "gemini://launch$(pwd)"`

## Why This Approach?

This uses Apple's official Automator Quick Actions system - the same method used by built-in macOS features and recommended by Apple for context menu integration.