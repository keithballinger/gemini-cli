import SwiftUI
import AppKit

@main
struct GeminiHUDApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    var body: some Scene {
        Settings {
            EmptyView()
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    var windowManager: WindowManager?
    var appState: AppState?
    var statusBarItem: NSStatusItem?
    var hotCornersManager: HotCornersManager?
    var keyboardShortcutManager: KeyboardShortcutManager?
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        print("AppDelegate: Application launched")
        
        // Initialize app state
        appState = AppState()
        windowManager = WindowManager()
        windowManager?.appState = appState
        
        // Keep in dock for debugging
        NSApp.setActivationPolicy(.regular)
        
        // Create menu bar item
        print("AppDelegate: Setting up status bar")
        setupStatusBar()
        print("AppDelegate: Status bar setup complete")
        
        // Show HUD window
        print("AppDelegate: Showing HUD window")
        windowManager?.showHUD()
        
        // TEMPORARILY DISABLED for debugging
        // Set up hot corners
        // hotCornersManager = HotCornersManager(appState: appState)
        
        // Set up keyboard shortcuts
        // keyboardShortcutManager = KeyboardShortcutManager(windowManager: windowManager, appState: appState)
        // keyboardShortcutManager?.setupShortcuts()
        
        // Request accessibility permissions if needed
        // KeyboardShortcutManager.requestAccessibilityPermissions()
        
        // Auto-connect to IPC on startup
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            print("AppDelegate: Initiating IPC connection...")
            HUDViewModel.shared.connectToIPC()
        }
    }
    
    private func setupStatusBar() {
        statusBarItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        
        if let button = statusBarItem?.button {
            button.image = NSImage(systemSymbolName: "sparkle", accessibilityDescription: "Gemini HUD")
            button.image?.isTemplate = true
        }
        
        // Create menu
        let menu = NSMenu()
        menu.addItem(NSMenuItem(title: "Show HUD", action: #selector(showHUD), keyEquivalent: ""))
        menu.addItem(NSMenuItem(title: "Hide HUD", action: #selector(hideHUD), keyEquivalent: ""))
        menu.addItem(NSMenuItem.separator())
        
        // Connection status
        let connectionItem = NSMenuItem(title: HUDViewModel.shared.isConnected ? "Disconnect from CLI" : "Connect to CLI", 
                                      action: #selector(toggleConnection), 
                                      keyEquivalent: "")
        menu.addItem(connectionItem)
        
        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "New Conversation", action: #selector(newConversation), keyEquivalent: "n"))
        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "Preferences...", action: #selector(showPreferences), keyEquivalent: ","))
        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "Quit", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
        
        statusBarItem?.menu = menu
    }
    
    // Removed setupGlobalHotkeys - now handled by KeyboardShortcutManager
    
    @objc private func showHUD() {
        windowManager?.showHUD()
    }
    
    @objc private func hideHUD() {
        windowManager?.hideHUD()
    }
    
    @objc private func toggleHUD() {
        if windowManager?.hudWindow?.isVisible == true {
            hideHUD()
        } else {
            showHUD()
        }
    }
    
    @objc private func newConversation() {
        appState?.currentConversation = Conversation()
        // TODO: Clear conversation in view model
    }
    
    @objc private func showPreferences() {
        // TODO: Show preferences window
    }
    
    @objc private func toggleConnection() {
        if HUDViewModel.shared.isConnected {
            // TODO: Add disconnect functionality to IPC service
            print("Disconnect not yet implemented")
        } else {
            HUDViewModel.shared.connectToIPC()
        }
        
        // Update menu
        setupStatusBar()
    }
}