import SwiftUI

struct ToolPalette: View {
    @EnvironmentObject var appState: AppState
    
    let tools = [
        ToolItem(icon: "folder", name: "Files", id: "files"),
        ToolItem(icon: "terminal", name: "Shell", id: "shell"),
        ToolItem(icon: "globe", name: "Web", id: "web"),
        ToolItem(icon: "memorychip", name: "Memory", id: "memory"),
        ToolItem(icon: "power", name: "MCP", id: "mcp")
    ]
    
    var body: some View {
        VStack(spacing: 12) {
            ForEach(tools) { tool in
                ToolButton(tool: tool)
            }
            
            Spacer()
        }
        .padding(.vertical, 12)
        .background(appState.currentTheme.backgroundColor.opacity(0.3))
    }
}

struct ToolItem: Identifiable {
    let icon: String
    let name: String
    let id: String
}

struct ToolButton: View {
    let tool: ToolItem
    @State private var isHovered = false
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        Button(action: { selectTool() }) {
            VStack(spacing: 4) {
                Image(systemName: tool.icon)
                    .font(.system(size: 20))
                    .foregroundColor(
                        isHovered
                            ? appState.currentTheme.accentColor
                            : appState.currentTheme.foregroundColor.opacity(0.6)
                    )
                
                Text(tool.name)
                    .font(.system(size: 9))
                    .foregroundColor(appState.currentTheme.foregroundColor.opacity(0.5))
            }
            .frame(width: 50, height: 50)
        }
        .buttonStyle(.plain)
        .onHover { hovering in
            withAnimation(.easeInOut(duration: 0.2)) {
                isHovered = hovering
            }
        }
    }
    
    private func selectTool() {
        // TODO: Implement tool selection
        print("Selected tool: \(tool.name)")
    }
}