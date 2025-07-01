import SwiftUI
import AppKit

class ConversationHistoryWindowManager {
    private var historyWindow: NSWindow?
    weak var appState: AppState?
    
    init(appState: AppState?) {
        self.appState = appState
        
        // Listen for close notification
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(closeWindow),
            name: .closeConversationHistory,
            object: nil
        )
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    func showHistory() {
        if historyWindow == nil {
            createHistoryWindow()
        }
        
        historyWindow?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }
    
    @objc private func closeWindow() {
        historyWindow?.orderOut(nil)
    }
    
    private func createHistoryWindow() {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 800, height: 600),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        
        window.title = "Conversation History"
        window.center()
        window.setFrameAutosaveName("ConversationHistoryWindow")
        window.isReleasedWhenClosed = false
        window.level = .floating
        window.minSize = NSSize(width: 600, height: 400)
        
        // Set content view
        if let appState = appState {
            let contentView = NSHostingView(
                rootView: ConversationHistory().environmentObject(appState)
            )
            window.contentView = contentView
        }
        
        // Configure appearance
        window.titlebarAppearsTransparent = true
        window.backgroundColor = .clear
        window.isOpaque = false
        
        historyWindow = window
    }
}