import Foundation
import Combine

class AppState: ObservableObject {
    @Published var isConnected = false
    @Published var currentConversation: Conversation?
    @Published var isVoiceInputActive = false
    @Published var currentTheme = Theme.cyberpunk
    @Published var transparency: Double = 0.8
    @Published var isClickThrough = false
    
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        loadSettings()
    }
    
    private func loadSettings() {
        // TODO: Load from UserDefaults
    }
    
    func saveSettings() {
        // TODO: Save to UserDefaults
    }
}