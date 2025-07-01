import Foundation
import Combine
import SwiftUI

class HUDViewModel: ObservableObject {
    @Published var isToolPaletteVisible = false
    @Published var messages: [Message] = []
    @Published var inputText = ""
    @Published var isProcessing = false
    
    private var cancellables = Set<AnyCancellable>()
    private let ipcService = IPCService()
    
    init() {
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
        inputText = ""
        isProcessing = true
        
        // TODO: Send to IPC service
    }
    
    func toggleToolPalette() {
        withAnimation(.spring()) {
            isToolPaletteVisible.toggle()
        }
    }
}