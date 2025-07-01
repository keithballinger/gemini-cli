import AppKit
import Combine

enum HotCorner: CaseIterable {
    case topLeft
    case topRight
    case bottomLeft
    case bottomRight
    
    var trackingArea: NSTrackingArea {
        let rect: NSRect
        let screen = NSScreen.main ?? NSScreen()
        let frame = screen.frame
        let size: CGFloat = 20
        
        switch self {
        case .topLeft:
            rect = NSRect(x: frame.minX, y: frame.maxY - size, width: size, height: size)
        case .topRight:
            rect = NSRect(x: frame.maxX - size, y: frame.maxY - size, width: size, height: size)
        case .bottomLeft:
            rect = NSRect(x: frame.minX, y: frame.minY, width: size, height: size)
        case .bottomRight:
            rect = NSRect(x: frame.maxX - size, y: frame.minY, width: size, height: size)
        }
        
        return NSTrackingArea(
            rect: rect,
            options: [.mouseEnteredAndExited, .activeAlways],
            owner: nil,
            userInfo: ["corner": self]
        )
    }
}

class HotCornersManager: ObservableObject {
    @Published var activeCorner: HotCorner?
    
    private var cornerWindows: [HotCorner: NSWindow] = [:]
    private var eventMonitor: Any?
    weak var appState: AppState?
    private var statsWindowManager: StatsWindowManager?
    private var historyWindowManager: ConversationHistoryWindowManager?
    
    init(appState: AppState? = nil) {
        self.appState = appState
        self.statsWindowManager = StatsWindowManager(appState: appState)
        self.historyWindowManager = ConversationHistoryWindowManager(appState: appState)
        setupCornerWindows()
        startMonitoring()
    }
    
    deinit {
        stopMonitoring()
    }
    
    private func setupCornerWindows() {
        for corner in HotCorner.allCases {
            let window = createInvisibleWindow(for: corner)
            cornerWindows[corner] = window
        }
    }
    
    private func createInvisibleWindow(for corner: HotCorner) -> NSWindow {
        let screen = NSScreen.main ?? NSScreen()
        let frame = screen.frame
        let size: CGFloat = 20
        let rect: NSRect
        
        switch corner {
        case .topLeft:
            rect = NSRect(x: frame.minX, y: frame.maxY - size, width: size, height: size)
        case .topRight:
            rect = NSRect(x: frame.maxX - size, y: frame.maxY - size, width: size, height: size)
        case .bottomLeft:
            rect = NSRect(x: frame.minX, y: frame.minY, width: size, height: size)
        case .bottomRight:
            rect = NSRect(x: frame.maxX - size, y: frame.minY, width: size, height: size)
        }
        
        let window = NSWindow(
            contentRect: rect,
            styleMask: .borderless,
            backing: .buffered,
            defer: false
        )
        
        window.isOpaque = false
        window.backgroundColor = .clear
        window.level = .screenSaver
        window.ignoresMouseEvents = false
        window.collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]
        window.orderFrontRegardless()
        
        // Set up tracking
        let trackingView = HotCornerView(corner: corner) { [weak self] in
            self?.handleCornerActivation(corner)
        }
        
        window.contentView = trackingView
        
        return window
    }
    
    private func startMonitoring() {
        // Monitor for screen configuration changes
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(screenConfigurationChanged),
            name: NSApplication.didChangeScreenParametersNotification,
            object: nil
        )
    }
    
    private func stopMonitoring() {
        if let monitor = eventMonitor {
            NSEvent.removeMonitor(monitor)
        }
    }
    
    @objc private func screenConfigurationChanged() {
        // Recreate corner windows for new screen configuration
        cornerWindows.values.forEach { $0.close() }
        cornerWindows.removeAll()
        setupCornerWindows()
    }
    
    private func handleCornerActivation(_ corner: HotCorner) {
        activeCorner = corner
        
        switch corner {
        case .topLeft:
            // Toggle voice input
            appState?.isVoiceInputActive.toggle()
        case .topRight:
            // Show stats dashboard
            showStatsDashboard()
        case .bottomLeft:
            // Open tool palette
            HUDViewModel.shared.toggleToolPalette()
        case .bottomRight:
            // Access conversation history
            showConversationHistory()
        }
    }
    
    private func showStatsDashboard() {
        statsWindowManager?.showStats()
    }
    
    private func showConversationHistory() {
        historyWindowManager?.showHistory()
    }
}

class HotCornerView: NSView {
    let corner: HotCorner
    let onActivate: () -> Void
    private var trackingArea: NSTrackingArea?
    
    init(corner: HotCorner, onActivate: @escaping () -> Void) {
        self.corner = corner
        self.onActivate = onActivate
        super.init(frame: .zero)
        setupTracking()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupTracking() {
        trackingArea = NSTrackingArea(
            rect: bounds,
            options: [.mouseEnteredAndExited, .activeAlways, .inVisibleRect],
            owner: self,
            userInfo: nil
        )
        addTrackingArea(trackingArea!)
    }
    
    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        if let area = trackingArea {
            removeTrackingArea(area)
        }
        setupTracking()
    }
    
    override func mouseEntered(with event: NSEvent) {
        super.mouseEntered(with: event)
        
        // Add a small delay to prevent accidental activation
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            guard let self = self else { return }
            
            // Check if mouse is still in the corner
            let mouseLocation = NSEvent.mouseLocation
            let windowFrame = self.window?.frame ?? .zero
            
            if windowFrame.contains(mouseLocation) {
                self.onActivate()
            }
        }
    }
}