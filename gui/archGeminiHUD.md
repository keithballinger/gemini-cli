# Gemini HUD Technical Architecture

## Overview

Gemini HUD is a native macOS overlay application that provides a gaming-inspired, always-on interface for AI-assisted coding. Built with SwiftUI and Metal, it integrates with the existing Gemini CLI core through IPC communication.

## Core Architecture Principles

### 1. Native Performance
- **SwiftUI**: Modern declarative UI framework for macOS
- **Metal**: GPU-accelerated rendering for effects and animations
- **Core ML**: On-device speech recognition for privacy
- **Minimal Memory Footprint**: Target <200MB RAM usage

### 2. Modular Design
- **Clean separation** between UI and business logic
- **Protocol-oriented** programming for testability
- **Dependency injection** for component isolation
- **MVVM architecture** for UI components

### 3. Security & Privacy
- **Local-first processing**: No data leaves the device
- **Keychain integration**: Secure credential storage
- **Sandboxed execution**: App Store ready
- **No screen recording**: Respects user privacy

## System Architecture

### Layer 1: Presentation Layer

#### Window Management
```swift
NSPanel (Overlay Window)
├── Transparency Controller
├── Click-through Handler
├── Position Manager
└── Multi-monitor Support
```

#### UI Components
- **HUDView**: Main overlay container
- **ConversationView**: Message display with syntax highlighting
- **InputField**: Command input with auto-completion
- **ToolPalette**: Collapsible tool sidebar
- **StatsView**: Real-time metrics dashboard
- **HotCornerManager**: Corner activation zones

### Layer 2: Business Logic Layer

#### Core Services
1. **ChatService**: Manages conversation state and history
2. **ToolService**: Handles tool execution and approval
3. **VoiceService**: Speech recognition and processing
4. **ThemeService**: Dynamic theming engine
5. **MetricsService**: Performance and usage tracking
6. **SettingsService**: User preferences management

#### State Management
- **ObservableObject**: For reactive UI updates
- **Combine Framework**: For event streaming
- **UserDefaults**: For persistent settings
- **Core Data**: For conversation history

### Layer 3: Integration Layer

#### IPC Communication
```
GeminiHUD (Swift) <-> IPC Bridge <-> Gemini CLI (Node.js)
                      JSON-RPC
```

#### Protocol Design
```swift
protocol GeminiCLIProtocol {
    func sendMessage(_ message: String) async throws -> Response
    func executeTool(_ tool: Tool) async throws -> ToolResult
    func getStatus() async throws -> Status
}
```

### Layer 4: Infrastructure Layer

#### Node.js Process Management
- **Process lifecycle**: Start, monitor, restart
- **Message queuing**: Reliable delivery
- **Error recovery**: Automatic reconnection
- **Resource monitoring**: CPU/memory limits

## Data Flow Architecture

### Message Flow
```
User Input → InputField → ChatService → IPC Bridge → CLI Core
                                              ↓
HUDView ← ConversationView ← ChatService ← Response
```

### Tool Execution Flow
```
Tool Request → ToolService → Approval UI → User Decision
                                              ↓
                                         Approved?
                                         ↓       ↓
                                       Yes      No
                                        ↓        ↓
                                   Execute   Cancel
```

## Component Architecture

### HUDView Structure
```swift
HUDView
├── HeaderBar
│   ├── AppIcon
│   ├── StatusIndicators
│   └── WindowControls
├── ContentArea
│   ├── ConversationScrollView
│   ├── InputContainer
│   └── ToolPalette (collapsible)
└── OverlayEffects
    ├── BackgroundBlur
    ├── BorderGlow
    └── Animations
```

### Voice Input Pipeline
```
Audio Input → Core ML → Transcription → Command Parser → Action
                ↓
         Waveform UI ← Audio Levels
```

### Theme System Architecture
```swift
protocol Theme {
    var colors: ColorPalette
    var typography: Typography
    var effects: VisualEffects
    var animations: AnimationSet
}
```

## Security Architecture

### Communication Security
- **Message signing**: Verify CLI responses
- **TLS encryption**: For future remote connections
- **Input sanitization**: Prevent injection attacks
- **Rate limiting**: Prevent resource exhaustion

### Privacy Controls
- **Incognito mode**: No history persistence
- **Selective recording**: Voice input boundaries
- **Screen content**: Never captured or transmitted
- **Telemetry**: Opt-in anonymous metrics only

## Performance Architecture

### Optimization Strategies
1. **Lazy loading**: Load components on demand
2. **View recycling**: Reuse message cells
3. **Texture caching**: GPU texture management
4. **Batch updates**: Coalesce UI changes
5. **Background queues**: Off-main-thread processing

### Memory Management
- **Conversation trimming**: Keep recent N messages
- **Image optimization**: Downscale for display
- **Resource cleanup**: Aggressive deallocation
- **Memory warnings**: Graceful degradation

## Testing Architecture

### Test Pyramid
1. **Unit Tests** (70%)
   - Services, Models, Utilities
   - Mock external dependencies
   - Test business logic isolation

2. **Integration Tests** (20%)
   - IPC communication
   - Tool execution flow
   - State persistence

3. **UI Tests** (10%)
   - Critical user journeys
   - Accessibility compliance
   - Visual regression tests

### Test Infrastructure
```swift
protocol Mockable {
    associatedtype MockType
    static func mock() -> MockType
}
```

## Build Architecture

### Targets
1. **GeminiHUD**: Main application
2. **GeminiHUDTests**: Unit test suite
3. **GeminiHUDUITests**: UI test suite
4. **GeminiCore**: Shared framework

### Dependencies
- **SwiftLint**: Code quality
- **Sparkle**: Auto-updates
- **Sentry**: Crash reporting (optional)

## Deployment Architecture

### Distribution
1. **Direct download**: DMG with notarization
2. **Mac App Store**: Sandboxed version
3. **Homebrew**: Developer-friendly install
4. **Auto-updater**: Sparkle framework

### CI/CD Pipeline
```yaml
Build → Test → Lint → Package → Notarize → Deploy
```

## Future Architecture Considerations

### Extensibility
- **Plugin system**: Third-party integrations
- **Custom tools**: User-defined actions
- **API surface**: Developer SDK

### Platform Expansion
- **iOS companion**: Remote control app
- **watchOS**: Quick commands
- **Web interface**: Browser-based version

### AI Integration
- **Local LLMs**: On-device inference
- **Custom models**: Specialized tasks
- **Federated learning**: Privacy-preserving improvements

## Architecture Decision Records (ADRs)

### ADR-001: SwiftUI over AppKit
**Decision**: Use SwiftUI for all UI components
**Rationale**: Modern, declarative, better animations
**Trade-offs**: Requires macOS 13+, some AppKit bridging needed

### ADR-002: IPC over Native Integration
**Decision**: Communicate with CLI via IPC, not direct linking
**Rationale**: Maintains separation, allows independent updates
**Trade-offs**: Slight latency, complexity in error handling

### ADR-003: Core ML for Voice
**Decision**: Use Core ML instead of cloud speech services
**Rationale**: Privacy, offline capability, no API costs
**Trade-offs**: Limited to Apple's models, no custom training

### ADR-004: Metal for Rendering
**Decision**: Use Metal for visual effects
**Rationale**: Best performance, native to platform
**Trade-offs**: More complex than Core Animation alone

## Monitoring & Observability

### Metrics Collection
- **Performance**: Frame rate, memory, CPU
- **Usage**: Feature adoption, session length
- **Errors**: Crash rate, error frequency
- **Quality**: Tool success rate, retry count

### Logging Strategy
```swift
enum LogLevel {
    case debug    // Development only
    case info     // General information
    case warning  // Recoverable issues
    case error    // Non-fatal errors
    case critical // Fatal errors
}
```

## Conclusion

This architecture provides a solid foundation for building a performant, secure, and user-friendly overlay interface for Gemini CLI. The modular design ensures testability and maintainability while the native implementation guarantees the best possible user experience on macOS.