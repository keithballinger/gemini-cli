import Foundation

// Tool execution states and events
enum ToolExecutionState: String, Codable {
    case pending = "pending"
    case approved = "approved"
    case rejected = "rejected"
    case executing = "executing"
    case completed = "completed"
    case failed = "failed"
}

struct ToolExecution: Identifiable, Codable {
    let id: String
    let name: String
    let parameters: [String: Any]
    var state: ToolExecutionState
    var output: String?
    var error: String?
    let requestedAt: Date
    var executedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id, name, parameters, state, output, error, requestedAt, executedAt
    }
    
    init(id: String = UUID().uuidString, name: String, parameters: [String: Any], state: ToolExecutionState = .pending) {
        self.id = id
        self.name = name
        self.parameters = parameters
        self.state = state
        self.requestedAt = Date()
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        state = try container.decode(ToolExecutionState.self, forKey: .state)
        output = try container.decodeIfPresent(String.self, forKey: .output)
        error = try container.decodeIfPresent(String.self, forKey: .error)
        requestedAt = try container.decode(Date.self, forKey: .requestedAt)
        executedAt = try container.decodeIfPresent(Date.self, forKey: .executedAt)
        
        // Handle Any type for parameters
        if let params = try? container.decode([String: String].self, forKey: .parameters) {
            parameters = params
        } else {
            parameters = [:]
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(state, forKey: .state)
        try container.encodeIfPresent(output, forKey: .output)
        try container.encodeIfPresent(error, forKey: .error)
        try container.encode(requestedAt, forKey: .requestedAt)
        try container.encodeIfPresent(executedAt, forKey: .executedAt)
        // Simplified encoding for now
        try container.encode([String: String](), forKey: .parameters)
    }
}

// Approval mode for tools
enum ToolApprovalMode: String, CaseIterable {
    case yolo = "yolo"
    case ask = "ask"
    
    var displayName: String {
        switch self {
        case .yolo:
            return "Auto-approve"
        case .ask:
            return "Ask permission"
        }
    }
    
    var icon: String {
        switch self {
        case .yolo:
            return "bolt.circle"
        case .ask:
            return "shield.lefthalf.filled"
        }
    }
}