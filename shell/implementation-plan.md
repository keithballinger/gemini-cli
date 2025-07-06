# Rust Gemini Shell - Implementation Plan

## Overview

This document outlines the detailed implementation plan for porting the existing TypeScript shell implementation to Rust while maintaining integration with the Node.js Gemini core package.

## Implementation Strategy

### Phase 1: Project Setup & Core Shell Engine (Week 1)

#### 1.1 Project Initialization (Days 1-2)
- [ ] Set up Rust workspace in `shell/` directory
- [ ] Configure Cargo.toml with initial dependencies
- [ ] Set up basic project structure
- [ ] Create development scripts (build, test, dev)
- [ ] Initialize git repository for shell project

**Tasks:**
```bash
# Create Rust project
cd shell/
cargo init --name gemini-shell
mkdir -p src/{cli,shell,gemini,ui,bridge,config,utils}
mkdir -p gemini-service/src
mkdir -p tests/{unit,integration,fixtures}
mkdir -p docs scripts
```

**Deliverables:**
- Compiling Rust project with basic CLI
- TypeScript service project setup
- Development environment configured

#### 1.2 Shell Parser Implementation (Days 2-4)
Port from: `packages/core/src/shell/parser/` → `src/shell/parser/`

**TypeScript Source Files:**
- `shSyntaxParser.ts` → `parser.rs`
- `types.ts` → `ast.rs`

**Tasks:**
- [ ] Define AST types in Rust
- [ ] Create pest grammar file for POSIX shell syntax
- [ ] Implement lexer for tokenization
- [ ] Build parser with pest_derive
- [ ] Add comprehensive parser tests

**Key Structures to Port:**
```rust
// From TypeScript ParsedCommand interface
#[derive(Debug, Clone)]
pub struct ParsedCommand {
    pub command_type: CommandType,
    pub executable: Option<String>,
    pub args: Vec<String>,
    pub redirections: Vec<Redirection>,
    pub background: bool,
}

#[derive(Debug, Clone)]
pub enum CommandType {
    Simple,
    Pipeline(Vec<ParsedCommand>),
    Compound { operator: CompoundOperator, left: Box<ParsedCommand>, right: Box<ParsedCommand> },
    Builtin,
}
```

**Testing:**
- Unit tests for parser with complex command examples
- Integration tests with real shell syntax
- Performance benchmarks vs TypeScript parser

#### 1.3 Command Executor (Days 4-6)
Port from: `packages/core/src/shell/executor.ts` → `src/shell/executor/`

**TypeScript Source Files:**
- `executor.ts` → `executor.rs`
- `pipelineExecutor.ts` → `pipeline.rs`
- `jobControl.ts` → `job_control.rs`

**Tasks:**
- [ ] Implement basic command execution with tokio::process
- [ ] Add pipeline execution with proper pipe setup
- [ ] Create job control with process groups
- [ ] Handle I/O redirection
- [ ] Implement background process management

**Key Components:**
```rust
pub struct ShellExecutor {
    job_controller: JobController,
    builtins: HashMap<String, Box<dyn Builtin>>,
    environment: Arc<Mutex<Environment>>,
}

impl ShellExecutor {
    pub async fn execute(&mut self, command: &ParsedCommand) -> Result<ExecutionResult>;
    pub async fn execute_pipeline(&mut self, commands: &[ParsedCommand]) -> Result<ExecutionResult>;
    pub async fn spawn_background(&mut self, command: &ParsedCommand) -> Result<Job>;
}
```

#### 1.4 Shell Environment (Days 6-7)
Port from: `packages/core/src/shell/environment.ts` → `src/shell/environment/`

**TypeScript Source Files:**
- `environment.ts` → `environment.rs`
- `expansion.ts` → `variables.rs`
- `persistence.ts` → `persistence.rs`

**Tasks:**
- [ ] Implement environment variable management
- [ ] Add variable expansion ($VAR, ${VAR})
- [ ] Create alias system
- [ ] Build state persistence with serde
- [ ] Handle special variables ($?, $$, etc.)

### Phase 2: Built-in Commands & Node.js Service (Week 2)

#### 2.1 Built-in Commands (Days 8-10)
Port from: `packages/core/src/shell/builtins/` → `src/shell/builtins/`

**Commands to Port:**
- [ ] `cd.ts` → `cd.rs`
- [ ] `pwd.ts` → `pwd.rs`
- [ ] `export.ts` → `export.rs`
- [ ] `jobs.ts` → `jobs.rs`
- [ ] `history.ts` → `history.rs`
- [ ] `echo.ts` → `echo.rs`
- [ ] `alias.ts` → `alias.rs`
- [ ] `exit.ts` → `exit.rs`

**Builtin Trait Design:**
```rust
#[async_trait]
pub trait Builtin: Send + Sync {
    fn name(&self) -> &str;
    async fn execute(&self, args: &[String], env: &mut Environment) -> Result<i32>;
    fn help(&self) -> &str;
}

// Example implementation
pub struct CdCommand;

#[async_trait]
impl Builtin for CdCommand {
    fn name(&self) -> &str { "cd" }
    
    async fn execute(&self, args: &[String], env: &mut Environment) -> Result<i32> {
        let dir = args.get(0)
            .map(|s| s.as_str())
            .unwrap_or_else(|| env.get_var("HOME").unwrap_or("/"));
            
        std::env::set_current_dir(dir)?;
        env.set_var("PWD", std::env::current_dir()?.to_string_lossy());
        Ok(0)
    }
}
```

#### 2.2 Node.js Gemini Service (Days 10-12)
Create new: `gemini-service/`

**Service Architecture:**
```typescript
// src/server.ts
export class GeminiService {
  private app: express.Application;
  private chat: GeminiChat;
  private config: Config;
  
  async start(port?: number): Promise<number> {
    // Initialize Gemini core
    this.config = await Config.load();
    this.chat = new GeminiChat(this.config);
    
    // Setup Express server
    this.setupRoutes();
    this.setupWebSocket();
    
    return this.listen(port);
  }
}
```

**API Endpoints:**
- [ ] `POST /api/query` - Simple text queries
- [ ] `POST /api/analyze` - Command analysis  
- [ ] `GET /api/config` - Configuration info
- [ ] `WS /ws` - Streaming queries

#### 2.3 Rust-Node Bridge (Days 12-14)
Create: `src/bridge/` and `src/gemini/`

**Bridge Components:**
- [ ] Service lifecycle management
- [ ] HTTP client implementation
- [ ] WebSocket client for streaming
- [ ] Communication protocol
- [ ] Error handling and recovery

```rust
pub struct GeminiClient {
    http: reqwest::Client,
    service_url: String,
    service_process: Option<tokio::process::Child>,
}

impl GeminiClient {
    pub async fn ensure_service_running(&mut self) -> Result<()> {
        if !self.is_service_healthy().await? {
            self.start_service().await?;
        }
        Ok(())
    }
    
    pub async fn query(&self, prompt: &str) -> Result<String> {
        let response = self.http
            .post(&format!("{}/api/query", self.service_url))
            .json(&QueryRequest { prompt: prompt.to_string() })
            .send()
            .await?;
        
        let result: QueryResponse = response.json().await?;
        Ok(result.text)
    }
}
```

### Phase 3: Command Routing & UI Foundation (Week 3)

#### 3.1 Command Router Implementation (Days 15-17)
Port from: `packages/cli/src/utils/commandRouter.ts` → `src/gemini/router.rs`

**TypeScript Source:**
```typescript
export class CommandRouter {
  route(input: string): RouteResult {
    // Explicit Gemini prefix detection
    if (input.startsWith('g ') || input.startsWith('_ ')) {
      return { type: 'gemini', query: input.slice(2).trim() };
    }
    
    // Shell command validation
    if (this.isValidShellCommand(input)) {
      return { type: 'shell', command: input };
    }
    
    // Natural language detection
    if (this.looksLikeNaturalLanguage(input)) {
      return { type: 'gemini', query: input };
    }
    
    return { type: 'shell', command: input }; // Default to shell
  }
}
```

**Rust Implementation:**
```rust
pub struct CommandRouter {
    gemini_prefixes: Vec<String>,
    shell_commands: HashSet<String>,
    natural_language_patterns: Vec<regex::Regex>,
}

impl CommandRouter {
    pub fn route(&self, input: &str) -> CommandRoute {
        // Check for explicit Gemini prefixes
        for prefix in &self.gemini_prefixes {
            if input.starts_with(prefix) {
                return CommandRoute::Gemini(input[prefix.len()..].trim().to_string());
            }
        }
        
        // Validate as shell command
        if self.is_valid_shell_command(input) {
            return CommandRoute::Shell(input.to_string());
        }
        
        // Detect natural language
        if self.looks_like_natural_language(input) {
            return CommandRoute::NaturalLanguage(input.to_string());
        }
        
        CommandRoute::Shell(input.to_string()) // Default to shell
    }
}
```

#### 3.2 Response Handler (Days 17-19)
Port from: `packages/cli/src/utils/extractPlainText.ts` → `src/gemini/response.rs`

**Features:**
- [ ] Response history management
- [ ] %% expansion for piping responses
- [ ] Response formatting and cleanup
- [ ] Streaming response handling

```rust
pub struct ResponseHandler {
    history: Vec<GeminiResponse>,
    current_response: Option<String>,
}

impl ResponseHandler {
    pub fn expand_response_pipe(&self, command: &str) -> String {
        if let Some(response) = self.get_last_response() {
            command.replace("%%", response)
        } else {
            command.to_string()
        }
    }
    
    pub async fn handle_streaming_response(&mut self, mut stream: impl Stream<Item = Result<String>>) -> Result<String> {
        let mut full_response = String::new();
        
        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            full_response.push_str(&chunk);
            // Emit chunk for real-time display
            self.emit_chunk(&chunk).await?;
        }
        
        self.store_response(GeminiResponse::new(full_response.clone()));
        Ok(full_response)
    }
}
```

#### 3.3 Basic Terminal UI (Days 19-21)
Port from: `packages/cli/src/ui/components/` → `src/ui/`

**UI Components to Port:**
- [ ] `ShellInterface.tsx` → `shell_ui.rs`
- [ ] `InputPrompt.tsx` → `components/prompt.rs`
- [ ] Command output display
- [ ] Basic keyboard handling

**Ratatui Implementation:**
```rust
pub struct ShellUI {
    terminal: Terminal<CrosstermBackend<io::Stdout>>,
    state: UIState,
    event_rx: mpsc::Receiver<UIEvent>,
}

impl ShellUI {
    pub async fn run(&mut self, shell: &mut GeminiShell) -> Result<()> {
        loop {
            self.render()?;
            
            match self.event_rx.recv().await {
                Some(UIEvent::Input(input)) => {
                    let result = shell.execute_command(&input).await?;
                    self.state.add_output(result);
                }
                Some(UIEvent::Quit) => break,
                _ => {}
            }
        }
        Ok(())
    }
    
    fn render(&mut self) -> Result<()> {
        self.terminal.draw(|f| {
            let chunks = Layout::default()
                .direction(Direction::Vertical)
                .constraints([Constraint::Min(0), Constraint::Length(3)])
                .split(f.size());
            
            // Render command history
            self.render_history(f, chunks[0]);
            
            // Render input prompt
            self.render_prompt(f, chunks[1]);
        })?;
        Ok(())
    }
}
```

### Phase 4: Advanced UI & Integration (Week 4)

#### 4.1 Collapsible Response System (Days 22-24)
Port from: `packages/cli/src/ui/components/messages/CollapsibleGeminiResponse.tsx` → `src/ui/components/collapsible.rs`

**Features:**
- [ ] Collapsible response boxes with borders
- [ ] Ctrl+O global toggle functionality
- [ ] Individual response toggle with Tab
- [ ] Response state persistence

```rust
pub struct CollapsibleResponse {
    id: String,
    content: String,
    is_collapsed: bool,
    border_color: Color,
}

impl CollapsibleResponse {
    pub fn render(&self, area: Rect, buf: &mut Buffer) {
        if self.is_collapsed {
            let collapsed_text = "▶ [Gemini analysis available - Ctrl+O to expand]";
            Paragraph::new(collapsed_text)
                .style(Style::default().fg(Color::DarkGray))
                .render(area, buf);
        } else {
            Block::default()
                .borders(Borders::ALL)
                .border_style(Style::default().fg(self.border_color))
                .title("✦ Gemini")
                .render(area, buf);
            
            let inner = area.inner(&Margin { horizontal: 1, vertical: 1 });
            Paragraph::new(self.content.as_str())
                .wrap(Wrap { trim: true })
                .render(inner, buf);
        }
    }
}
```

#### 4.2 Advanced Keyboard Handling (Days 24-26)
Port from: `packages/cli/src/ui/hooks/useKeypress.ts` → `src/ui/events/keyboard.rs`

**Keyboard Features:**
- [ ] Command history navigation (Up/Down arrows)
- [ ] Tab completion for commands and files
- [ ] Ctrl+C signal handling
- [ ] Ctrl+O response toggle
- [ ] Ctrl+Shift+O clear responses

```rust
pub struct KeyboardHandler {
    bindings: HashMap<KeyEvent, UIAction>,
    history: Vec<String>,
    history_index: usize,
}

impl KeyboardHandler {
    pub fn handle_key_event(&mut self, key: KeyEvent) -> Option<UIAction> {
        match key {
            KeyEvent { code: KeyCode::Char('o'), modifiers: KeyModifiers::CONTROL } => {
                Some(UIAction::ToggleAllResponses)
            }
            KeyEvent { code: KeyCode::Char('c'), modifiers: KeyModifiers::CONTROL } => {
                Some(UIAction::CancelCommand)
            }
            KeyEvent { code: KeyCode::Up, .. } => {
                self.history_previous()
            }
            KeyEvent { code: KeyCode::Down, .. } => {
                self.history_next()
            }
            KeyEvent { code: KeyCode::Tab, .. } => {
                Some(UIAction::TabComplete)
            }
            _ => None
        }
    }
}
```

#### 4.3 Main Shell Integration (Days 26-28)
Create: `src/shell/shell.rs` - Main shell controller

**Integration Points:**
```rust
pub struct GeminiShell {
    parser: ShellParser,
    executor: ShellExecutor,
    environment: Environment,
    gemini_client: GeminiClient,
    command_router: CommandRouter,
    response_handler: ResponseHandler,
}

impl GeminiShell {
    pub async fn new() -> Result<Self> {
        let mut gemini_client = GeminiClient::new().await?;
        gemini_client.ensure_service_running().await?;
        
        Ok(Self {
            parser: ShellParser::new(),
            executor: ShellExecutor::new(),
            environment: Environment::load_or_default().await?,
            gemini_client,
            command_router: CommandRouter::new(),
            response_handler: ResponseHandler::new(),
        })
    }
    
    pub async fn execute_command(&mut self, input: &str) -> Result<CommandResult> {
        // Expand %% with last Gemini response
        let expanded_input = self.response_handler.expand_response_pipe(input);
        
        match self.command_router.route(&expanded_input) {
            CommandRoute::Shell(cmd) => {
                let parsed = self.parser.parse(&cmd)?;
                let result = self.executor.execute(&parsed).await?;
                Ok(CommandResult::Shell(result))
            }
            CommandRoute::Gemini(query) => {
                let response = self.gemini_client.query(&query).await?;
                self.response_handler.store_response(GeminiResponse::new(response.clone()));
                Ok(CommandResult::Gemini(response))
            }
            CommandRoute::Analysis { command, query } => {
                let parsed = self.parser.parse(&command)?;
                let result = self.executor.execute(&parsed).await?;
                let analysis = self.gemini_client.analyze_command(&command, &result.output).await?;
                self.response_handler.store_response(GeminiResponse::new(analysis.clone()));
                Ok(CommandResult::WithAnalysis { result, analysis })
            }
            CommandRoute::NaturalLanguage(query) => {
                let response = self.gemini_client.query(&query).await?;
                self.response_handler.store_response(GeminiResponse::new(response.clone()));
                Ok(CommandResult::Gemini(response))
            }
        }
    }
}
```

#### 4.4 Configuration & Polish (Days 28-30)
Port from: `packages/core/src/config/shellConfig.ts` → `src/config/`

**Configuration Features:**
- [ ] Shell behavior settings
- [ ] Gemini integration preferences  
- [ ] UI customization options
- [ ] Keybinding configuration

**Final Integration:**
- [ ] Main entry point (`src/main.rs`)
- [ ] CLI argument parsing
- [ ] Error handling and logging
- [ ] Cross-platform testing
- [ ] Performance optimization

## Port Mapping Reference

### Core Shell Files
```
TypeScript Source                          → Rust Target
─────────────────────────────────────────── ─────────────────────────────────
packages/core/src/shell/
├── shellInterface.ts                      → src/shell/shell.rs
├── parser/shSyntaxParser.ts              → src/shell/parser/parser.rs  
├── executor.ts                           → src/shell/executor/executor.rs
├── pipelineExecutor.ts                   → src/shell/executor/pipeline.rs
├── jobControl.ts                         → src/shell/executor/job_control.rs
├── environment.ts                        → src/shell/environment/environment.rs
├── expansion.ts                          → src/shell/environment/variables.rs
├── persistence.ts                        → src/shell/environment/persistence.rs
├── pathResolver.ts                       → src/shell/utils/path_resolver.rs
├── types.ts                              → src/shell/types.rs
└── builtins/
    ├── cd.ts                             → src/shell/builtins/cd.rs
    ├── pwd.ts                            → src/shell/builtins/pwd.rs
    ├── export.ts                         → src/shell/builtins/export.rs
    ├── jobs.ts                           → src/shell/builtins/jobs.rs
    ├── history.ts                        → src/shell/builtins/history.rs
    ├── echo.ts                           → src/shell/builtins/echo.rs
    ├── alias.ts                          → src/shell/builtins/alias.rs
    └── exit.ts                           → src/shell/builtins/exit.rs
```

### CLI Integration Files  
```
TypeScript Source                          → Rust Target
─────────────────────────────────────────── ─────────────────────────────────
packages/cli/src/utils/
├── commandRouter.ts                      → src/gemini/router.rs
├── invocationDetector.ts                 → src/cli/invocation.rs
└── extractPlainText.ts                   → src/gemini/response.rs

packages/cli/src/ui/components/
├── ShellInterface.tsx                    → src/ui/shell_ui.rs
├── InputPrompt.tsx                       → src/ui/components/prompt.rs
├── CollapsibleGeminiResponse.tsx         → src/ui/components/collapsible.rs
└── ShellWithGeminiStream.tsx             → src/ui/components/stream.rs

packages/cli/src/ui/hooks/
├── useKeypress.ts                        → src/ui/events/keyboard.rs
├── useGeminiShell.ts                     → src/ui/hooks/shell.rs
└── useGeminiStream.ts                    → src/ui/hooks/stream.rs
```

### New Components (Rust-Specific)
```
Component                                   Purpose
─────────────────────────────────────────── ─────────────────────────────────
src/bridge/                                Node.js service management
├── service.rs                             Service lifecycle
├── protocol.rs                            Communication protocol  
└── lifecycle.rs                           Service startup/shutdown

gemini-service/                            Node.js Gemini wrapper service
├── src/server.ts                          Express HTTP server
├── src/gemini-handler.ts                  Core package wrapper
└── src/types.ts                           API type definitions
```

## Testing Strategy

### Unit Tests
- [ ] Shell parser with complex command syntax
- [ ] Command executor with pipelines and redirection
- [ ] Built-in command functionality
- [ ] Environment variable expansion
- [ ] Command routing logic

### Integration Tests  
- [ ] Rust shell ↔ Node.js service communication
- [ ] End-to-end command execution
- [ ] Gemini query and response handling
- [ ] UI interaction scenarios

### Performance Tests
- [ ] Command parsing speed benchmarks
- [ ] Execution overhead measurements  
- [ ] Memory usage profiling
- [ ] Concurrent command handling

## Risk Mitigation

### Technical Risks
1. **Async Integration Complexity**: Use tokio throughout for consistency
2. **Node.js Service Reliability**: Implement health checks and auto-restart
3. **Cross-platform Issues**: Test early on Windows, macOS, Linux
4. **Performance Regressions**: Continuous benchmarking

### Project Risks  
1. **Scope Creep**: Strict adherence to port-only strategy
2. **Integration Bugs**: Comprehensive integration test suite
3. **Timeline Pressure**: Prioritize core functionality first

## Success Criteria

### Week 1 Goals
- [ ] Basic shell commands execute (`ls`, `cd`, `pwd`)
- [ ] Command parsing handles simple and complex syntax
- [ ] Built-in commands work correctly

### Week 2 Goals  
- [ ] Node.js service responds to HTTP requests
- [ ] Rust client can query Gemini service
- [ ] Basic command routing works

### Week 3 Goals
- [ ] Full command routing (g, _, natural language)  
- [ ] Response piping with %% syntax
- [ ] Basic terminal UI displays commands and output

### Week 4 Goals
- [ ] Collapsible Gemini responses  
- [ ] Advanced keyboard shortcuts
- [ ] Feature parity with TypeScript implementation
- [ ] Performance improvements demonstrated

This implementation plan provides a clear roadmap for porting the existing TypeScript shell to Rust while maintaining all functionality and improving performance.