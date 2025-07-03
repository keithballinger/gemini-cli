import Foundation

// MARK: - IPC Protocol Definition

enum IPCMethod: String, Codable {
    case sendMessage = "chat.send"
    case executeTool = "tool.execute"
    case getStatus = "status.get"
    case getHistory = "history.get"
    case clearConversation = "conversation.clear"
    case setApprovalMode = "config.setApprovalMode"
    case changeWorkingDirectory = "config.changeWorkingDirectory"
}

// MARK: - Request/Response Models

struct IPCRequest {
    let id: String
    let method: IPCMethod
    let params: IPCParams
    
    func toJSON() throws -> Data {
        var dict: [String: Any] = [
            "id": id,
            "method": method.rawValue
        ]
        
        // Convert params to simple format expected by CLI
        switch params {
        case .sendMessage(let p):
            var paramsDict: [String: Any] = ["message": p.message]
            if let context = p.context {
                var contextDict: [String: Any] = [:]
                if let files = context.files {
                    contextDict["files"] = files
                }
                if let workingDir = context.workingDirectory {
                    contextDict["workingDirectory"] = workingDir
                }
                paramsDict["context"] = contextDict
            } else {
                paramsDict["context"] = NSNull()
            }
            dict["params"] = paramsDict
        case .executeTool(let p):
            dict["params"] = [
                "toolName": p.toolName,
                "parameters": p.parameters,
                "approved": p.approved
            ]
        case .getStatus:
            dict["params"] = [String: Any]()
        case .getHistory(let p):
            dict["params"] = ["limit": p.limit, "offset": p.offset]
        case .clearConversation:
            dict["params"] = [String: Any]()
        case .setApprovalMode(let p):
            dict["params"] = ["mode": p.mode]
        case .changeWorkingDirectory(let p):
            dict["params"] = ["path": p.path]
        }
        
        return try JSONSerialization.data(withJSONObject: dict, options: [])
    }
}

enum IPCParams: Codable {
    case sendMessage(SendMessageParams)
    case executeTool(ExecuteToolParams)
    case getStatus
    case getHistory(GetHistoryParams)
    case clearConversation
    case setApprovalMode(SetApprovalModeParams)
    case changeWorkingDirectory(ChangeWorkingDirectoryParams)
    
    enum CodingKeys: String, CodingKey {
        case type, data
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)
        
        switch type {
        case "sendMessage":
            let params = try container.decode(SendMessageParams.self, forKey: .data)
            self = .sendMessage(params)
        case "executeTool":
            let params = try container.decode(ExecuteToolParams.self, forKey: .data)
            self = .executeTool(params)
        case "getStatus":
            self = .getStatus
        case "getHistory":
            let params = try container.decode(GetHistoryParams.self, forKey: .data)
            self = .getHistory(params)
        case "clearConversation":
            self = .clearConversation
        case "setApprovalMode":
            let params = try container.decode(SetApprovalModeParams.self, forKey: .data)
            self = .setApprovalMode(params)
        case "changeWorkingDirectory":
            let params = try container.decode(ChangeWorkingDirectoryParams.self, forKey: .data)
            self = .changeWorkingDirectory(params)
        default:
            throw DecodingError.dataCorruptedError(forKey: .type, in: container, debugDescription: "Unknown type: \(type)")
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        
        switch self {
        case .sendMessage(let params):
            try container.encode("sendMessage", forKey: .type)
            try container.encode(params, forKey: .data)
        case .executeTool(let params):
            try container.encode("executeTool", forKey: .type)
            try container.encode(params, forKey: .data)
        case .getStatus:
            try container.encode("getStatus", forKey: .type)
        case .getHistory(let params):
            try container.encode("getHistory", forKey: .type)
            try container.encode(params, forKey: .data)
        case .clearConversation:
            try container.encode("clearConversation", forKey: .type)
        case .setApprovalMode(let params):
            try container.encode("setApprovalMode", forKey: .type)
            try container.encode(params, forKey: .data)
        case .changeWorkingDirectory(let params):
            try container.encode("changeWorkingDirectory", forKey: .type)
            try container.encode(params, forKey: .data)
        }
    }
}

struct SendMessageParams: Codable {
    let message: String
    let context: MessageContext?
}

struct MessageContext: Codable {
    let files: [String]?
    let workingDirectory: String?
}

struct ExecuteToolParams: Codable {
    let toolName: String
    let parameters: [String: String]
    let approved: Bool
}

struct GetHistoryParams: Codable {
    let limit: Int?
    let offset: Int?
}

struct SetApprovalModeParams: Codable {
    let mode: String // "auto", "manual", "never"
}

struct ChangeWorkingDirectoryParams: Codable {
    let path: String
}

// MARK: - Response Models

struct IPCResponse: Codable {
    let id: String
    let result: IPCResult?
    let error: IPCError?
}

struct IPCError: Codable {
    let code: Int
    let message: String
}

enum IPCResult: Codable {
    case message(MessageResult)
    case tool(ToolResult)
    case status(StatusResult)
    case history(HistoryResult)
    case success
    
    enum CodingKeys: String, CodingKey {
        case type, data
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)
        
        switch type {
        case "message":
            let result = try container.decode(MessageResult.self, forKey: .data)
            self = .message(result)
        case "tool":
            let result = try container.decode(ToolResult.self, forKey: .data)
            self = .tool(result)
        case "status":
            let result = try container.decode(StatusResult.self, forKey: .data)
            self = .status(result)
        case "history":
            let result = try container.decode(HistoryResult.self, forKey: .data)
            self = .history(result)
        case "success":
            self = .success
        default:
            throw DecodingError.dataCorruptedError(forKey: .type, in: container, debugDescription: "Unknown type: \(type)")
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        
        switch self {
        case .message(let result):
            try container.encode("message", forKey: .type)
            try container.encode(result, forKey: .data)
        case .tool(let result):
            try container.encode("tool", forKey: .type)
            try container.encode(result, forKey: .data)
        case .status(let result):
            try container.encode("status", forKey: .type)
            try container.encode(result, forKey: .data)
        case .history(let result):
            try container.encode("history", forKey: .type)
            try container.encode(result, forKey: .data)
        case .success:
            try container.encode("success", forKey: .type)
        }
    }
}

struct MessageResult: Codable {
    let response: String
    let tools: [ToolCall]?
    let tokenUsage: TokenUsage?
}

struct ToolResult: Codable {
    let output: String
    let success: Bool
}

struct StatusResult: Codable {
    let connected: Bool
    let model: String
    let workingDirectory: String
}

struct HistoryResult: Codable {
    let messages: [Message]
    let hasMore: Bool
}

struct TokenUsage: Codable {
    let prompt: Int
    let completion: Int
    let total: Int
}

struct ToolApprovalRequest: Codable {
    let id: String
    let name: String
    let parameters: [String: String]
    let description: String?
}

struct ToolExecutionInfo: Codable {
    let id: String
    let name: String
    let status: String
}

// MARK: - Stream Events

struct IPCStreamEvent: Codable {
    let type: StreamEventType
    let data: StreamEventData
}

enum StreamEventType: String, Codable {
    case messageChunk = "message.chunk"
    case toolApprovalRequest = "tool.approval"
    case toolExecutionStart = "tool.start"
    case toolExecutionEnd = "tool.end"
    case error = "error"
}

enum StreamEventData: Codable {
    case messageChunk(String)
    case toolApproval(ToolApprovalRequest)
    case toolStart(ToolExecutionInfo)
    case toolEnd(ToolExecutionInfo)
    case error(String)
}