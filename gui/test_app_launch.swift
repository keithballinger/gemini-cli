#!/usr/bin/env swift

import Cocoa

// Simple test to see if basic AppKit initialization works
class TestDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        print("Test app launched successfully")
        
        // Create a simple window
        let window = NSWindow(
            contentRect: NSRect(x: 100, y: 100, width: 400, height: 300),
            styleMask: [.titled, .closable, .miniaturizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Test Window"
        window.makeKeyAndOrderFront(nil)
        
        print("Window created and shown")
        
        // Exit after 2 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            NSApp.terminate(nil)
        }
    }
}

let app = NSApplication.shared
let delegate = TestDelegate()
app.delegate = delegate
app.run()