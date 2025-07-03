import SwiftUI

struct ToolExecutionView: View {
    let toolExecution: ToolExecution
    @EnvironmentObject var appState: AppState
    @ObservedObject var viewModel = HUDViewModel.shared
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Tool header
            HStack {
                Image(systemName: iconForTool(toolExecution.name))
                    .font(.system(size: 14))
                    .foregroundColor(appState.currentTheme.accentColor)
                
                Text(toolExecution.name)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(appState.currentTheme.foregroundColor)
                
                Spacer()
                
                // Status indicator
                statusView
            }
            
            // Parameters (if any)
            if !toolExecution.parameters.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(Array(toolExecution.parameters.keys), id: \.self) { key in
                        HStack {
                            Text("\(key):")
                                .font(.system(size: 12))
                                .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.7))
                            Text(String(describing: toolExecution.parameters[key] ?? ""))
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(appState.currentTheme.foregroundColor)
                            Spacer()
                        }
                    }
                }
                .padding(.horizontal, 8)
            }
            
            // Approval buttons for pending tools
            if toolExecution.state == .pending {
                HStack(spacing: 12) {
                    Button(action: {
                        viewModel.approveTool(toolExecution)
                    }) {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 12))
                            Text("Approve")
                                .font(.system(size: 12, weight: .medium))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.green)
                        .cornerRadius(6)
                    }
                    .buttonStyle(.plain)
                    
                    Button(action: {
                        viewModel.rejectTool(toolExecution)
                    }) {
                        HStack {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 12))
                            Text("Reject")
                                .font(.system(size: 12, weight: .medium))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.red)
                        .cornerRadius(6)
                    }
                    .buttonStyle(.plain)
                    
                    Spacer()
                }
                .padding(.top, 4)
            }
            
            // Output (if any)
            if let output = toolExecution.output {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Output:")
                        .font(.system(size: 12))
                        .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.7))
                    
                    Text(output)
                        .font(.system(size: 12, weight: .medium, design: .monospaced))
                        .foregroundColor(appState.currentTheme.foregroundColor)
                        .padding(8)
                        .background(appState.currentTheme.backgroundColor.opacity(0.5))
                        .cornerRadius(4)
                        .textSelection(.enabled)
                }
            }
            
            // Error (if any)
            if let error = toolExecution.error {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.red)
                    Text(error)
                        .font(.system(size: 12))
                        .foregroundColor(.red)
                }
                .padding(8)
                .background(Color.red.opacity(0.1))
                .cornerRadius(4)
            }
        }
        .padding(12)
        .background(appState.currentTheme.backgroundColor.opacity(0.3))
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(borderColor, lineWidth: 1)
        )
    }
    
    private var statusView: some View {
        HStack(spacing: 4) {
            switch toolExecution.state {
            case .pending:
                Image(systemName: "clock.fill")
                    .foregroundColor(.orange)
                Text("Pending approval")
                    .foregroundColor(.orange)
            case .approved:
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                Text("Approved")
                    .foregroundColor(.green)
            case .rejected:
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(.red)
                Text("Rejected")
                    .foregroundColor(.red)
            case .executing:
                ProgressView()
                    .scaleEffect(0.7)
                Text("Executing...")
                    .foregroundColor(appState.currentTheme.accentColor)
            case .completed:
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
                Text("Completed")
                    .foregroundColor(.green)
            case .failed:
                Image(systemName: "exclamationmark.circle.fill")
                    .foregroundColor(.red)
                Text("Failed")
                    .foregroundColor(.red)
            }
        }
        .font(.system(size: 11))
    }
    
    private var borderColor: Color {
        switch toolExecution.state {
        case .pending:
            return .orange.opacity(0.5)
        case .approved, .completed:
            return appState.currentTheme.accentColor.opacity(0.5)
        case .rejected, .failed:
            return .red.opacity(0.5)
        case .executing:
            return appState.currentTheme.accentColor
        }
    }
    
    private func iconForTool(_ toolName: String) -> String {
        switch toolName.lowercased() {
        case let name where name.contains("shell") || name.contains("bash") || name.contains("command"):
            return "terminal.fill"
        case let name where name.contains("file") || name.contains("write"):
            return "doc.fill"
        case let name where name.contains("read"):
            return "doc.text.fill"
        case let name where name.contains("git"):
            return "arrow.triangle.branch"
        case let name where name.contains("search") || name.contains("find"):
            return "magnifyingglass"
        default:
            return "wrench.and.screwdriver.fill"
        }
    }
}

struct ToolExecutionView_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 16) {
            ToolExecutionView(toolExecution: ToolExecution(
                name: "run_shell_command",
                parameters: ["command": "git log -n 1"],
                state: .pending
            ))
            
            ToolExecutionView(toolExecution: ToolExecution(
                name: "run_shell_command",
                parameters: ["command": "ls -la"],
                state: .completed
            ))
        }
        .padding()
        .environmentObject(AppState())
    }
}