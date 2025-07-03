#!/usr/bin/env swift

import Foundation

// Test the simple CLI approach
let process = Process()
let outputPipe = Pipe()
let errorPipe = Pipe()

let cliPath = "/Users/keithballinger/Desktop/projects/gemini-cli/bundle/gemini.js"
let prompt = "Explain the README.md file in this directory"

process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
process.arguments = ["node", "--max-old-space-size=4096", cliPath, "-p", prompt]
process.standardOutput = outputPipe
process.standardError = errorPipe
process.currentDirectoryURL = URL(fileURLWithPath: "/Users/keithballinger/Desktop/projects/gemini-cli")

print("Running: node \(cliPath) -p \"\(prompt)\"")
print("Working directory: \(process.currentDirectoryURL!.path)")
print("---")

// Handle output
outputPipe.fileHandleForReading.readabilityHandler = { handle in
    let data = handle.availableData
    if !data.isEmpty, let output = String(data: data, encoding: .utf8) {
        print(output, terminator: "")
    }
}

// Handle errors
errorPipe.fileHandleForReading.readabilityHandler = { handle in
    let data = handle.availableData
    if !data.isEmpty, let error = String(data: data, encoding: .utf8) {
        if !error.contains("DeprecationWarning") {
            print("ERROR: \(error)", terminator: "")
        }
    }
}

// Handle termination
process.terminationHandler = { process in
    print("\n---")
    print("Process terminated with status: \(process.terminationStatus)")
    exit(Int32(process.terminationStatus))
}

// Start
do {
    try process.run()
    process.waitUntilExit()
} catch {
    print("Failed to start process: \(error)")
    exit(1)
}