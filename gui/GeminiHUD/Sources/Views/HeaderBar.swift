import SwiftUI

struct HeaderBar: View {
    @EnvironmentObject var appState: AppState
    @ObservedObject var viewModel = HUDViewModel.shared
    
    var body: some View {
        HStack {
            // App icon and title
            HStack(spacing: 8) {
                Image(systemName: "sparkle")
                    .foregroundColor(appState.currentTheme.accentColor)
                
                Text("Gemini HUD")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(appState.currentTheme.foregroundColor)
                
                if !viewModel.isConnected {
                    Text("(Offline)")
                        .font(.system(size: 10))
                        .foregroundColor(.orange)
                }
            }
            
            Spacer()
            
            // Status indicators
            HStack(spacing: 12) {
                // Connection status
                Circle()
                    .fill(viewModel.isConnected ? Color.green : Color.red)
                    .frame(width: 6, height: 6)
                
                // Tool approval mode toggle
                Menu {
                    ForEach(ToolApprovalMode.allCases, id: \.self) { mode in
                        Button(action: {
                            viewModel.setToolApprovalMode(mode)
                        }) {
                            HStack {
                                Image(systemName: mode.icon)
                                Text(mode.displayName)
                                if viewModel.toolApprovalMode == mode {
                                    Spacer()
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: viewModel.toolApprovalMode.icon)
                            .font(.system(size: 11))
                        Text(viewModel.toolApprovalMode == .yolo ? "Auto" : "Ask")
                            .font(.system(size: 11, weight: .medium))
                    }
                    .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.8))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(appState.currentTheme.backgroundColor.opacity(0.5))
                    .cornerRadius(4)
                }
                .menuStyle(.borderlessButton)
                .fixedSize()
                
                // Token usage
                HStack(spacing: 4) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 10))
                    Text("2.3k")
                        .font(.system(size: 11, weight: .medium))
                }
                .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.8))
                
                // Response time
                HStack(spacing: 4) {
                    Text("12ms")
                        .font(.system(size: 11, weight: .medium))
                }
                .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.8))
                
                // Window controls
                Button(action: { NSApp.hide(nil) }) {
                    Image(systemName: "minus.circle")
                        .font(.system(size: 12))
                        .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.6))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 12)
        .background(appState.currentTheme.backgroundColor.opacity(0.5))
    }
}