import XCTest

final class HUDViewTests: XCTestCase {
    var app: XCUIApplication!
    
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }
    
    override func tearDownWithError() throws {
        app = nil
    }
    
    func testHUDWindowAppears() throws {
        // Verify the HUD window appears
        let hudWindow = app.windows["GeminiHUD"]
        XCTAssertTrue(hudWindow.waitForExistence(timeout: 5))
    }
    
    func testInputFieldExists() throws {
        let inputField = app.textFields["Type or speak your command..."]
        XCTAssertTrue(inputField.exists)
    }
    
    func testSendButtonDisabledWhenEmpty() throws {
        let sendButton = app.buttons["paperplane.fill"]
        XCTAssertFalse(sendButton.isEnabled)
    }
}