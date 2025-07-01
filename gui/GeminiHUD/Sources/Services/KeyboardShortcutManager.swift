import AppKit
import Carbon

class KeyboardShortcutManager {
    private var eventMonitor: Any?
    private var localMonitor: Any?
    weak var windowManager: WindowManager?
    weak var appState: AppState?
    
    init(windowManager: WindowManager?, appState: AppState?) {
        self.windowManager = windowManager
        self.appState = appState
    }
    
    func setupShortcuts() {
        // Local event monitor for when HUD has focus
        localMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if self?.handleKeyEvent(event) == true {
                return nil // Consume the event
            }
            return event
        }
        
        // Global monitor for system-wide shortcuts
        if AXIsProcessTrusted() {
            setupGlobalShortcuts()
        }
    }
    
    private func setupGlobalShortcuts() {
        eventMonitor = NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { [weak self] event in
            self?.handleGlobalKeyEvent(event)
        }
    }
    
    private func handleKeyEvent(_ event: NSEvent) -> Bool {
        let modifiers = event.modifierFlags
        let keyCode = event.keyCode
        
        // Command shortcuts
        if modifiers.contains(.command) {
            switch keyCode {
            case 36: // Return - Execute command
                if modifiers.contains(.shift) {
                    // Cmd+Shift+Return - Execute with new line
                    return false
                } else {
                    // Cmd+Return - Execute
                    HUDViewModel.shared.sendMessage()
                    return true
                }
                
            case 40: // K - Clear conversation
                clearConversation()
                return true
                
            case 44: // / - Show command palette
                showCommandPalette()
                return true
                
            case 126: // Up arrow - Previous message
                navigateHistory(direction: .previous)
                return true
                
            case 125: // Down arrow - Next message
                navigateHistory(direction: .next)
                return true
                
            case 18...26: // 1-9 - Quick tool selection
                let toolIndex = Int(keyCode - 18)
                selectTool(at: toolIndex)
                return true
                
            default:
                break
            }
        }
        
        // Escape - Minimize HUD
        if keyCode == 53 {
            windowManager?.hideHUD()
            return true
        }
        
        return false
    }
    
    private func handleGlobalKeyEvent(_ event: NSEvent) {
        let modifiers = event.modifierFlags
        let keyCode = event.keyCode
        
        if modifiers.contains([.command, .shift]) {
            switch keyCode {
            case 5: // G - Toggle HUD
                toggleHUD()
                
            case 45: // N - New conversation
                newConversation()
                
            case 15: // R - Resume last conversation
                resumeConversation()
                
            case 9: // V - Toggle voice input
                toggleVoiceInput()
                
            default:
                break
            }
        }
    }
    
    private func toggleHUD() {
        if windowManager?.hudWindow?.isVisible == true {
            windowManager?.hideHUD()
        } else {
            windowManager?.showHUD()
        }
    }
    
    private func newConversation() {
        appState?.currentConversation = Conversation()
        HUDViewModel.shared.messages.removeAll()
    }
    
    private func resumeConversation() {
        // TODO: Implement conversation history
    }
    
    private func toggleVoiceInput() {
        appState?.isVoiceInputActive.toggle()
    }
    
    private func clearConversation() {
        HUDViewModel.shared.messages.removeAll()
    }
    
    private func showCommandPalette() {
        // TODO: Implement command palette
        print("Show command palette")
    }
    
    private func navigateHistory(direction: HistoryDirection) {
        // TODO: Implement history navigation
        print("Navigate history: \(direction)")
    }
    
    private func selectTool(at index: Int) {
        // TODO: Implement tool selection
        print("Select tool at index: \(index)")
    }
    
    enum HistoryDirection {
        case previous, next
    }
    
    deinit {
        if let monitor = eventMonitor {
            NSEvent.removeMonitor(monitor)
        }
        if let monitor = localMonitor {
            NSEvent.removeMonitor(monitor)
        }
    }
}

// Helper to check for accessibility permissions
extension KeyboardShortcutManager {
    static func requestAccessibilityPermissions() {
        let options: NSDictionary = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true]
        let trusted = AXIsProcessTrustedWithOptions(options)
        
        if !trusted {
            print("Accessibility permissions required for global shortcuts")
        }
    }
}