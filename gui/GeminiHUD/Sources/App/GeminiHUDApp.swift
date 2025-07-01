import SwiftUI

@main
struct GeminiHUDApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var windowManager = WindowManager()
    
    var body: some Scene {
        Settings {
            EmptyView()
        }
        .commands {
            CommandGroup(after: .appInfo) {
                Button("Check for Updates...") {
                    // TODO: Implement Sparkle update check
                }
                .keyboardShortcut("U", modifiers: [.command, .shift])
            }
        }
    }
    
    init() {
        setupApplication()
    }
    
    private func setupApplication() {
        // Hide from dock
        NSApp.setActivationPolicy(.accessory)
        
        // Create and show the HUD window
        DispatchQueue.main.async {
            self.windowManager.showHUD()
        }
    }
}