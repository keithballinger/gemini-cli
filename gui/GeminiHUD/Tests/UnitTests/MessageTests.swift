import XCTest
@testable import GeminiHUD

final class MessageTests: XCTestCase {
    func testMessageCreation() {
        let message = Message(
            id: "test-id",
            role: .user,
            content: "Hello, world!",
            timestamp: Date()
        )
        
        XCTAssertEqual(message.id, "test-id")
        XCTAssertEqual(message.role, .user)
        XCTAssertEqual(message.content, "Hello, world!")
        XCTAssertNil(message.tools)
    }
    
    func testMessageWithTools() {
        let tool = ToolCall(
            name: "test-tool",
            parameters: ["key": "value"],
            approved: true
        )
        
        let message = Message(
            id: "test-id",
            role: .assistant,
            content: "Using tool",
            timestamp: Date(),
            tools: [tool]
        )
        
        XCTAssertEqual(message.tools?.count, 1)
        XCTAssertEqual(message.tools?.first?.name, "test-tool")
        XCTAssertEqual(message.tools?.first?.approved, true)
    }
    
    func testMessageCodable() throws {
        let message = Message(
            id: "test-id",
            role: .assistant,
            content: "Test content",
            timestamp: Date()
        )
        
        let encoded = try JSONEncoder().encode(message)
        let decoded = try JSONDecoder().decode(Message.self, from: encoded)
        
        XCTAssertEqual(decoded.id, message.id)
        XCTAssertEqual(decoded.role, message.role)
        XCTAssertEqual(decoded.content, message.content)
    }
}