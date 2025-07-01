import SwiftUI

struct InputField: View {
    @ObservedObject var viewModel = HUDViewModel()
    @EnvironmentObject var appState: AppState
    @FocusState private var isFocused: Bool
    
    var body: some View {
        HStack(spacing: 8) {
            // Input field
            TextField("Type or speak your command...", text: $viewModel.inputText)
                .textFieldStyle(.plain)
                .font(.system(size: 13))
                .foregroundColor(appState.currentTheme.foregroundColor)
                .focused($isFocused)
                .onSubmit {
                    viewModel.sendMessage()
                }
                .disabled(viewModel.isProcessing)
            
            // Voice input button
            Button(action: toggleVoiceInput) {
                Image(systemName: appState.isVoiceInputActive ? "mic.fill" : "mic")
                    .font(.system(size: 14))
                    .foregroundColor(
                        appState.isVoiceInputActive
                            ? appState.currentTheme.accentColor
                            : appState.currentTheme.foregroundColor.opacity(0.6)
                    )
            }
            .buttonStyle(.plain)
            .disabled(viewModel.isProcessing)
            
            // Send button
            Button(action: viewModel.sendMessage) {
                Image(systemName: "paperplane.fill")
                    .font(.system(size: 14))
                    .foregroundColor(
                        viewModel.inputText.isEmpty
                            ? appState.currentTheme.foregroundColor.opacity(0.3)
                            : appState.currentTheme.accentColor
                    )
            }
            .buttonStyle(.plain)
            .disabled(viewModel.inputText.isEmpty || viewModel.isProcessing)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(appState.currentTheme.backgroundColor.opacity(0.5))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(
                    isFocused
                        ? appState.currentTheme.accentColor
                        : appState.currentTheme.borderColor.opacity(0.5),
                    lineWidth: 1
                )
        )
    }
    
    private func toggleVoiceInput() {
        appState.isVoiceInputActive.toggle()
        // TODO: Implement voice input
    }
}