import SwiftUI
import AppKit

class WindowManager: ObservableObject {
    private var hudWindow: HUDWindow?
    
    func showHUD() {
        if hudWindow == nil {
            hudWindow = HUDWindow()
        }
        hudWindow?.makeKeyAndOrderFront(nil)
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
    init() {
        let screenRect = NSScreen.main?.frame ?? NSRect(x: 0, y: 0, width: 800, height: 600)
        let windowRect = NSRect(
            x: screenRect.midX - 400,
            y: screenRect.maxY - 200,
            width: 800,
            height: 150
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
        contentView = NSHostingView(rootView: HUDView())
    }
    
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}