#!/usr/bin/env swift

import SwiftUI

@main
struct MinimalApp: App {
    init() {
        print("MinimalApp: init")
    }
    
    var body: some Scene {
        Settings {
            EmptyView()
        }
    }
}

class MinimalDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        print("MinimalApp: launched")
        
        // Create window
        let window = NSWindow(
            contentRect: NSRect(x: 100, y: 100, width: 400, height: 200),
            styleMask: [.titled, .closable],
            backing: .buffered,
            defer: false
        )
        window.title = "Test"
        window.contentView = NSHostingView(rootView: Text("Hello").padding())
        window.makeKeyAndOrderFront(nil)
        
        // Exit after 3 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
            NSApp.terminate(nil)
        }
    }
}