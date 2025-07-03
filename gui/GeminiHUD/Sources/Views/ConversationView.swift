import SwiftUI

struct ConversationView: View {
    @EnvironmentObject var appState: AppState
    @ObservedObject var viewModel = HUDViewModel.shared
    
    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    if viewModel.messages.isEmpty {
                        Text("Start a conversation...")
                            .font(.system(size: 16))
                            .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.5))
                            .frame(maxWidth: .infinity)
                            .padding(.top, 20)
                    } else {
                        ForEach(viewModel.messages) { message in
                            MessageBubble(message: message)
                                .id(message.id)
                        }
                    }
                    
                    if viewModel.isProcessing {
                        ProcessingIndicator()
                    }
                }
                .padding(.vertical, 8)
            }
            .onChange(of: viewModel.messages.count) { _ in
                if let lastMessage = viewModel.messages.last {
                    withAnimation {
                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                    }
                }
            }
        }
    }
}

struct MessageBubble: View {
    let message: Message
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            // Role indicator
            Image(systemName: message.role == .user ? "person.circle.fill" : "sparkle.circle.fill")
                .font(.system(size: 20))
                .foregroundColor(
                    message.role == .user
                        ? appState.currentTheme.foregroundColor
                        : appState.currentTheme.accentColor
                )
            
            VStack(alignment: .leading, spacing: 4) {
                // Message content
                Text(message.content)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(appState.currentTheme.foregroundColor)
                    .textSelection(.enabled)
                    .lineSpacing(4)
                
                // Tool calls if any
                if let tools = message.tools, !tools.isEmpty {
                    ForEach(tools, id: \.name) { tool in
                        ToolCallView(tool: tool)
                    }
                }
                
                // Timestamp
                Text(message.timestamp, style: .time)
                    .font(.system(size: 10))
                    .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.5))
            }
            
            Spacer()
        }
        .padding(.horizontal, 8)
    }
}

struct ProcessingIndicator: View {
    @State private var dots = 0
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "sparkle.circle")
                .font(.system(size: 16))
                .foregroundColor(appState.currentTheme.accentColor)
            
            HStack(spacing: 2) {
                ForEach(0..<3) { index in
                    Circle()
                        .fill(appState.currentTheme.accentColor)
                        .frame(width: 4, height: 4)
                        .opacity(index <= dots ? 1.0 : 0.3)
                }
            }
        }
        .padding(.horizontal, 8)
        .onAppear {
            animateDots()
        }
    }
    
    private func animateDots() {
        withAnimation(.easeInOut(duration: 0.5).repeatForever()) {
            dots = (dots + 1) % 3
        }
    }
}

struct ToolCallView: View {
    let tool: ToolCall
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        HStack {
            Image(systemName: "wrench.and.screwdriver")
                .font(.system(size: 11))
            
            Text(tool.name)
                .font(.system(size: 11, weight: .medium))
            
            if let approved = tool.approved {
                Image(systemName: approved ? "checkmark.circle" : "xmark.circle")
                    .font(.system(size: 11))
                    .foregroundColor(approved ? .green : .red)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(appState.currentTheme.backgroundColor.opacity(0.5))
        .cornerRadius(4)
        .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.8))
    }
}