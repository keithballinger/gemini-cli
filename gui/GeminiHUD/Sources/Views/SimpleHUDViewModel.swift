import Foundation
import Combine
import SwiftUI

class SimpleHUDViewModel: ObservableObject {
    static let shared = SimpleHUDViewModel()
    
    @Published var messages: [Message] = []
    @Published var inputText = ""
    @Published var isProcessing = false
    
    private let cliService = SimpleCLIService()
    private var cancellables = Set<AnyCancellable>()
    private var currentResponseId: String?
    
    private init() {
        setupBindings()
    }
    
    private func setupBindings() {
        // Listen to CLI output
        cliService.outputStream
            .receive(on: DispatchQueue.main)
            .sink { [weak self] output in
                self?.handleCLIOutput(output)
            }
            .store(in: &cancellables)
        
        // Monitor running state
        cliService.$isRunning
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isRunning in
                if !isRunning {
                    self?.isProcessing = false
                }
            }
            .store(in: &cancellables)
    }
    
    private func handleCLIOutput(_ output: String) {
        // If we don't have a current response, create one
        if currentResponseId == nil {
            let newMessage = Message(
                id: UUID().uuidString,
                role: .assistant,
                content: "",
                timestamp: Date()
            )
            currentResponseId = newMessage.id
            messages.append(newMessage)
        }
        
        // Append output to current message
        if let id = currentResponseId,
           let index = messages.firstIndex(where: { $0.id == id }) {
            messages[index].content += output
        }
    }
    
    func sendMessage() {
        guard !inputText.isEmpty else { return }
        
        // Add user message
        let userMessage = Message(
            id: UUID().uuidString,
            role: .user,
            content: inputText,
            timestamp: Date()
        )
        messages.append(userMessage)
        
        // Clear current response ID for new response
        currentResponseId = nil
        
        // Send to CLI
        let query = inputText
        inputText = ""
        isProcessing = true
        
        cliService.sendMessage(query)
    }
}