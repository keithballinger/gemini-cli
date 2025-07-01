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
        // Initialize app state
        appState = AppState()
        windowManager = WindowManager()
        windowManager?.appState = appState
        
        // Hide from dock
        NSApp.setActivationPolicy(.accessory)
        
        // Create menu bar item
        setupStatusBar()
        
        // Show HUD window
        windowManager?.showHUD()
        
        // Set up hot corners
        hotCornersManager = HotCornersManager(appState: appState)
        
        // Set up keyboard shortcuts
        keyboardShortcutManager = KeyboardShortcutManager(windowManager: windowManager, appState: appState)
        keyboardShortcutManager?.setupShortcuts()
        
        // Request accessibility permissions if needed
        KeyboardShortcutManager.requestAccessibilityPermissions()
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
}