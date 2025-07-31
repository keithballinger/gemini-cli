# Gemini CLI Shell - Architecture Overview

## Table of Contents
1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [Shell Mode Integration](#shell-mode-integration)
5. [Command Processing Pipeline](#command-processing-pipeline)
6. [Extension System](#extension-system)
7. [State Management](#state-management)
8. [Security and Sandboxing](#security-and-sandboxing)
9. [Performance Considerations](#performance-considerations)

## Introduction

The Gemini CLI Shell is a hybrid system that combines a traditional POSIX-compliant shell with AI-powered assistance. It operates in two distinct modes:

- **CLI Mode**: Traditional AI assistant interface for interactive queries
- **Shell Mode**: Full shell replacement with integrated AI capabilities

The architecture is designed to provide seamless switching between these modes while maintaining familiar shell behavior and adding powerful AI-enhanced features.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│                    (React-based Terminal)                    │
├─────────────────────────────────────────────────────────────┤
│                     Command Router                           │
│              (Intelligent Input Classification)              │
├─────────────────┬─────────────────────────┬─────────────────┤
│   Shell Engine  │    Gemini Client       │   Tool System    │
│  (POSIX Shell)  │   (AI Integration)     │  (Extensions)    │
├─────────────────┴─────────────────────────┴─────────────────┤
│                    Core Services                             │
│        (Config, Auth, Memory, Persistence)                   │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure

```
gemini-cli-shell/
├── packages/
│   ├── cli/              # Frontend UI and user interaction
│   │   ├── src/
│   │   │   ├── ui/       # React components and hooks
│   │   │   ├── utils/    # Command routing, invocation detection
│   │   │   └── config/   # CLI-specific configuration
│   │   └── index.ts      # Main entry point
│   │
│   └── core/             # Backend services and business logic
│       ├── src/
│       │   ├── core/     # Gemini integration
│       │   ├── shell/    # Shell implementation
│       │   ├── tools/    # Tool system
│       │   └── config/   # Core configuration
│       └── index.ts      # Core exports
│
├── shell/                # Rust-based shell (future)
├── docs/                 # Documentation
├── scripts/              # Build and deployment scripts
└── bundle/               # Compiled output
```

## Core Components

### 1. Command Router (`packages/cli/src/utils/commandRouter.ts`)

The CommandRouter is the brain of the input classification system:

```typescript
class CommandRouter {
  // Intelligent routing between shell and Gemini
  route(input: string): RouteResult {
    // 1. Check for explicit Gemini prefixes ('g ', '_ ', '?')
    // 2. Apply shell command heuristics
    // 3. Detect natural language patterns
    // 4. Default to shell command
  }
}
```

**Key Features:**
- Pattern-based classification
- Configurable prefixes
- Natural language detection
- Extensible heuristics

### 2. Invocation Detector (`packages/cli/src/utils/invocationDetector.ts`)

Determines how the application was launched:

```typescript
class InvocationDetector {
  static detect(args: { shell?: boolean }): InvocationInfo {
    // Priority-based detection:
    // 1. --shell flag
    // 2. SHELL environment variable
    // 3. argv[0] starts with dash
    // 4. Parent process analysis
    // 5. /etc/shells registration
  }
}
```

### 3. Shell Engine (`packages/core/src/shell/`)

Full POSIX-compliant shell implementation:

```typescript
class GeminiShell {
  // Core shell functionality
  constructor(options: ShellOptions)
  execute(command: string): Promise<ExecutionResult>
  setEnvironment(key: string, value: string): void
  changeDirectory(path: string): void
  // ... more shell operations
}
```

**Components:**
- **Parser**: Command line parsing and tokenization
- **Executor**: Command execution and process management
- **Environment**: Variable and state management
- **Builtins**: Native shell commands (cd, pwd, export, etc.)
- **JobControl**: Background process management

### 4. Gemini Integration (`packages/core/src/core/`)

AI integration layer:

```typescript
class GeminiChat {
  // Manages conversations with Gemini
  constructor(config: GeminiConfig)
  sendMessage(message: string): AsyncGenerator<ContentChunk>
  executeTools(tools: Tool[]): Promise<ToolResult[]>
}
```

**Features:**
- Streaming responses
- Tool execution
- Context management
- Error handling

### 5. Tool System (`packages/core/src/tools/`)

Extensible tool architecture:

```typescript
interface Tool {
  name: string
  description: string
  parameters: ParameterSchema
  execute(params: any): Promise<ToolResult>
  shouldConfirm?: boolean
}

class ToolRegistry {
  register(tool: Tool): void
  discover(): Promise<Tool[]>
  execute(name: string, params: any): Promise<ToolResult>
}
```

## Shell Mode Integration

### Dual-Mode Operation

The system seamlessly switches between CLI and Shell modes:

1. **Shell Mode**: Acts as user's login shell
   - Full POSIX compliance
   - Command history persistence
   - Environment variable management
   - Job control and process management

2. **CLI Mode**: Traditional AI assistant
   - Interactive queries
   - Tool execution with confirmations
   - Streaming responses
   - Context-aware assistance

### Shell State Management

```typescript
interface ShellState {
  currentDirectory: string
  environment: Map<string, string>
  history: CommandHistory
  jobs: JobTable
  aliases: Map<string, string>
}
```

State persists across sessions using:
- JSON files for configuration
- SQLite for command history
- Environment serialization

## Command Processing Pipeline

### Input Flow

```
User Input
    ↓
Keypress Handler (with shortcuts)
    ↓
Command Router
    ├─→ Shell Command Path
    │     ├─→ Built-in Command
    │     └─→ External Command
    │
    └─→ Gemini Query Path
          ├─→ Context Building
          ├─→ Tool Discovery
          └─→ Response Streaming
```

### Shell Command Execution

1. **Parsing**: Tokenize and parse command line
2. **Expansion**: Variable and glob expansion
3. **Resolution**: Find command (builtin/external)
4. **Execution**: Spawn process or run builtin
5. **I/O Management**: Handle pipes and redirections
6. **Result Collection**: Capture output and exit status

### Gemini Query Processing

1. **Context Assembly**: Include shell state and history
2. **Tool Registration**: Available tools for current context
3. **Query Submission**: Send to Gemini API
4. **Stream Processing**: Handle incremental responses
5. **Tool Execution**: Run tools with user confirmation
6. **Result Integration**: Merge results into response

## Extension System

### Tool Discovery

Tools are discovered from multiple sources:

1. **Core Tools**: Built-in file, shell, web tools
2. **Project Tools**: Project-specific extensions
3. **MCP Servers**: Model Context Protocol integrations
4. **User Tools**: Custom user-defined tools

### MCP Integration

```typescript
interface MCPServer {
  name: string
  command: string[]
  env?: Record<string, string>
  tools: Tool[]
}
```

MCP servers provide:
- External tool hosting
- Language-agnostic extensions
- Isolated execution environments
- Dynamic capability discovery

## State Management

### React State Architecture

```typescript
// Global contexts
const StreamingContext = React.createContext<StreamingState>()
const SessionContext = React.createContext<SessionState>()
const OverflowContext = React.createContext<OverflowState>()

// Custom hooks for state management
function useGeminiStream() { /* ... */ }
function useShellHistory() { /* ... */ }
function useCommandRouter() { /* ... */ }
```

### Persistence Layers

1. **Configuration**: JSON files in ~/.gemini/
2. **Shell History**: SQLite database
3. **Session State**: Temporary files
4. **Memory/Context**: Markdown files

## Security and Sandboxing

### Sandbox Support

Multiple sandboxing options:

1. **Docker/Podman**: Container-based isolation
2. **macOS Sandbox**: Native sandbox-exec
3. **User Permissions**: File system access controls

### Security Features

- Tool execution confirmations
- File modification previews
- Credential management
- Audit logging
- Resource limits

## Performance Considerations

### Optimization Strategies

1. **Bundle Optimization**
   - Single-file distribution
   - Tree shaking and minification
   - Lazy loading for tools

2. **Memory Management**
   - Dynamic heap sizing
   - Automatic process relaunching
   - Garbage collection tuning

3. **Streaming Architecture**
   - Non-blocking UI updates
   - Incremental rendering
   - Response chunking

4. **Caching**
   - Configuration caching
   - Tool discovery caching
   - API response caching

### Performance Metrics

- Startup time: < 100ms
- Command routing: < 10ms
- First token latency: < 500ms
- Memory usage: < 200MB baseline

## Future Architecture Directions

1. **Rust Shell Core**: Native performance for shell operations
2. **Plugin Marketplace**: Community tool sharing
3. **Distributed Execution**: Remote command execution
4. **Advanced Context**: Semantic understanding of shell state
5. **Multi-Model Support**: Beyond Gemini integration

This architecture provides a solid foundation for a next-generation shell that combines traditional command-line power with modern AI capabilities, all while maintaining familiarity and reliability for everyday use.