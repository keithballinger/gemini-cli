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
        
        // Run as background app (no dock icon)
        NSApp.setActivationPolicy(.accessory)
        
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
        
        // Handle URL scheme events for launching with folder
        NSAppleEventManager.shared().setEventHandler(
            self,
            andSelector: #selector(handleGetURLEvent(_:withReplyEvent:)),
            forEventClass: AEEventClass(kInternetEventClass),
            andEventID: AEEventID(kAEGetURL)
        )
        
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
        
        // Create simple menu
        let menu = NSMenu()
        menu.addItem(NSMenuItem(title: "Show Gemini", action: #selector(showHUD), keyEquivalent: ""))
        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "Quit", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
        
        statusBarItem?.menu = menu
    }
    
    // Removed setupGlobalHotkeys - now handled by KeyboardShortcutManager
    
    @objc private func showHUD() {
        windowManager?.showHUD()
        // Bring app to front when showing HUD
        NSApp.activate(ignoringOtherApps: true)
    }
    
    // Handle launching Gemini with a specific folder path
    func launchGeminiInFolder(_ folderPath: String) {
        print("AppDelegate: Launching Gemini in folder: \(folderPath)")
        
        // Show the HUD first
        showHUD()
        
        // Change the working directory in the IPC service
        Task {
            do {
                try await HUDViewModel.shared.changeWorkingDirectory(folderPath)
                print("AppDelegate: Successfully changed working directory to: \(folderPath)")
            } catch {
                print("AppDelegate: Failed to change working directory: \(error)")
            }
        }
    }
    
    
    @objc func handleGetURLEvent(_ event: NSAppleEventDescriptor, withReplyEvent: NSAppleEventDescriptor) {
        guard let urlString = event.paramDescriptor(forKeyword: AEKeyword(keyDirectObject))?.stringValue,
              let url = URL(string: urlString) else { return }
        
        if url.scheme == "gemini" && url.host == "launch" {
            // Extract folder path from URL
            let folderPath = url.path
            if !folderPath.isEmpty {
                launchGeminiInFolder(folderPath)
            } else {
                showHUD()
            }
        }
    }
}