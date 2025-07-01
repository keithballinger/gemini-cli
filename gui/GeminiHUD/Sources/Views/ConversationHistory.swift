import SwiftUI

struct ConversationHistory: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var historyManager = ConversationHistoryManager()
    @State private var selectedConversation: SavedConversation?
    @State private var searchText = ""
    
    var body: some View {
        HSplitView {
            // Sidebar with conversation list
            VStack(alignment: .leading, spacing: 0) {
                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.5))
                    
                    TextField("Search conversations...", text: $searchText)
                        .textFieldStyle(.plain)
                        .foregroundColor(appState.currentTheme.foregroundColor)
                }
                .padding(12)
                .background(appState.currentTheme.backgroundColor.opacity(0.3))
                
                Divider()
                    .foregroundColor(appState.currentTheme.borderColor)
                
                // Conversation list
                ScrollView {
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(filteredConversations) { conversation in
                            ConversationRow(
                                conversation: conversation,
                                isSelected: selectedConversation?.id == conversation.id
                            )
                            .onTapGesture {
                                selectedConversation = conversation
                            }
                        }
                    }
                    .padding(8)
                }
            }
            .frame(width: 250)
            .background(appState.currentTheme.backgroundColor.opacity(0.5))
            
            // Main content area
            if let conversation = selectedConversation {
                ConversationDetail(conversation: conversation)
            } else {
                EmptyConversationView()
            }
        }
        .frame(width: 800, height: 600)
        .background(VisualEffectView())
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(appState.currentTheme.borderColor, lineWidth: 1)
        )
        .onAppear {
            loadConversations()
        }
    }
    
    private var filteredConversations: [SavedConversation] {
        if searchText.isEmpty {
            return historyManager.conversations
        }
        return historyManager.conversations.filter { conversation in
            conversation.title.localizedCaseInsensitiveContains(searchText) ||
            conversation.preview.localizedCaseInsensitiveContains(searchText)
        }
    }
    
    private func loadConversations() {
        historyManager.loadConversations()
        if let first = historyManager.conversations.first {
            selectedConversation = first
        }
    }
}

struct ConversationRow: View {
    let conversation: SavedConversation
    let isSelected: Bool
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(conversation.title)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(appState.currentTheme.foregroundColor)
                    .lineLimit(1)
                
                Spacer()
                
                if conversation.hasCheckpoint {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 10))
                        .foregroundColor(.green)
                }
            }
            
            Text(conversation.preview)
                .font(.system(size: 11))
                .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.7))
                .lineLimit(2)
            
            Text(conversation.date, style: .relative)
                .font(.system(size: 10))
                .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.5))
        }
        .padding(8)
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(isSelected ? appState.currentTheme.accentColor.opacity(0.2) : Color.clear)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(isSelected ? appState.currentTheme.accentColor : Color.clear, lineWidth: 1)
        )
    }
}

struct ConversationDetail: View {
    let conversation: SavedConversation
    @EnvironmentObject var appState: AppState
    @State private var showingBranches = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(conversation.title)
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundColor(appState.currentTheme.foregroundColor)
                    
                    Text("\(conversation.messageCount) messages • \(conversation.date, style: .date)")
                        .font(.caption)
                        .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.7))
                }
                
                Spacer()
                
                // Action buttons
                HStack(spacing: 12) {
                    Button(action: { showingBranches.toggle() }) {
                        Label("Branches", systemImage: "arrow.triangle.branch")
                            .font(.system(size: 12))
                    }
                    .buttonStyle(.plain)
                    .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.8))
                    
                    Button(action: resumeConversation) {
                        Label("Resume", systemImage: "play.fill")
                            .font(.system(size: 12))
                    }
                    .buttonStyle(.plain)
                    .foregroundColor(appState.currentTheme.accentColor)
                }
            }
            .padding()
            
            Divider()
                .foregroundColor(appState.currentTheme.borderColor)
            
            // Messages
            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(conversation.messages) { message in
                        MessageBubble(message: message)
                    }
                }
                .padding()
            }
            
            // Timeline scrubber
            if conversation.hasCheckpoint {
                TimelineScrubber(checkpoints: conversation.checkpoints)
                    .frame(height: 60)
                    .padding(.horizontal)
                    .background(appState.currentTheme.backgroundColor.opacity(0.3))
            }
        }
    }
    
    private func resumeConversation() {
        // Load conversation into main HUD
        HUDViewModel.shared.messages = conversation.messages
        // Close history window
        NotificationCenter.default.post(name: .closeConversationHistory, object: nil)
    }
}

struct EmptyConversationView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 48))
                .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.3))
            
            Text("Select a conversation")
                .font(.title3)
                .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.5))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct TimelineScrubber: View {
    let checkpoints: [ConversationCheckpoint]
    @State private var selectedCheckpoint: ConversationCheckpoint?
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // Timeline track
                RoundedRectangle(cornerRadius: 2)
                    .fill(appState.currentTheme.borderColor.opacity(0.3))
                    .frame(height: 4)
                    .frame(maxWidth: .infinity)
                    .position(x: geometry.size.width / 2, y: geometry.size.height / 2)
                
                // Checkpoints
                HStack(spacing: 0) {
                    ForEach(checkpoints) { checkpoint in
                        CheckpointMarker(
                            checkpoint: checkpoint,
                            isSelected: selectedCheckpoint?.id == checkpoint.id
                        )
                        .onTapGesture {
                            selectedCheckpoint = checkpoint
                        }
                        
                        if checkpoint.id != checkpoints.last?.id {
                            Spacer()
                        }
                    }
                }
                .padding(.horizontal, 20)
            }
        }
    }
}

struct CheckpointMarker: View {
    let checkpoint: ConversationCheckpoint
    let isSelected: Bool
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        VStack(spacing: 4) {
            Circle()
                .fill(isSelected ? appState.currentTheme.accentColor : appState.currentTheme.foregroundColor)
                .frame(width: 12, height: 12)
                .overlay(
                    Circle()
                        .stroke(appState.currentTheme.backgroundColor, lineWidth: 2)
                )
            
            if isSelected {
                Text(checkpoint.name)
                    .font(.system(size: 10))
                    .foregroundColor(appState.currentTheme.foregroundColor)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(
                        Capsule()
                            .fill(appState.currentTheme.backgroundColor.opacity(0.8))
                    )
            }
        }
    }
}

// Models
struct SavedConversation: Identifiable {
    let id: String
    let title: String
    let preview: String
    let date: Date
    let messages: [Message]
    let messageCount: Int
    let hasCheckpoint: Bool
    let checkpoints: [ConversationCheckpoint]
}

struct ConversationCheckpoint: Identifiable {
    let id: String
    let name: String
    let messageIndex: Int
    let timestamp: Date
}

class ConversationHistoryManager: ObservableObject {
    @Published var conversations: [SavedConversation] = []
    
    func loadConversations() {
        // Generate mock data for now
        conversations = [
            SavedConversation(
                id: "1",
                title: "Implementing Authentication System",
                preview: "Added JWT tokens and user management...",
                date: Date().addingTimeInterval(-3600),
                messages: generateMockMessages(count: 10),
                messageCount: 10,
                hasCheckpoint: true,
                checkpoints: [
                    ConversationCheckpoint(id: "cp1", name: "Initial setup", messageIndex: 0, timestamp: Date().addingTimeInterval(-3600)),
                    ConversationCheckpoint(id: "cp2", name: "JWT implementation", messageIndex: 5, timestamp: Date().addingTimeInterval(-2400)),
                    ConversationCheckpoint(id: "cp3", name: "Testing complete", messageIndex: 9, timestamp: Date().addingTimeInterval(-1200))
                ]
            ),
            SavedConversation(
                id: "2",
                title: "Debugging Performance Issues",
                preview: "Optimized database queries and caching...",
                date: Date().addingTimeInterval(-7200),
                messages: generateMockMessages(count: 8),
                messageCount: 8,
                hasCheckpoint: false,
                checkpoints: []
            ),
            SavedConversation(
                id: "3",
                title: "Creating REST API",
                preview: "Built endpoints for user and product resources...",
                date: Date().addingTimeInterval(-86400),
                messages: generateMockMessages(count: 15),
                messageCount: 15,
                hasCheckpoint: true,
                checkpoints: [
                    ConversationCheckpoint(id: "cp4", name: "API design", messageIndex: 0, timestamp: Date().addingTimeInterval(-86400)),
                    ConversationCheckpoint(id: "cp5", name: "User endpoints", messageIndex: 7, timestamp: Date().addingTimeInterval(-82800))
                ]
            )
        ]
    }
    
    private func generateMockMessages(count: Int) -> [Message] {
        (0..<count).map { index in
            Message(
                id: UUID().uuidString,
                role: index % 2 == 0 ? .user : .assistant,
                content: "This is message \(index + 1) in the conversation.",
                timestamp: Date().addingTimeInterval(Double(-count + index) * 300)
            )
        }
    }
}

extension Notification.Name {
    static let closeConversationHistory = Notification.Name("closeConversationHistory")
}