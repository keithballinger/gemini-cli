import Foundation

struct Message: Identifiable, Codable {
    let id: String
    let role: Role
    let content: String
    let timestamp: Date
    var tools: [ToolCall]?
    
    enum Role: String, Codable {
        case user
        case assistant
        case system
    }
}

struct ToolCall: Codable {
    let name: String
    let parameters: [String: Any]
    let approved: Bool?
    
    enum CodingKeys: String, CodingKey {
        case name, parameters, approved
    }
    
    init(name: String, parameters: [String: Any], approved: Bool? = nil) {
        self.name = name
        self.parameters = parameters
        self.approved = approved
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        name = try container.decode(String.self, forKey: .name)
        approved = try container.decodeIfPresent(Bool.self, forKey: .approved)
        
        // Handle Any type for parameters
        if let params = try? container.decode([String: String].self, forKey: .parameters) {
            parameters = params
        } else {
            parameters = [:]
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(name, forKey: .name)
        try container.encodeIfPresent(approved, forKey: .approved)
        // Simplified encoding for now
        try container.encode([String: String](), forKey: .parameters)
    }
}