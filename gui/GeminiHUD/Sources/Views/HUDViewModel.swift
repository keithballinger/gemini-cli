import Foundation
import Combine
import SwiftUI

class HUDViewModel: ObservableObject {
    static let shared = HUDViewModel()
    
    @Published var isToolPaletteVisible = false
    @Published var messages: [Message] = []
    @Published var inputText = ""
    @Published var isProcessing = false
    
    private var cancellables = Set<AnyCancellable>()
    private let ipcService = IPCService()
    
    private init() {
        setupBindings()
    }
    
    private func setupBindings() {
        // TODO: Bind to IPC service
    }
    
    func sendMessage() {
        guard !inputText.isEmpty else { return }
        
        let userMessage = Message(
            id: UUID().uuidString,
            role: .user,
            content: inputText,
            timestamp: Date()
        )
        
        messages.append(userMessage)
        let query = inputText
        inputText = ""
        isProcessing = true
        
        // Mock response for now
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            guard let self = self else { return }
            
            let mockResponse = self.generateMockResponse(for: query)
            let assistantMessage = Message(
                id: UUID().uuidString,
                role: .assistant,
                content: mockResponse,
                timestamp: Date()
            )
            
            self.messages.append(assistantMessage)
            self.isProcessing = false
        }
    }
    
    private func generateMockResponse(for query: String) -> String {
        let lowercased = query.lowercased()
        
        if lowercased.contains("hello") || lowercased.contains("hi") {
            return "Hello! I'm Gemini HUD, your AI coding assistant. How can I help you today?"
        } else if lowercased.contains("help") {
            return "I can help you with:\n• Writing code\n• Debugging issues\n• Answering questions\n• Running commands\n\nJust type your request and I'll assist you!"
        } else if lowercased.contains("test") {
            return "This is a test response. The IPC connection to the CLI is not yet active, but the UI is working correctly!"
        } else {
            return "I received your message: \"\(query)\"\n\nThe IPC connection is not yet active, so I can't process real requests yet. This is a mock response for testing the UI."
        }
    }
    
    func toggleToolPalette() {
        withAnimation(.spring()) {
            isToolPaletteVisible.toggle()
        }
    }
}