import Foundation

struct Conversation: Identifiable, Codable {
    let id: String
    var messages: [Message]
    let createdAt: Date
    var updatedAt: Date
    var title: String?
    
    init(id: String = UUID().uuidString) {
        self.id = id
        self.messages = []
        self.createdAt = Date()
        self.updatedAt = Date()
    }
    
    mutating func addMessage(_ message: Message) {
        messages.append(message)
        updatedAt = Date()
    }
}