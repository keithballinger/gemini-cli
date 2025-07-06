# Rust Gemini Shell - Architecture & Implementation Plan

## Project Overview

**Rust Gemini Shell** is a high-performance POSIX-compliant shell written in Rust that integrates with the existing Node.js Gemini CLI core package. This architecture combines the speed and safety of Rust for shell operations with the proven AI capabilities of the TypeScript/Node.js ecosystem.

## Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Rust Shell Binary                       │
│  ├── Terminal UI (crossterm/ratatui)                      │
│  ├── Command Router (g/_, natural language detection)      │
│  ├── POSIX Shell Engine (Rust native)                     │
│  │   ├── Parser (pest/shell-words)                        │
│  │   ├── Executor (tokio async)                           │
│  │   ├── Job Control (process groups)                     │
│  │   └── Builtins (cd, export, jobs, etc.)               │
│  └── Response Handler (%% piping)                         │
└─────────────────────────────────────────────────────────────┘
                            │
                    HTTP/WebSocket Bridge
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Node.js Gemini Service                        │
│  ├── @google/gemini-cli-core                              │
│  ├── GeminiChat (agentic React loop)                      │
│  ├── Config (authentication, settings)                    │
│  ├── ContentGenerator                                      │
│  └── HTTP/WebSocket Server                                 │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure

```
shell/
├── Cargo.toml
├── README.md
├── src/
│   ├── main.rs                      # Entry point
│   ├── lib.rs                       # Library exports
│   ├── cli/
│   │   ├── mod.rs
│   │   ├── args.rs                  # Command line argument parsing
│   │   └── invocation.rs            # Detect shell vs CLI mode
│   ├── shell/                       # Rust shell engine
│   │   ├── mod.rs
│   │   ├── shell.rs                 # Main GeminiShell struct
│   │   ├── parser/
│   │   │   ├── mod.rs
│   │   │   ├── lexer.rs             # Tokenization
│   │   │   ├── parser.rs            # AST generation
│   │   │   └── ast.rs               # AST types
│   │   ├── executor/
│   │   │   ├── mod.rs
│   │   │   ├── executor.rs          # Command execution
│   │   │   ├── pipeline.rs          # Pipeline handling
│   │   │   ├── redirection.rs       # I/O redirection
│   │   │   └── job_control.rs       # Background jobs
│   │   ├── environment/
│   │   │   ├── mod.rs
│   │   │   ├── environment.rs       # Shell environment
│   │   │   ├── variables.rs         # Variable expansion
│   │   │   ├── aliases.rs           # Command aliases
│   │   │   └── persistence.rs       # State persistence
│   │   ├── builtins/                # Built-in commands
│   │   │   ├── mod.rs
│   │   │   ├── cd.rs
│   │   │   ├── pwd.rs
│   │   │   ├── export.rs
│   │   │   ├── jobs.rs
│   │   │   ├── history.rs
│   │   │   ├── echo.rs
│   │   │   ├── exit.rs
│   │   │   └── alias.rs
│   │   └── types.rs                 # Shell type definitions
│   ├── gemini/                      # Gemini integration
│   │   ├── mod.rs
│   │   ├── client.rs                # HTTP/WS client to Node service
│   │   ├── router.rs                # Command routing logic
│   │   ├── response.rs              # Response handling
│   │   ├── stream.rs                # Streaming support
│   │   └── types.rs                 # Gemini integration types
│   ├── ui/                          # Terminal interface
│   │   ├── mod.rs
│   │   ├── shell_ui.rs              # Main UI controller
│   │   ├── components/
│   │   │   ├── mod.rs
│   │   │   ├── prompt.rs            # Shell prompt
│   │   │   ├── output.rs            # Command output display
│   │   │   ├── collapsible.rs       # Collapsible Gemini responses
│   │   │   ├── history.rs           # Command history display
│   │   │   └── status.rs            # Status bar
│   │   ├── events/
│   │   │   ├── mod.rs
│   │   │   ├── keyboard.rs          # Keyboard event handling
│   │   │   └── resize.rs            # Terminal resize handling
│   │   └── utils/
│   │       ├── mod.rs
│   │       ├── formatting.rs        # Text formatting
│   │       └── colors.rs            # Color schemes
│   ├── bridge/                      # Node.js bridge
│   │   ├── mod.rs
│   │   ├── service.rs               # Node service management
│   │   ├── protocol.rs              # Communication protocol
│   │   └── lifecycle.rs             # Service lifecycle
│   ├── config/
│   │   ├── mod.rs
│   │   ├── config.rs                # Shell configuration
│   │   └── defaults.rs              # Default settings
│   └── utils/
│       ├── mod.rs
│       ├── errors.rs                # Error handling
│       ├── logging.rs               # Logging utilities
│       └── platform.rs              # Platform-specific code
├── gemini-service/                  # Node.js service
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── server.ts                # HTTP/WebSocket server
│   │   ├── gemini-handler.ts        # Gemini core integration
│   │   ├── config.ts                # Configuration loading
│   │   ├── auth.ts                  # Authentication handling
│   │   └── types.ts                 # Type definitions
│   └── dist/                        # Compiled JavaScript
├── tests/
│   ├── unit/
│   │   ├── shell/
│   │   ├── gemini/
│   │   └── ui/
│   ├── integration/
│   │   ├── shell_commands.rs
│   │   ├── gemini_integration.rs
│   │   └── end_to_end.rs
│   └── fixtures/
│       ├── test_commands.sh
│       └── mock_responses.json
├── scripts/
│   ├── build.sh
│   ├── test.sh
│   ├── package.sh
│   └── dev.sh
└── docs/
    ├── architecture.md
    ├── user-guide.md
    ├── api-reference.md
    └── development.md
```

## Core Components

### 1. Rust Shell Engine (`src/shell/`)

**Purpose**: High-performance POSIX-compliant shell implementation

**Key Structures**:
```rust
// src/shell/shell.rs
pub struct GeminiShell {
    environment: Environment,
    parser: ShellParser,
    executor: ShellExecutor,
    gemini_client: GeminiClient,
    ui: ShellUI,
}

impl GeminiShell {
    pub async fn new() -> Result<Self>;
    pub async fn run(&mut self) -> Result<()>;
    pub async fn execute_command(&mut self, input: &str) -> Result<CommandResult>;
    pub async fn execute_gemini_query(&mut self, query: &str) -> Result<GeminiResponse>;
}

// src/shell/executor/executor.rs
pub struct ShellExecutor {
    job_control: JobController,
    builtins: HashMap<String, Box<dyn Builtin>>,
}

impl ShellExecutor {
    pub async fn execute(&mut self, command: &ParsedCommand) -> Result<ExecutionResult>;
    pub async fn execute_pipeline(&mut self, commands: &[ParsedCommand]) -> Result<ExecutionResult>;
    pub async fn execute_background(&mut self, command: &ParsedCommand) -> Result<Job>;
}

// src/shell/environment/environment.rs
pub struct Environment {
    variables: HashMap<String, String>,
    aliases: HashMap<String, String>,
    gemini_history: Vec<GeminiResponse>,
    current_dir: PathBuf,
    last_exit_code: i32,
}

impl Environment {
    pub fn expand_variables(&self, input: &str) -> String;
    pub fn get_last_gemini_response(&self) -> Option<&str>;
    pub fn add_gemini_response(&mut self, response: GeminiResponse);
}
```

**Features**:
- POSIX-compliant command parsing with pest grammar
- Async command execution with tokio
- Full job control with process groups
- Variable expansion ($VAR, ${VAR}, special variables)
- Built-in commands implemented as traits
- Cross-platform process management
- Persistent state with serde serialization

### 2. Gemini Integration (`src/gemini/`)

**Purpose**: Bridge between Rust shell and Node.js Gemini service

**Key Structures**:
```rust
// src/gemini/client.rs
pub struct GeminiClient {
    http: reqwest::Client,
    ws: Option<tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>>,
    service_url: String,
    service_process: Option<tokio::process::Child>,
}

impl GeminiClient {
    pub async fn new() -> Result<Self>;
    pub async fn query(&self, prompt: &str) -> Result<String>;
    pub async fn stream_query(&self, prompt: &str) -> Result<impl Stream<Item = Result<String>>>;
    pub async fn analyze_command(&self, command: &str, output: &str) -> Result<String>;
}

// src/gemini/router.rs
pub struct CommandRouter {
    patterns: GeminiPatterns,
}

impl CommandRouter {
    pub fn route(&self, input: &str) -> CommandRoute;
    pub fn is_gemini_query(&self, input: &str) -> bool;
    pub fn is_shell_command(&self, input: &str) -> bool;
    pub fn detect_natural_language(&self, input: &str) -> bool;
}

#[derive(Debug, Clone)]
pub enum CommandRoute {
    Shell(String),
    Gemini(String),
    Analysis { command: String, query: String },
    NaturalLanguage(String),
}

// src/gemini/response.rs
pub struct ResponseHandler {
    history: Vec<GeminiResponse>,
    current_response: Option<String>,
}

impl ResponseHandler {
    pub fn store_response(&mut self, response: GeminiResponse);
    pub fn get_last_response(&self) -> Option<&str>;
    pub fn expand_response_pipe(&self, command: &str) -> String; // Handle %% syntax
    pub fn format_collapsible(&self, response: &GeminiResponse) -> String;
}
```

**Communication Protocol**:
- HTTP REST API for simple queries
- WebSocket for streaming responses
- JSON message format for all communication
- Automatic service lifecycle management

### 3. Terminal UI (`src/ui/`)

**Purpose**: High-performance terminal interface with collapsible responses

**Key Structures**:
```rust
// src/ui/shell_ui.rs
pub struct ShellUI {
    terminal: ratatui::Terminal<CrosstermBackend<std::io::Stdout>>,
    state: UIState,
    event_handler: EventHandler,
}

impl ShellUI {
    pub fn new() -> Result<Self>;
    pub async fn run(&mut self, shell: &mut GeminiShell) -> Result<()>;
    pub fn render(&mut self, state: &UIState) -> Result<()>;
    pub fn handle_input(&mut self, input: &str) -> UIAction;
}

// src/ui/components/collapsible.rs
pub struct CollapsibleResponse {
    id: String,
    content: String,
    is_collapsed: bool,
    border_style: BorderStyle,
}

impl CollapsibleResponse {
    pub fn new(content: String) -> Self;
    pub fn toggle(&mut self);
    pub fn render(&self, area: Rect, buf: &mut Buffer);
}

// src/ui/events/keyboard.rs
pub struct KeyboardHandler {
    bindings: HashMap<KeyEvent, UIAction>,
}

impl KeyboardHandler {
    pub fn new() -> Self;
    pub fn handle_key(&self, key: KeyEvent) -> Option<UIAction>;
    pub fn add_binding(&mut self, key: KeyEvent, action: UIAction);
}

#[derive(Debug, Clone)]
pub enum UIAction {
    ExecuteCommand(String),
    ToggleAllResponses,
    ToggleResponse(String),
    ClearResponses,
    Exit,
    // ... other actions
}
```

**UI Features**:
- Real-time command execution with async updates
- Collapsible Gemini responses with visual borders
- Shell-style prompt with current directory and git status
- Command history with fuzzy search
- Keyboard shortcuts (Ctrl+O, Tab, arrows)
- Responsive layout with automatic resizing

### 4. Node.js Gemini Service (`gemini-service/`)

**Purpose**: Lightweight service wrapping the Gemini core package

**Key Components**:
```typescript
// src/server.ts
export class GeminiService {
  private app: express.Application;
  private server: http.Server;
  private wss: WebSocketServer;
  private chat: GeminiChat;
  private config: Config;

  async start(port: number = 0): Promise<number>;
  private setupRoutes(): void;
  private setupWebSocket(): void;
  async stop(): Promise<void>;
}

// src/gemini-handler.ts
export class GeminiHandler {
  constructor(private chat: GeminiChat) {}

  async handleQuery(prompt: string): Promise<QueryResponse>;
  async handleStreamQuery(prompt: string): AsyncGenerator<string>;
  async handleAnalysis(command: string, output: string, query?: string): Promise<AnalysisResponse>;
  async handleConfig(): Promise<ConfigResponse>;
}

// src/types.ts
export interface QueryRequest {
  prompt: string;
  context?: string;
}

export interface QueryResponse {
  text: string;
  usage?: UsageMetadata;
}

export interface AnalysisRequest {
  command: string;
  output: string;
  query?: string;
}

export interface AnalysisResponse {
  analysis: string;
  suggestions?: string[];
}
```

**API Endpoints**:
- `POST /api/query` - Simple text queries
- `POST /api/analyze` - Command analysis
- `GET /api/config` - Configuration info
- `WS /ws` - Streaming queries and responses

## Dependencies

### Rust Dependencies (Cargo.toml)
```toml
[dependencies]
# Async runtime
tokio = { version = "1.0", features = ["full"] }
futures = "0.3"

# HTTP/WebSocket client
reqwest = { version = "0.11", features = ["json", "stream"] }
tokio-tungstenite = "0.20"

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
toml = "0.8"

# Terminal UI
crossterm = "0.27"
ratatui = "0.24"

# CLI argument parsing
clap = { version = "4.0", features = ["derive"] }

# Shell parsing
pest = "2.7"
pest_derive = "2.7"
shell-words = "1.1"

# Error handling
anyhow = "1.0"
thiserror = "1.0"

# Logging
tracing = "0.1"
tracing-subscriber = "0.3"

# Process management
nix = "0.27" # Unix-specific
winapi = "0.3" # Windows-specific

# File system operations
dirs = "5.0"
walkdir = "2.4"

# String utilities
regex = "1.10"
unicode-width = "0.1"

[dev-dependencies]
tokio-test = "0.4"
tempfile = "3.8"
```

### Node.js Service Dependencies
```json
{
  "dependencies": {
    "@google/gemini-cli-core": "^1.0.0",
    "express": "^4.18.0",
    "ws": "^8.14.0",
    "cors": "^2.8.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/express": "^4.17.0",
    "@types/ws": "^8.5.0"
  }
}
```

## Communication Protocol

### HTTP API
```typescript
// Query endpoint
POST /api/query
{
  "prompt": "explain this error",
  "context": "optional context"
}

Response:
{
  "text": "This error occurs because...",
  "usage": { "totalTokens": 150 }
}

// Analysis endpoint  
POST /api/analyze
{
  "command": "ls -la",
  "output": "total 48\ndrwxr-xr-x...",
  "query": "what does this output mean?"
}

Response:
{
  "analysis": "This shows directory contents...",
  "suggestions": ["Try ls -lh for human readable sizes"]
}
```

### WebSocket Protocol
```typescript
// Client -> Server
{
  "type": "stream_query",
  "id": "query-123",
  "prompt": "explain async/await in rust"
}

// Server -> Client (streaming)
{
  "type": "chunk",
  "id": "query-123", 
  "data": "Async/await in Rust..."
}

{
  "type": "done",
  "id": "query-123"
}
```

## Implementation Examples

### Shell Command Execution
```rust
// Rust shell command
let result = shell.execute_command("ls -la | grep rust").await?;
println!("{}", result.output);

// With Gemini analysis
let result = shell.execute_command("_ cargo build").await?;
if let Some(analysis) = result.gemini_analysis {
    ui.display_collapsible_response(&analysis);
}
```

### Gemini Integration
```rust
// Explicit query
let response = shell.execute_gemini_query("g how do I fix this error").await?;
ui.display_response(&response);

// Natural language detection
let input = "what files are in this directory";
match router.route(input) {
    CommandRoute::NaturalLanguage(query) => {
        let response = gemini_client.query(&query).await?;
        ui.display_response(&response);
    }
    _ => {}
}

// Response piping
shell.execute_command("echo %% > output.txt").await?; // Uses last Gemini response
```

### UI Interaction
```rust
// Collapsible responses
let response = CollapsibleResponse::new(gemini_text);
ui.add_response(response);

// Keyboard shortcuts
match event {
    KeyEvent { code: KeyCode::Char('o'), modifiers: KeyModifiers::CONTROL } => {
        ui.toggle_all_responses();
    }
    KeyEvent { code: KeyCode::Tab, .. } => {
        ui.toggle_focused_response();
    }
    _ => {}
}
```

## Performance Advantages

### Rust Benefits
1. **Speed**: 10-100x faster command parsing and execution
2. **Memory**: Zero-cost abstractions, no garbage collection
3. **Concurrency**: Excellent async support with tokio
4. **Safety**: Memory safety without runtime overhead
5. **Binary Size**: Single statically-linked executable

### Benchmarks (Estimated)
- Command parsing: ~0.1ms vs ~10ms (TypeScript)
- Pipeline execution: ~1ms vs ~50ms (TypeScript)  
- Memory usage: ~5MB vs ~50MB (Node.js)
- Startup time: ~10ms vs ~200ms (Node.js)

## Migration Strategy

### Phase 1: Core Shell (Week 1)
- Set up Rust project structure
- Implement basic shell parsing with pest
- Create command executor with tokio
- Build terminal UI with crossterm/ratatui
- Port built-in commands from TypeScript

### Phase 2: Node.js Service (Week 2)
- Create minimal Express server
- Wrap existing Gemini core functionality
- Implement HTTP API endpoints
- Add WebSocket streaming support
- Test integration with authentication

### Phase 3: Bridge Integration (Week 3)
- Implement HTTP client in Rust
- Add command routing logic from TypeScript
- Create response handling and %% piping
- Build service lifecycle management
- Port command router logic

### Phase 4: UI Polish (Week 4)
- Implement collapsible responses in Rust
- Add keyboard shortcuts and history
- Port remaining UI features from TypeScript
- Performance optimization and testing
- Package for distribution

## Success Metrics

### Performance Metrics
- [ ] **Command Execution**: <1ms for simple commands
- [ ] **Parsing Speed**: <0.1ms for complex pipelines  
- [ ] **Memory Usage**: <10MB total memory footprint
- [ ] **Startup Time**: <50ms cold start

### Feature Parity
- [ ] **POSIX Compliance**: All current shell features working
- [ ] **Gemini Integration**: Full AI query and analysis support
- [ ] **UI Features**: Collapsible responses, keyboard shortcuts
- [ ] **Configuration**: All current config options supported

### Quality Metrics
- [ ] **Test Coverage**: >90% code coverage
- [ ] **Cross-platform**: Works on macOS, Linux, Windows
- [ ] **Error Handling**: Graceful error recovery
- [ ] **Documentation**: Complete user and developer docs

This architecture provides a high-performance, memory-safe shell implementation while maintaining full compatibility with the existing Gemini AI infrastructure.