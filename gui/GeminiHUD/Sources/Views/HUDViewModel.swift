import Foundation
import Combine
import SwiftUI

class HUDViewModel: ObservableObject {
    static let shared = HUDViewModel()
    
    @Published var isToolPaletteVisible = false
    @Published var messages: [Message] = []
    @Published var inputText = ""
    @Published var isProcessing = false
    @Published var isConnected = false
    @Published var connectionError: String?
    
    private var cancellables = Set<AnyCancellable>()
    private let cliService = SimpleCLIService() // Create a single, persistent instance
    private var currentStreamMessage: Message?
    
    private init() {
        setupBindings()
    }
    
    private func setupBindings() {
        // Set up bindings to the single cliService instance
        cliService.outputStream
            .receive(on: DispatchQueue.main)
            .sink { [weak self] output in
                self?.handleCLIOutput(output)
            }
            .store(in: &cancellables)
        
        cliService.$isRunning
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isRunning in
                if !isRunning {
                    self?.isProcessing = false
                }
            }
            .store(in: &cancellables)
        
        cliService.$lastError
            .receive(on: DispatchQueue.main)
            .sink { [weak self] error in
                self?.connectionError = error?.localizedDescription
                if error != nil {
                    self?.isConnected = false
                } else {
                    self?.isConnected = true
                }
            }
            .store(in: &cancellables)
    }
    
    private func handleCLIOutput(_ output: String) {
        print("HUDViewModel: handleCLIOutput called with: \(output)")
        
        // Create new message if needed
        if currentStreamMessage == nil {
            let newMessage = Message(
                id: UUID().uuidString,
                role: .assistant,
                content: "",
                timestamp: Date()
            )
            currentStreamMessage = newMessage
            messages.append(newMessage)
            print("HUDViewModel: Created new assistant message")
        }
        
        // Append output to current message
        if let currentMessage = currentStreamMessage,
           let index = messages.firstIndex(where: { $0.id == currentMessage.id }) {
            messages[index].content += output
            print("HUDViewModel: Updated message content, total length: \(messages[index].content.count)")
        }
    }
    
    
    func sendMessage() {
        guard !inputText.isEmpty else { return }
        
        print("HUDViewModel: Sending message: \(inputText)")
        
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
        currentStreamMessage = nil
        
        // Use CLI service
        print("HUDViewModel: Sending message via CLI: \(query)")
        cliService.sendMessage(query)
    }
    
    private func sendMockResponse(for query: String) {
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
    
    func connectToIPC() {
        // This function now simply ensures the service is started.
        // The actual service is already created and bound.
        cliService.start()
        isConnected = true
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