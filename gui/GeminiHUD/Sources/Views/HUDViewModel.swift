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
    private let ipcService = IPCService()
    private var currentStreamMessage: Message?
    
    private init() {
        setupBindings()
    }
    
    private func setupBindings() {
        // Monitor connection status
        ipcService.$isConnected
            .receive(on: DispatchQueue.main)
            .assign(to: &$isConnected)
        
        // Monitor errors
        ipcService.$lastError
            .receive(on: DispatchQueue.main)
            .sink { [weak self] error in
                self?.connectionError = error?.localizedDescription
            }
            .store(in: &cancellables)
        
        // Handle stream events
        ipcService.streamEvents
            .receive(on: DispatchQueue.main)
            .sink { [weak self] event in
                self?.handleStreamEvent(event)
            }
            .store(in: &cancellables)
    }
    
    private func handleStreamEvent(_ event: IPCStreamEvent) {
        switch event.type {
        case .messageChunk:
            if case .messageChunk(let chunk) = event.data {
                handleMessageChunk(chunk)
            }
        case .toolApprovalRequest:
            if case .toolApproval(let request) = event.data {
                handleToolApprovalRequest(request)
            }
        case .toolExecutionStart:
            if case .toolStart(let info) = event.data {
                handleToolExecutionStart(info)
            }
        case .toolExecutionEnd:
            if case .toolEnd(let info) = event.data {
                handleToolExecutionEnd(info)
            }
        case .error:
            if case .error(let message) = event.data {
                handleStreamError(message)
            }
        }
    }
    
    private func handleMessageChunk(_ chunk: String) {
        if currentStreamMessage == nil {
            currentStreamMessage = Message(
                id: UUID().uuidString,
                role: .assistant,
                content: "",
                timestamp: Date()
            )
            messages.append(currentStreamMessage!)
        }
        
        if let index = messages.firstIndex(where: { $0.id == currentStreamMessage?.id }) {
            messages[index].content += chunk
        }
    }
    
    private func handleToolApprovalRequest(_ request: ToolApprovalRequest) {
        // TODO: Show tool approval UI
        print("Tool approval requested: \(request)")
    }
    
    private func handleToolExecutionStart(_ info: ToolExecutionInfo) {
        // TODO: Show tool execution indicator
        print("Tool execution started: \(info)")
    }
    
    private func handleToolExecutionEnd(_ info: ToolExecutionInfo) {
        // TODO: Update tool execution status
        print("Tool execution ended: \(info)")
    }
    
    private func handleStreamError(_ message: String) {
        connectionError = message
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
        currentStreamMessage = nil
        
        if isConnected {
            // Use real IPC service
            Task { @MainActor in
                do {
                    let result = try await ipcService.sendMessage(query)
                    
                    // If not streaming, add the complete message
                    if currentStreamMessage == nil {
                        let assistantMessage = Message(
                            id: UUID().uuidString,
                            role: .assistant,
                            content: result.response,
                            timestamp: Date(),
                            tools: result.tools?.map { toolCall in
                                ToolCall(
                                    name: toolCall.name,
                                    parameters: toolCall.parameters,
                                    approved: toolCall.approved
                                )
                            }
                        )
                        messages.append(assistantMessage)
                    }
                    
                    isProcessing = false
                } catch {
                    connectionError = error.localizedDescription
                    isProcessing = false
                    
                    // Fall back to mock response
                    sendMockResponse(for: query)
                }
            }
        } else {
            // Use mock response
            sendMockResponse(for: query)
        }
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
        ipcService.start()
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