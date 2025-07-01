import SwiftUI

struct HUDView: View {
    @StateObject private var viewModel = HUDViewModel.shared
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        ZStack {
            // Background with blur effect
            VisualEffectView()
                .overlay(
                    appState.currentTheme.backgroundColor
                        .opacity(0.3)
                )
            
            VStack(spacing: 0) {
                // Header bar
                HeaderBar()
                    .frame(height: 30)
                
                Divider()
                    .foregroundColor(appState.currentTheme.borderColor)
                
                // Content area
                HStack(spacing: 0) {
                    // Tool palette (collapsible)
                    if viewModel.isToolPaletteVisible {
                        ToolPalette()
                            .frame(width: 60)
                            .transition(.move(edge: .leading))
                        
                        Divider()
                            .foregroundColor(appState.currentTheme.borderColor)
                    }
                    
                    // Main conversation area
                    VStack(spacing: 8) {
                        ConversationView()
                            .frame(maxHeight: .infinity)
                        
                        HStack {
                            InputField()
                                .frame(height: 40)
                            
                            if appState.isVoiceInputActive {
                                VoiceInputIndicator()
                                    .padding(.leading, 8)
                            }
                        }
                    }
                    .padding(12)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(appState.currentTheme.borderColor, lineWidth: 1)
        )
        .shadow(color: appState.currentTheme.shadowColor, radius: 20)
    }
}

// Visual effect for background blur
struct VisualEffectView: NSViewRepresentable {
    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.blendingMode = .behindWindow
        view.state = .active
        view.material = .hudWindow
        return view
    }
    
    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {}
}