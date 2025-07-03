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
    @Published var toolApprovalMode: ToolApprovalMode = .yolo
    @Published var pendingToolApprovals: [ToolExecution] = []
    
    private var cancellables = Set<AnyCancellable>()
    private let cliService = SimpleCLIService() // Create a single, persistent instance
    private var currentStreamMessage: Message?
    private var activeToolExecutions: [String: ToolExecution] = [:] // Track tools by name during execution
    
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
        
        cliService.toolEventStream
            .receive(on: DispatchQueue.main)
            .sink { [weak self] (type, data) in
                self?.handleToolEvent(type: type, data: data)
            }
            .store(in: &cancellables)
        
        cliService.$isRunning
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isRunning in
                if !isRunning {
                    self?.isProcessing = false
                    self?.currentStreamMessage = nil
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
        // This method should be called by SimpleCLIService with parsed events
        // For now, we'll just handle message chunks
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
    
    func setToolApprovalMode(_ mode: ToolApprovalMode) {
        toolApprovalMode = mode
        
        // Send mode update to CLI
        cliService.setApprovalMode(mode.rawValue)
    }
    
    func approveTool(_ toolExecution: ToolExecution) {
        // Remove from pending approvals
        pendingToolApprovals.removeAll { $0.id == toolExecution.id }
        
        // Update tool state to approved in all messages
        for (messageIndex, message) in messages.enumerated() {
            if var toolExecutions = message.toolExecutions,
               let toolIndex = toolExecutions.firstIndex(where: { $0.id == toolExecution.id }) {
                toolExecutions[toolIndex].state = .approved
                messages[messageIndex].toolExecutions = toolExecutions
            }
        }
        
        // Send approval to CLI
        cliService.approveTool(toolExecution.id, approved: true)
    }
    
    func rejectTool(_ toolExecution: ToolExecution) {
        // Remove from pending approvals
        pendingToolApprovals.removeAll { $0.id == toolExecution.id }
        
        // Update tool state to rejected in all messages
        for (messageIndex, message) in messages.enumerated() {
            if var toolExecutions = message.toolExecutions,
               let toolIndex = toolExecutions.firstIndex(where: { $0.id == toolExecution.id }) {
                toolExecutions[toolIndex].state = .rejected
                messages[messageIndex].toolExecutions = toolExecutions
            }
        }
        
        // Send rejection to CLI
        cliService.approveTool(toolExecution.id, approved: false)
    }
    
    private func handleToolEvent(type: String, data: [String: Any]) {
        switch type {
        case "tool.approval":
            // Tool needs approval - only happens in ask mode
            guard let name = data["name"] as? String,
                  let params = data["parameters"] as? [String: Any] else { return }
            
            let toolExecution = ToolExecution(
                id: data["id"] as? String ?? UUID().uuidString,
                name: name,
                parameters: params,
                state: .pending
            )
            
            // Add to pending approvals
            pendingToolApprovals.append(toolExecution)
            
            // Create a message for the tool approval if there isn't one
            if currentStreamMessage == nil {
                let toolMessage = Message(
                    id: UUID().uuidString,
                    role: .assistant,
                    content: "",
                    timestamp: Date(),
                    tools: nil,
                    toolExecutions: [toolExecution]
                )
                messages.append(toolMessage)
                currentStreamMessage = toolMessage
            } else if let currentMessage = currentStreamMessage,
                      let index = messages.firstIndex(where: { $0.id == currentMessage.id }) {
                var toolExecutions = messages[index].toolExecutions ?? []
                toolExecutions.append(toolExecution)
                messages[index].toolExecutions = toolExecutions
            }
            
        case "tool.start":
            // Tool execution started
            guard let name = data["name"] as? String else { return }
            
            // Find the existing pending tool execution and update it to executing
            for (messageIndex, message) in messages.enumerated() {
                if var toolExecutions = message.toolExecutions {
                    for (toolIndex, tool) in toolExecutions.enumerated() {
                        if tool.name == name && (tool.state == .pending || tool.state == .approved) {
                            toolExecutions[toolIndex].state = .executing
                            messages[messageIndex].toolExecutions = toolExecutions
                            activeToolExecutions[name] = toolExecutions[toolIndex]
                            return
                        }
                    }
                }
            }
            
            // If no existing tool found, create a new one
            let toolExecution = ToolExecution(
                name: name,
                parameters: data["parameters"] as? [String: Any] ?? [:],
                state: .executing
            )
            
            // Store in active executions
            activeToolExecutions[name] = toolExecution
            
            // Add to current message
            if let currentMessage = currentStreamMessage,
               let index = messages.firstIndex(where: { $0.id == currentMessage.id }) {
                var toolExecutions = messages[index].toolExecutions ?? []
                toolExecutions.append(toolExecution)
                messages[index].toolExecutions = toolExecutions
            }
            
        case "tool.end":
            // Tool execution completed
            guard let name = data["name"] as? String else { return }
            
            let success = data["success"] as? Bool == true
            let output = data["output"] as? String
            
            // Find and update the existing tool execution
            for (messageIndex, message) in messages.enumerated() {
                if var toolExecutions = message.toolExecutions {
                    for (toolIndex, tool) in toolExecutions.enumerated() {
                        if tool.name == name && (tool.state == .executing || tool.state == .approved) {
                            toolExecutions[toolIndex].state = success ? .completed : .failed
                            toolExecutions[toolIndex].output = output
                            toolExecutions[toolIndex].executedAt = Date()
                            messages[messageIndex].toolExecutions = toolExecutions
                            break
                        }
                    }
                }
            }
            
            // Remove from active executions
            activeToolExecutions.removeValue(forKey: name)
            
            // Don't clear currentStreamMessage - let it continue for post-tool content
            
        default:
            break
        }
    }
}