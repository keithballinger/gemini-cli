# Gemini HUD Implementation Plan

## Overview
Build a macOS native gaming-style overlay GUI for the Gemini CLI that provides an always-on, semi-transparent interface for AI-assisted coding.

## Technology Stack
- **Frontend**: SwiftUI for native macOS experience
- **Backend Integration**: Swift bindings to existing TypeScript/Node.js core
- **IPC**: Use Node.js child process with JSON-RPC communication
- **Voice**: Core ML for on-device speech recognition
- **Graphics**: Metal for GPU-accelerated effects

## Development Workflow

### Branch Setup
```bash
git checkout -b feature/gemini-hud
```

### Development Cycle
1. Write unit tests for new functionality
2. Implement feature to pass tests
3. Run test suite: `swift test`
4. Run linter: `swiftlint`
5. Fix any issues
6. Build project: `xcodebuild -scheme GeminiHUD build`
7. Manual testing in Xcode
8. Commit changes with conventional commits
9. **DO NOT git push** - only commit locally

### Testing Strategy
- Unit tests for all Swift components
- Integration tests for Node.js communication
- UI tests using XCTest
- Manual testing checklist for each feature
- Accessibility testing with VoiceOver

## Implementation Tasks

### Phase 1: Foundation (Week 1-2)

#### Task 1: Project Setup
- [ ] Create new Xcode project with SwiftUI
- [ ] Set up Swift Package Manager
- [ ] Configure build settings for macOS 13+
- [ ] Add SwiftLint configuration
- [ ] Create test targets
- [ ] Set up CI/CD configuration (GitHub Actions)
- [ ] Create Makefile for build commands

#### Task 2: Node.js Integration Layer
- [ ] Write tests for IPC communication
- [ ] Create Swift Process wrapper for Node.js
- [ ] Implement JSON-RPC protocol handler
- [ ] Build message queue system
- [ ] Handle process lifecycle management
- [ ] Create error recovery mechanisms
- [ ] Test with existing CLI commands

#### Task 3: Window Management
- [ ] Write tests for overlay behavior
- [ ] Create NSPanel subclass for overlay window
- [ ] Implement transparency controls
- [ ] Add click-through functionality
- [ ] Handle multi-monitor support
- [ ] Create window positioning system
- [ ] Test with various window configurations

### Phase 2: Core UI (Week 3-4)

#### Task 4: Main HUD Interface
- [ ] Write tests for conversation view
- [ ] Design SwiftUI conversation component
- [ ] Implement message bubbles with syntax highlighting
- [ ] Add input field with auto-completion
- [ ] Create animation system for transitions
- [ ] Build theme engine
- [ ] Test with long conversations

#### Task 5: Hot Corners System
- [ ] Write tests for hot corner detection
- [ ] Implement NSTrackingArea for corners
- [ ] Create action mapping system
- [ ] Add visual feedback for activation
- [ ] Build configuration UI
- [ ] Handle edge cases (full screen apps)
- [ ] Test on different screen sizes

#### Task 6: Visual Tool Palette
- [ ] Write tests for tool palette
- [ ] Design collapsible side panel
- [ ] Create tool icon system
- [ ] Implement hover animations
- [ ] Add drag-and-drop support
- [ ] Build tool approval UI
- [ ] Test tool execution flow

### Phase 3: Advanced Features (Week 5-6)

#### Task 7: Voice Input System
- [ ] Write tests for voice recognition
- [ ] Integrate Core ML Speech framework
- [ ] Create waveform visualization
- [ ] Implement push-to-talk mechanism
- [ ] Add voice command parser
- [ ] Build feedback system
- [ ] Test with various accents/speeds

#### Task 8: Stats Dashboard
- [ ] Write tests for metrics collection
- [ ] Design stats visualization components
- [ ] Implement real-time charts
- [ ] Create token usage tracker
- [ ] Add performance monitoring
- [ ] Build export functionality
- [ ] Test with heavy usage

#### Task 9: Gesture Controls
- [ ] Write tests for gesture recognizers
- [ ] Implement trackpad gestures
- [ ] Add Magic Mouse support
- [ ] Create gesture customization
- [ ] Build visual feedback system
- [ ] Handle gesture conflicts
- [ ] Test on different input devices

### Phase 4: Polish & Integration (Week 7-8)

#### Task 10: Theme System
- [ ] Write tests for theme engine
- [ ] Create theme file format
- [ ] Build Cyberpunk theme
- [ ] Build Synthwave theme
- [ ] Implement theme editor
- [ ] Add theme sharing
- [ ] Test theme transitions

#### Task 11: Performance Optimization
- [ ] Write performance benchmarks
- [ ] Implement GPU acceleration
- [ ] Optimize memory usage
- [ ] Add lazy loading
- [ ] Create performance settings
- [ ] Profile and fix bottlenecks
- [ ] Test on older Macs

#### Task 12: Accessibility
- [ ] Write accessibility tests
- [ ] Add VoiceOver support
- [ ] Implement keyboard navigation
- [ ] Create high contrast mode
- [ ] Add screen reader descriptions
- [ ] Test with accessibility tools
- [ ] Document accessibility features

### Phase 5: Final Integration (Week 9-10)

#### Task 13: Settings & Preferences
- [ ] Write tests for settings storage
- [ ] Create preferences window
- [ ] Implement settings sync
- [ ] Add import/export
- [ ] Build onboarding flow
- [ ] Create default configurations
- [ ] Test settings migration

#### Task 14: App Distribution
- [ ] Write tests for auto-updater
- [ ] Create DMG installer
- [ ] Implement Sparkle updater
- [ ] Add crash reporting
- [ ] Build telemetry system
- [ ] Create app notarization
- [ ] Test installation flow

#### Task 15: Documentation & Help
- [ ] Write tests for help system
- [ ] Create in-app help
- [ ] Build interactive tutorials
- [ ] Add tooltips system
- [ ] Create video guides
- [ ] Write developer docs
- [ ] Test help accessibility

## Testing Checklist (Run after each task)

```bash
# 1. Run unit tests
swift test

# 2. Run UI tests
xcodebuild test -scheme GeminiHUD -destination 'platform=macOS'

# 3. Run linter
swiftlint

# 4. Check test coverage (aim for >80%)
xcrun xccov view --report coverage.xcresult

# 5. Build release version
xcodebuild -scheme GeminiHUD -configuration Release

# 6. Manual testing checklist
# - [ ] Feature works as expected
# - [ ] No memory leaks (check Instruments)
# - [ ] Accessibility verified
# - [ ] Dark/light mode tested
# - [ ] Multi-monitor tested
# - [ ] Performance acceptable

# 7. Commit with conventional commits
git add .
git commit -m "feat(hud): implement [feature name]"

# DO NOT RUN: git push
```

## Architecture Notes

### Key Design Decisions
1. **Native SwiftUI**: Better performance than Electron
2. **Node.js subprocess**: Reuse existing CLI core
3. **Local-first**: All processing on device
4. **Modular design**: Each component independently testable

### File Structure
```
gui/
├── GeminiHUD/
│   ├── Sources/
│   │   ├── App/
│   │   ├── Views/
│   │   ├── Models/
│   │   ├── Services/
│   │   └── Utils/
│   ├── Tests/
│   │   ├── UnitTests/
│   │   └── UITests/
│   └── Resources/
├── Package.swift
├── Makefile
└── README.md
```

### Communication Protocol
```swift
// Request to Node.js
{
  "id": "unique-id",
  "method": "chat.send",
  "params": {
    "message": "user input",
    "context": {}
  }
}

// Response from Node.js
{
  "id": "unique-id",
  "result": {
    "response": "AI response",
    "tools": []
  }
}
```

## Success Criteria
- [ ] All tests passing with >80% coverage
- [ ] App runs smoothly on 2018+ Macs
- [ ] Memory usage under 200MB
- [ ] Startup time under 2 seconds
- [ ] No accessibility violations
- [ ] Crash-free for 8 hours continuous use

## Risk Mitigation
1. **Performance issues**: Profile early and often
2. **Node.js integration**: Build robust error handling
3. **Window management**: Test with many apps
4. **Voice accuracy**: Provide fallback options
5. **Theme complexity**: Start with minimal themes

Remember: **Test first, commit often, never push until ready for review!**