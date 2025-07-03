import SwiftUI
import AppKit

class WindowManager: ObservableObject {
    var hudWindow: HUDWindow?
    weak var appState: AppState?
    
    func showHUD() {
        print("WindowManager: showHUD called")
        if hudWindow == nil {
            print("WindowManager: Creating new HUD window")
            hudWindow = HUDWindow(appState: appState)
        }
        print("WindowManager: Making window key and visible")
        hudWindow?.makeKeyAndOrderFront(nil)
        hudWindow?.center()
        print("WindowManager: Window visible = \(hudWindow?.isVisible ?? false)")
    }
    
    func hideHUD() {
        hudWindow?.orderOut(nil)
    }
    
    func setTransparency(_ alpha: CGFloat) {
        hudWindow?.alphaValue = alpha
    }
    
    func setClickThrough(_ enabled: Bool) {
        hudWindow?.ignoresMouseEvents = enabled
    }
}

class HUDWindow: NSPanel {
    weak var appState: AppState?
    
    init(appState: AppState?) {
        self.appState = appState
        
        let screenRect = NSScreen.main?.frame ?? NSRect(x: 0, y: 0, width: 800, height: 600)
        // Center the window on screen
        let windowWidth: CGFloat = 1000
        let windowHeight: CGFloat = 500
        let windowRect = NSRect(
            x: screenRect.midX - windowWidth/2,
            y: screenRect.midY - windowHeight/2,
            width: windowWidth,
            height: windowHeight
        )
        
        super.init(
            contentRect: windowRect,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        
        setupWindow()
        setupContentView()
    }
    
    private func setupWindow() {
        // Window appearance
        isOpaque = false
        backgroundColor = .clear
        level = .floating
        collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        isMovableByWindowBackground = true
        titlebarAppearsTransparent = true
        
        // Always on top
        level = .statusBar
        
        // Initial transparency
        alphaValue = 0.8
    }
    
    private func setupContentView() {
        // Create HUD view with both required environment objects
        if let appState = appState {
            let hudView = HUDView()
                .environmentObject(HUDViewModel.shared)
                .environmentObject(appState)
            
            contentView = NSHostingView(rootView: hudView)
        } else {
            // Fallback - create simple view
            contentView = NSHostingView(rootView: SimpleHUDView())
        }
    }
    
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { true }
    
    override func makeKeyAndOrderFront(_ sender: Any?) {
        super.makeKeyAndOrderFront(sender)
        // Ensure the window becomes key window
        NSApp.activate(ignoringOtherApps: true)
    }
}