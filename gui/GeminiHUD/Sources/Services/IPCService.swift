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
    private var pendingRequests: [String: (IPCResponse) -> Void] = [:]
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
                if let handler = self?.pendingRequests[response.id] {
                    handler(response)
                    self?.pendingRequests.removeValue(forKey: response.id)
                }
            }
            .store(in: &cancellables)
    }
    
    private func findCLIPath() -> String {
        // Try to find the CLI in various locations
        let possiblePaths = [
            "../../../dist/index.js",
            "../../../../dist/index.js",
            "/usr/local/lib/gemini-cli/dist/index.js",
            "\(NSHomeDirectory())/.gemini/cli/dist/index.js"
        ]
        
        for path in possiblePaths {
            let fullPath = URL(fileURLWithPath: path).path
            if FileManager.default.fileExists(atPath: fullPath) {
                return fullPath
            }
        }
        
        // Default fallback
        return "../../../dist/index.js"
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
        let cliPath = findCLIPath()
        
        // Configure process
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = ["node", cliPath, "--ipc"]
        process.standardInput = inputPipe
        process.standardOutput = outputPipe
        process.standardError = errorPipe
        
        // Set environment
        process.environment = ProcessInfo.processInfo.environment
        
        // Set working directory to user's home or current directory
        process.currentDirectoryURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        
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
        
        // Start process
        do {
            try process.run()
            DispatchQueue.main.async {
                self.isConnected = true
            }
        } catch {
            DispatchQueue.main.async {
                self.lastError = error
                self.isConnected = false
            }
        }
    }
    
    func start() {
        messageQueue.async { [weak self] in
            self?.startProcess()
        }
    }
    
    private func stopProcess() {
        outputPipe?.fileHandleForReading.readabilityHandler = nil
        errorPipe?.fileHandleForReading.readabilityHandler = nil
        process?.terminate()
        process = nil
        isConnected = false
        currentStatus = nil
    }
    
    // MARK: - Public API
    
    func sendMessage(_ message: String, context: MessageContext? = nil) async throws -> MessageResult {
        let request = IPCRequest(
            id: UUID().uuidString,
            method: .sendMessage,
            params: .sendMessage(SendMessageParams(message: message, context: context))
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            sendRequest(request) { response in
                if let error = response.error {
                    continuation.resume(throwing: IPCServiceError.serverError(error.message))
                } else if case .message(let result) = response.result {
                    continuation.resume(returning: result)
                } else {
                    continuation.resume(throwing: IPCServiceError.invalidResponse)
                }
            }
        }
    }
    
    func getStatus() async throws -> StatusResult {
        let request = IPCRequest(
            id: UUID().uuidString,
            method: .getStatus,
            params: .getStatus
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            sendRequest(request) { response in
                if let error = response.error {
                    continuation.resume(throwing: IPCServiceError.serverError(error.message))
                } else if case .status(let result) = response.result {
                    continuation.resume(returning: result)
                } else {
                    continuation.resume(throwing: IPCServiceError.invalidResponse)
                }
            }
        }
    }
    
    private func sendRequest(_ request: IPCRequest, completion: @escaping (IPCResponse) -> Void) {
        pendingRequests[request.id] = completion
        
        messageQueue.async { [weak self] in
            guard let inputPipe = self?.inputPipe,
                  let data = try? JSONEncoder().encode(request) else {
                DispatchQueue.main.async {
                    completion(IPCResponse(
                        id: request.id,
                        result: nil,
                        error: IPCError(code: -1, message: "Failed to encode request")
                    ))
                }
                return
            }
            
            inputPipe.fileHandleForWriting.write(data)
            inputPipe.fileHandleForWriting.write("\n".data(using: .utf8)!)
        }
    }
    
    private func handleOutput(_ data: Data) {
        // Try to parse as JSON lines
        let lines = String(data: data, encoding: .utf8)?.split(separator: "\n") ?? []
        
        for line in lines {
            guard let lineData = line.data(using: .utf8) else { continue }
            
            // Try to parse as response
            if let response = try? JSONDecoder().decode(IPCResponse.self, from: lineData) {
                responseSubject.send(response)
            }
            // Try to parse as stream event
            else if let event = try? JSONDecoder().decode(IPCStreamEvent.self, from: lineData) {
                streamEventSubject.send(event)
            }
        }
    }
    
    private func handleError(_ data: Data) {
        guard let errorString = String(data: data, encoding: .utf8) else { return }
        
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