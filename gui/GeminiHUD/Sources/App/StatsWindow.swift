import SwiftUI
import AppKit

class StatsWindowManager {
    private var statsWindow: NSWindow?
    weak var appState: AppState?
    
    init(appState: AppState?) {
        self.appState = appState
    }
    
    func showStats() {
        if statsWindow == nil {
            createStatsWindow()
        }
        
        statsWindow?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
    
    func hideStats() {
        statsWindow?.orderOut(nil)
    }
    
    private func createStatsWindow() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 600, height: 500),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        
        window.title = "Gemini HUD - Statistics"
        window.center()
        window.setFrameAutosaveName("StatsWindow")
        window.isReleasedWhenClosed = false
        window.level = .floating
        
        // Set content view
        if let appState = appState {
            let contentView = NSHostingView(
                rootView: StatsDashboard().environmentObject(appState)
            )
            window.contentView = contentView
        }
        
        // Configure appearance
        window.titlebarAppearsTransparent = true
        window.backgroundColor = .clear
        window.isOpaque = false
        
        statsWindow = window
    }
}