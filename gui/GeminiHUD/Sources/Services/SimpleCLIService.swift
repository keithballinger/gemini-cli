import Foundation
import Combine

// CLI service that runs the CLI in interactive mode
class SimpleCLIService: ObservableObject {
    @Published var isRunning = false
    @Published var lastError: Error?
    
    private var process: Process?
    private var inputPipe: Pipe?
    private var outputPipe: Pipe?
    private var errorPipe: Pipe?
    
    private let streamSubject = PassthroughSubject<String, Never>()
    var outputStream: AnyPublisher<String, Never> {
        streamSubject.eraseToAnyPublisher()
    }
    
    private var messageQueue = DispatchQueue(label: "com.gemini.cli.queue", qos: .userInitiated)
    private var outputBuffer = ""
    
    init() {
        log("SimpleCLIService: Initialized")
    }
    
    func sendMessage(_ message: String) {
        guard let inputPipe = inputPipe else {
            // Restart if needed
            startProcess()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                self?.sendMessage(message)
            }
            return
        }
        
        messageQueue.async { [weak self] in
            // Create JSON-RPC request for IPC mode
            let requestId = UUID().uuidString
            let request: [String: Any] = [
                "id": requestId,
                "method": "chat.send",
                "params": [
                    "message": message,
                    "context": [:]
                ]
            ]
            
            self?.log("Sending request with ID: \(requestId) for message: \(message)")
            
            do {
                let jsonData = try JSONSerialization.data(withJSONObject: request)
                let jsonString = String(data: jsonData, encoding: .utf8)! + "\n"
                let messageData = jsonString.data(using: .utf8)!
                inputPipe.fileHandleForWriting.write(messageData)
                
                // Mark as processing
                DispatchQueue.main.async {
                    self?.isRunning = true
                }
            } catch {
                print("Failed to encode IPC request: \(error)")
                DispatchQueue.main.async {
                    self?.lastError = error
                    self?.isRunning = false
                }
            }
        }
    }
    
    private func findCLIPath() -> String? {
        let fileManager = FileManager.default
        let pathEnv = ProcessInfo.processInfo.environment["PATH"] ?? ""
        let paths = pathEnv.split(separator: ":").map(String.init)

        for path in paths {
            let geminiPath = URL(fileURLWithPath: path).appendingPathComponent("gemini").path
            if fileManager.isExecutableFile(atPath: geminiPath) {
                return geminiPath
            }
        }
        return nil
    }

    func start() {
        messageQueue.async { [weak self] in
            self?.startProcess()
        }
    }

    private func startProcess() {
        // Clean up any existing process
        stop()

        process = Process()
        inputPipe = Pipe()
        outputPipe = Pipe()
        errorPipe = Pipe()

        guard let process = process,
              let inputPipe = inputPipe,
              let outputPipe = outputPipe,
              let errorPipe = errorPipe else { return }

        guard let cliPath = findCLIPath() else {
            log("Error: Gemini CLI not found in PATH")
            DispatchQueue.main.async {
                self.lastError = NSError(
                    domain: "SimpleCLIService",
                    code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "Gemini CLI not found in PATH"]
                )
            }
            return
        }

        // Run CLI in IPC mode for GUI integration
        process.executableURL = URL(fileURLWithPath: cliPath)
        process.arguments = ["--ipc"]
        process.standardInput = inputPipe
        process.standardOutput = outputPipe
        process.standardError = errorPipe

        // Set up environment with proper paths
        var environment = ProcessInfo.processInfo.environment
        environment["NODE_ENV"] = "production"
        // Ensure HOME is set for auth credentials
        if environment["HOME"] == nil {
            environment["HOME"] = NSHomeDirectory()
        }
        process.environment = environment

        // Set working directory to the gemini-cli project root
        let workingDirectory = URL(fileURLWithPath: #file)
            .deletingLastPathComponent() // Services
            .deletingLastPathComponent() // Sources
            .deletingLastPathComponent() // GeminiHUD
            .deletingLastPathComponent() // gui
        process.currentDirectoryURL = workingDirectory
        log("Set working directory to: \(workingDirectory.path)")
        
        // Handle output
        outputPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty else { return }
            
            if let output = String(data: data, encoding: .utf8) {
                self?.processOutput(output)
            }
        }
        
        // Handle errors  
        errorPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            if !data.isEmpty, let error = String(data: data, encoding: .utf8) {
                // Always log errors for debugging
                print("CLI STDERR: \(error)")
                
                // Filter out deprecation warnings for user-facing errors
                if !error.contains("DeprecationWarning") && !error.contains("npm warn") {
                    // Check for actual errors
                    if error.contains("Error:") || error.contains("error:") || error.contains("IPC:") {
                        DispatchQueue.main.async {
                            self?.lastError = NSError(
                                domain: "SimpleCLIService",
                                code: -1,
                                userInfo: [NSLocalizedDescriptionKey: error]
                            )
                        }
                    }
                }
            }
        }
        
        // Handle termination
        process.terminationHandler = { [weak self] process in
            self?.log("CLI Process terminated with status: \(process.terminationStatus), reason: \(process.terminationReason)")
            DispatchQueue.main.async {
                self?.isRunning = false
                if process.terminationStatus != 0 {
                    self?.lastError = NSError(
                        domain: "SimpleCLIService",
                        code: Int(process.terminationStatus),
                        userInfo: [NSLocalizedDescriptionKey: "CLI exited with status \(process.terminationStatus)"]
                    )
                    // Restart after a delay
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                        self?.log("Restarting CLI process...")
                        self?.startProcess()
                    }
                }
            }
        }
        
        // Start
        do {
            try process.run()
            print("CLI process started successfully")
        } catch {
            lastError = error
            isRunning = false
            print("Failed to start CLI: \(error)")
        }
    }
    
    private func log(_ message: String) {
        let logFileURL = URL(fileURLWithPath: #file)
            .deletingLastPathComponent() // Services
            .deletingLastPathComponent() // Sources
            .appendingPathComponent("gemini-hud.log")
        
        let timestamp = DateFormatter.localizedString(from: Date(), dateStyle: .short, timeStyle: .long)
        let logMessage = "\(timestamp): \(message)\n"
        
        do {
            let fileHandle = try FileHandle(forWritingTo: logFileURL)
            fileHandle.seekToEndOfFile()
            fileHandle.write(logMessage.data(using: .utf8)!)
            fileHandle.closeFile()
        } catch {
            // If the file doesn't exist, create it
            try? logMessage.data(using: .utf8)?.write(to: logFileURL)
        }
    }

    private func processOutput(_ output: String) {
        log("CLI Raw Output: \(output)")
        
        // Buffer output to handle partial lines
        outputBuffer += output
        
        // Try to parse JSON lines from the buffer
        let lines = outputBuffer.components(separatedBy: "\n")
        var remainingBuffer = ""
        
        for (index, line) in lines.enumerated() {
            let trimmedLine = line.trimmingCharacters(in: .whitespacesAndNewlines)
            
            // If this is the last line and doesn't end with newline, keep it in buffer
            if index == lines.count - 1 && !outputBuffer.hasSuffix("\n") {
                remainingBuffer = line
                continue
            }
            
            guard !trimmedLine.isEmpty else { continue }
            
            log("Processing line: \(trimmedLine)")
            
            // Try to parse as JSON
            if let data = trimmedLine.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                
                log("Parsed JSON: \(json)")

                // Handle different IPC message types
                if let type = json["type"] as? String {
                    // This is a stream event
                    switch type {
                    case "message.chunk":
                        if let chunk = json["data"] as? String {
                            log("Message chunk received: \(chunk)")
                            DispatchQueue.main.async {
                                self.streamSubject.send(chunk)
                            }
                        }
                    case "tool.start":
                        if let toolData = json["data"] as? [String: Any] {
                            log("Tool Starting: \(toolData["name"] ?? "unknown") with data: \(toolData)")
                        }
                    case "tool.end":
                        if let toolData = json["data"] as? [String: Any] {
                            log("Tool Completed: \(toolData["name"] ?? "unknown") with data: \(toolData)")
                        }
                    case "error":
                        if let errorData = json["data"] {
                            log("IPC Error Event: \(errorData)")
                        }
                    default:
                        log("Unknown IPC Event Type: \(type)")
                    }
                } else if let result = json["result"] as? [String: Any],
                          let resultType = result["type"] as? String {
                    // This is a response
                    log("IPC Response: \(resultType)")
                    if resultType == "message" {
                        // Message complete
                        if let messageId = json["id"] as? String {
                            log("Message complete for ID: \(messageId)")
                        }
                        DispatchQueue.main.async {
                            self.isRunning = false
                        }
                    }
                    else if resultType == "status" {
                        // Initial status message
                        log("IPC Connected: \(result)")
                    }
                } else if let error = json["error"] as? [String: Any] {
                    // Error response
                    let errorMessage = error["message"] as? String ?? "Unknown error"
                    log("IPC Error Response: \(errorMessage)")
                    DispatchQueue.main.async {
                        self.lastError = NSError(
                            domain: "SimpleCLIService",
                            code: -1,
                            userInfo: [NSLocalizedDescriptionKey: errorMessage]
                        )
                        self.isRunning = false
                    }
                }
            } else {
                // Not JSON, might be startup output
                log("Non-JSON output: \(trimmedLine)")
            }
        }
        
        outputBuffer = remainingBuffer
    }
    
    func stop() {
        outputPipe?.fileHandleForReading.readabilityHandler = nil
        errorPipe?.fileHandleForReading.readabilityHandler = nil
        
        if let process = process, process.isRunning {
            process.terminate()
            // Wait a bit for clean termination
            DispatchQueue.global().asyncAfter(deadline: .now() + 0.1) {
                if process.isRunning {
                    process.interrupt()
                }
            }
        }
        
        process = nil
        inputPipe = nil
        outputPipe = nil
        errorPipe = nil
        isRunning = false
        outputBuffer = ""
    }
    
    deinit {
        stop()
    }
}