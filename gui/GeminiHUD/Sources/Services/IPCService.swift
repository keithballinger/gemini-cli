import Foundation
import Combine

class IPCService: ObservableObject {
    @Published var isConnected = false
    @Published var lastError: Error?
    @Published var currentStatus: StatusResult?
    
    private var process: Process?
    private var inputPipe: Pipe?
    private var outputPipe: Pipe?
    private var errorPipe: Pipe?
    
    private var messageQueue = DispatchQueue(label: "com.gemini.hud.ipc", qos: .userInitiated)
    private var cancellables = Set<AnyCancellable>()
    private var pendingRequests: [String: CheckedContinuation<IPCResult?, Error>] = [:]
    private var pendingMessageRequests: [String: CheckedContinuation<MessageResult, Error>] = [:]
    private var pendingStatusRequests: [String: CheckedContinuation<StatusResult, Error>] = [:]
    private let responseSubject = PassthroughSubject<IPCResponse, Never>()
    private let streamEventSubject = PassthroughSubject<IPCStreamEvent, Never>()
    
    var streamEvents: AnyPublisher<IPCStreamEvent, Never> {
        streamEventSubject.eraseToAnyPublisher()
    }
    
    init() {
        setupBindings()
    }
    
    deinit {
        stopProcess()
    }
    
    private func setupBindings() {
        // Handle responses
        responseSubject
            .receive(on: DispatchQueue.main)
            .sink { [weak self] response in
                self?.handleResponse(response)
            }
            .store(in: &cancellables)
    }
    
    private func handleResponse(_ response: IPCResponse) {
        // Handle init response
        if response.id == "init" {
            print("IPC: Received init response")
            if let result = response.result,
               case .status(let status) = result {
                currentStatus = status
                print("IPC: Connected - Model: \(status.model), Dir: \(status.workingDirectory)")
            }
            return
        }
        
        // Handle general pending requests
        if let continuation = pendingRequests[response.id] {
            pendingRequests.removeValue(forKey: response.id)
            
            if let error = response.error {
                continuation.resume(throwing: IPCServiceError.serverError(error.message))
            } else {
                continuation.resume(returning: response.result)
            }
        }
        
        // Handle message requests
        if let continuation = pendingMessageRequests[response.id] {
            pendingMessageRequests.removeValue(forKey: response.id)
            
            if let error = response.error {
                continuation.resume(throwing: IPCServiceError.serverError(error.message))
            } else if case .message(let result)? = response.result {
                continuation.resume(returning: result)
            } else {
                continuation.resume(throwing: IPCServiceError.invalidResponse)
            }
        }
        
        // Handle status requests
        if let continuation = pendingStatusRequests[response.id] {
            pendingStatusRequests.removeValue(forKey: response.id)
            
            if let error = response.error {
                continuation.resume(throwing: IPCServiceError.serverError(error.message))
            } else if case .status(let result)? = response.result {
                continuation.resume(returning: result)
            } else {
                continuation.resume(throwing: IPCServiceError.invalidResponse)
            }
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

    private func findCLIPath() -> String? {
        let fileManager = FileManager.default
        let pathEnv = ProcessInfo.processInfo.environment["PATH"] ?? ""
        let paths = pathEnv.split(separator: ":").map(String.init)
        log("Searching for gemini executable in PATH: \(pathEnv)")

        for path in paths {
            let geminiPath = URL(fileURLWithPath: path).appendingPathComponent("gemini").path
            if fileManager.isExecutableFile(atPath: geminiPath) {
                log("Found executable at: \(geminiPath)")
                return geminiPath
            }
        }
        log("Gemini executable not found in PATH")
        return nil
    }

    private func startProcess() {
        messageQueue.async { [weak self] in
            self?.setupProcess()
        }
    }

    private func setupProcess() {
        process = Process()
        inputPipe = Pipe()
        outputPipe = Pipe()
        errorPipe = Pipe()

        guard let process = process,
              let inputPipe = inputPipe,
              let outputPipe = outputPipe,
              let errorPipe = errorPipe else { return }

        // Find the CLI executable path
        guard let cliPath = findCLIPath() else {
            log("Error: Could not find Gemini CLI in PATH")
            DispatchQueue.main.async {
                self.lastError = IPCServiceError.processError("Gemini CLI not found in PATH.")
            }
            return
        }

        // Configure process
        process.executableURL = URL(fileURLWithPath: cliPath)
        process.arguments = ["--ipc"]
        process.standardInput = inputPipe
        process.standardOutput = outputPipe
        process.standardError = errorPipe

        // Set environment
        process.environment = ProcessInfo.processInfo.environment

        // Set working directory
        let initialWorkingDirectory = FileManager.default.currentDirectoryPath
        var targetWorkingDirectory: URL

        if initialWorkingDirectory == "/" {
            // Likely launched from Finder/Dock, use Desktop
            guard let desktopDirectory = FileManager.default.urls(for: .desktopDirectory, in: .userDomainMask).first else {
                log("Could not find Desktop directory. Using home directory as fallback.")
                targetWorkingDirectory = URL(fileURLWithPath: NSHomeDirectory())
                return
            }
            targetWorkingDirectory = desktopDirectory
        } else {
            // Likely launched from terminal, use the current directory
            targetWorkingDirectory = URL(fileURLWithPath: initialWorkingDirectory)
        }

        process.currentDirectoryURL = targetWorkingDirectory
        log("Set working directory to: \(targetWorkingDirectory.path)")
        
        // Set up output handling
        outputPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            if !data.isEmpty {
                self?.handleOutput(data)
            }
        }
        
        // Set up error handling
        errorPipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            if !data.isEmpty {
                self?.handleError(data)
            }
        }
        
        // Set up process termination handler
        process.terminationHandler = { [weak self] process in
            print("IPCService: Process terminated with status: \(process.terminationStatus)")
            DispatchQueue.main.async {
                self?.isConnected = false
                if process.terminationStatus != 0 {
                    self?.lastError = IPCServiceError.processError("CLI process terminated unexpectedly with status: \(process.terminationStatus)")
                }
            }
        }
        
        // Start process
        do {
            print("IPCService: Starting process with arguments: \(process.arguments ?? [])")
            print("IPCService: Working directory: \(process.currentDirectoryURL?.path ?? "nil")")
            try process.run()
            print("IPCService: Process started successfully")
            DispatchQueue.main.async {
                self.isConnected = true
            }
        } catch {
            print("IPCService: Failed to start process: \(error)")
            DispatchQueue.main.async {
                self.lastError = error
                self.isConnected = false
            }
        }
    }
    
    func start() {
        // Stop any existing process first
        stopProcess()
        
        messageQueue.async { [weak self] in
            self?.startProcess()
        }
    }
    
    private func stopProcess() {
        outputPipe?.fileHandleForReading.readabilityHandler = nil
        errorPipe?.fileHandleForReading.readabilityHandler = nil
        process?.terminate()
        process = nil
        inputPipe = nil
        outputPipe = nil
        errorPipe = nil
        isConnected = false
        currentStatus = nil
        outputBuffer = "" // Clear the buffer
        lastError = nil
    }
    
    // MARK: - Public API
    
    func sendMessage(_ message: String, context: MessageContext? = nil) async throws -> MessageResult {
        guard isConnected else {
            throw IPCServiceError.notConnected
        }
        
        let request = IPCRequest(
            id: UUID().uuidString,
            method: .sendMessage,
            params: .sendMessage(SendMessageParams(message: message, context: context))
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            pendingMessageRequests[request.id] = continuation
            sendRequest(request)
        }
    }
    
    func getStatus() async throws -> StatusResult {
        let request = IPCRequest(
            id: UUID().uuidString,
            method: .getStatus,
            params: .getStatus
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            pendingStatusRequests[request.id] = continuation
            sendRequest(request)
        }
    }
    
    private func sendRequest(_ request: IPCRequest) {
        guard isConnected else {
            DispatchQueue.main.async { [weak self] in
                self?.handleRequestError(request.id, IPCServiceError.notConnected)
            }
            return
        }
        
        messageQueue.async { [weak self] in
            guard let self = self,
                  let inputPipe = self.inputPipe else {
                DispatchQueue.main.async { [weak self] in
                    self?.handleRequestError(request.id, IPCServiceError.processError("IPC service deallocated"))
                }
                return
            }
            
            do {
                let data = try request.toJSON()
                
                if let jsonString = String(data: data, encoding: .utf8) {
                    print("IPCService: Sending request: \(jsonString)")
                }
                
                inputPipe.fileHandleForWriting.write(data)
                if let newlineData = "\n".data(using: .utf8) {
                    inputPipe.fileHandleForWriting.write(newlineData)
                }
            } catch {
                DispatchQueue.main.async { [weak self] in
                    self?.handleRequestError(request.id, IPCServiceError.processError("Failed to encode request: \(error)"))
                }
            }
        }
    }
    
    private func handleRequestError(_ requestId: String, _ error: Error) {
        // Handle error for any type of pending request
        if let continuation = pendingRequests[requestId] {
            pendingRequests.removeValue(forKey: requestId)
            continuation.resume(throwing: error)
        }
        if let continuation = pendingMessageRequests[requestId] {
            pendingMessageRequests.removeValue(forKey: requestId)
            continuation.resume(throwing: error)
        }
        if let continuation = pendingStatusRequests[requestId] {
            pendingStatusRequests.removeValue(forKey: requestId)
            continuation.resume(throwing: error)
        }
    }
    
    private var outputBuffer = ""
    
    private func handleOutput(_ data: Data) {
        guard let output = String(data: data, encoding: .utf8) else {
            print("IPCService: Received non-UTF8 output data")
            return
        }
        
        // Append to buffer to handle partial messages
        outputBuffer += output
        
        // Split by newlines and process complete lines
        let lines = outputBuffer.components(separatedBy: .newlines)
        
        // Keep the last component as it might be incomplete
        if lines.count > 1 {
            outputBuffer = lines.last ?? ""
            
            // Process all complete lines
            for i in 0..<(lines.count - 1) {
                let line = lines[i]
                let trimmedLine = line.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !trimmedLine.isEmpty,
                      let lineData = trimmedLine.data(using: .utf8) else { continue }
                
                // Don't print large outputs (like from read_many_files)
                if trimmedLine.count < 500 {
                    print("IPCService: Received line: \(trimmedLine)")
                } else {
                    print("IPCService: Received large output (\(trimmedLine.count) chars)")
                }
                
                do {
                    // Try to parse as response
                    let response = try JSONDecoder().decode(IPCResponse.self, from: lineData)
                    print("IPCService: Parsed response: \(response.id)")
                    responseSubject.send(response)
                } catch {
                    do {
                        // Try to parse as stream event
                        let event = try JSONDecoder().decode(IPCStreamEvent.self, from: lineData)
                        print("IPCService: Parsed stream event: \(event.type)")
                        streamEventSubject.send(event)
                    } catch {
                        if trimmedLine.count < 200 {
                            print("IPCService: Could not parse line as JSON: \(trimmedLine)")
                        } else {
                            print("IPCService: Could not parse large line as JSON")
                        }
                    }
                }
            }
        }
    }
    
    private func handleError(_ data: Data) {
        guard let errorString = String(data: data, encoding: .utf8) else { return }
        
        print("IPCService: Process error: \(errorString)")
        
        // Filter out deprecation warnings
        if errorString.contains("DeprecationWarning") || errorString.contains("IPC:") {
            // These are just warnings, not errors
            return
        }
        
        DispatchQueue.main.async { [weak self] in
            self?.lastError = IPCServiceError.processError(errorString)
        }
    }
}

// MARK: - Error Types

enum IPCServiceError: LocalizedError {
    case notConnected
    case invalidResponse
    case serverError(String)
    case processError(String)
    case timeout
    
    var errorDescription: String? {
        switch self {
        case .notConnected:
            return "IPC service is not connected"
        case .invalidResponse:
            return "Invalid response from server"
        case .serverError(let message):
            return "Server error: \(message)"
        case .processError(let message):
            return "Process error: \(message)"
        case .timeout:
            return "Request timed out"
        }
    }
}