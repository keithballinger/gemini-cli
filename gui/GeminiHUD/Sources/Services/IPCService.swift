import Foundation
import Combine

class IPCService: ObservableObject {
    @Published var isConnected = false
    @Published var lastError: Error?
    
    private var process: Process?
    private var inputPipe: Pipe?
    private var outputPipe: Pipe?
    private var errorPipe: Pipe?
    
    private var messageQueue = DispatchQueue(label: "com.gemini.hud.ipc", qos: .userInitiated)
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        startProcess()
    }
    
    deinit {
        stopProcess()
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
        
        // Configure process
        process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
        process.arguments = ["node", "../../../dist/index.js", "--mode", "ipc"]
        process.standardInput = inputPipe
        process.standardOutput = outputPipe
        process.standardError = errorPipe
        
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
    
    private func stopProcess() {
        outputPipe?.fileHandleForReading.readabilityHandler = nil
        errorPipe?.fileHandleForReading.readabilityHandler = nil
        process?.terminate()
        process = nil
        isConnected = false
    }
    
    func sendMessage(_ message: IPCMessage) {
        messageQueue.async { [weak self] in
            guard let inputPipe = self?.inputPipe,
                  let data = try? JSONEncoder().encode(message) else { return }
            
            inputPipe.fileHandleForWriting.write(data)
            inputPipe.fileHandleForWriting.write("\n".data(using: .utf8)!)
        }
    }
    
    private func handleOutput(_ data: Data) {
        guard let response = try? JSONDecoder().decode(IPCResponse.self, from: data) else { return }
        
        DispatchQueue.main.async {
            // TODO: Handle response
            print("Received response: \(response)")
        }
    }
    
    private func handleError(_ data: Data) {
        guard let errorString = String(data: data, encoding: .utf8) else { return }
        
        DispatchQueue.main.async {
            print("IPC Error: \(errorString)")
        }
    }
}

struct IPCMessage: Codable {
    let id: String
    let method: String
    let params: [String: String]
}

struct IPCResponse: Codable {
    let id: String
    let result: IPCResult?
    let error: IPCError?
}

struct IPCResult: Codable {
    let response: String
    let tools: [String]?
}

struct IPCError: Codable {
    let code: Int
    let message: String
}