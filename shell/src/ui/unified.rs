//! Unified shell UI that matches the TypeScript version exactly

use crate::shell::GeminiShell;
use crate::gemini::CommandRoute;
use anyhow::Result;
use std::io::{self, Write};
use crossterm::{
    event::{self, Event, KeyCode, KeyEvent, KeyModifiers},
    execute,
    style::{Color, Print, ResetColor, SetForegroundColor},
    terminal::{Clear, ClearType},
    cursor::{MoveTo, MoveToColumn},
};

/// Output item for display
#[derive(Clone)]
struct OutputItem {
    id: String,
    output_type: OutputType,
    content: String,
    collapsed: bool,
    cwd: Option<String>,
}

#[derive(Clone, PartialEq)]
enum OutputType {
    Command,
    Output,
    Error,
    Gemini,
}

/// Unified shell interface that matches TypeScript UI
pub struct UnifiedShell {
    shell: GeminiShell,
    current_line: String,
    cursor_pos: usize,
    history: Vec<String>,
    history_index: isize,
    output: Vec<OutputItem>,
    is_executing: bool,
    output_id_counter: usize,
}

impl UnifiedShell {
    pub fn new(shell: GeminiShell) -> Self {
        Self {
            shell,
            current_line: String::new(),
            cursor_pos: 0,
            history: Vec::new(),
            history_index: -1,
            output: Vec::new(),
            is_executing: false,
            output_id_counter: 0,
        }
    }

    pub async fn run(&mut self) -> Result<()> {
        // Initialize terminal
        execute!(io::stdout(), Clear(ClearType::All), MoveTo(0, 0))?;
        
        println!("Type 'help' for commands, 'exit' to quit");
        println!();
        
        // Try to initialize Gemini client
        match crate::gemini::GeminiClient::new().await {
            Ok(client) => {
                self.shell.with_gemini(client).await;
                println!("✅ Gemini AI integration enabled");
            }
            Err(e) => {
                eprintln!("⚠️  Gemini AI not available: {}", e);
                eprintln!("   Shell will work without AI features");
            }
        }
        
        println!();
        
        // Main loop
        loop {
            // Display output and prompt
            self.render()?;
            
            // Handle input
            if let Ok(should_exit) = self.handle_input().await {
                if should_exit {
                    break;
                }
            }
        }
        
        println!("\nGoodbye!");
        Ok(())
    }

    /// Render the current state
    fn render(&self) -> Result<()> {
        // Clear line for prompt
        execute!(io::stdout(), MoveToColumn(0), Clear(ClearType::CurrentLine))?;
        
        // Display prompt with diamond
        let prompt = self.get_prompt();
        execute!(
            io::stdout(),
            SetForegroundColor(Color::DarkGrey),
            Print(&prompt),
            ResetColor,
        )?;
        
        // Display current line
        print!("{}", self.current_line);
        
        // Position cursor
        let cursor_x = prompt.chars().count() + self.cursor_pos;
        execute!(io::stdout(), MoveToColumn(cursor_x as u16))?;
        
        io::stdout().flush()?;
        Ok(())
    }

    /// Get the shell prompt with diamond
    fn get_prompt(&self) -> String {
        let home = std::env::var("HOME").unwrap_or_default();
        let cwd = self.shell.current_dir();
        let display_path = if cwd.starts_with(&home) {
            format!("~{}", &cwd[home.len()..])
        } else {
            cwd.to_string()
        };
        format!("{} ✦ ", display_path)
    }

    /// Handle keyboard input
    async fn handle_input(&mut self) -> Result<bool> {
        // Enable raw mode for single character input
        crossterm::terminal::enable_raw_mode()?;
        
        let result = if event::poll(std::time::Duration::from_millis(100))? {
            if let Event::Key(key) = event::read()? {
                self.handle_key(key).await
            } else {
                Ok(false)
            }
        } else {
            Ok(false)
        };
        
        // Disable raw mode
        crossterm::terminal::disable_raw_mode()?;
        
        result
    }

    /// Handle a key event
    async fn handle_key(&mut self, key: KeyEvent) -> Result<bool> {
        if self.is_executing {
            return Ok(false);
        }
        
        match key {
            // Enter - execute command
            KeyEvent {
                code: KeyCode::Enter,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                self.handle_execute().await?;
            }
            
            // Backspace
            KeyEvent {
                code: KeyCode::Backspace,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                if self.cursor_pos > 0 {
                    self.current_line.remove(self.cursor_pos - 1);
                    self.cursor_pos -= 1;
                }
            }
            
            // Arrow Up - history
            KeyEvent {
                code: KeyCode::Up,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                if self.history_index < self.history.len() as isize - 1 {
                    self.history_index += 1;
                    let idx = (self.history.len() as isize - 1 - self.history_index) as usize;
                    self.current_line = self.history[idx].clone();
                    self.cursor_pos = self.current_line.len();
                }
            }
            
            // Arrow Down - history
            KeyEvent {
                code: KeyCode::Down,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                if self.history_index > 0 {
                    self.history_index -= 1;
                    let idx = (self.history.len() as isize - 1 - self.history_index) as usize;
                    self.current_line = self.history[idx].clone();
                    self.cursor_pos = self.current_line.len();
                } else if self.history_index == 0 {
                    self.history_index = -1;
                    self.current_line.clear();
                    self.cursor_pos = 0;
                }
            }
            
            // Arrow Left
            KeyEvent {
                code: KeyCode::Left,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                if self.cursor_pos > 0 {
                    self.cursor_pos -= 1;
                }
            }
            
            // Arrow Right
            KeyEvent {
                code: KeyCode::Right,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                if self.cursor_pos < self.current_line.len() {
                    self.cursor_pos += 1;
                }
            }
            
            // Ctrl+C - clear line
            KeyEvent {
                code: KeyCode::Char('c'),
                modifiers: KeyModifiers::CONTROL,
                ..
            } => {
                self.current_line.clear();
                self.cursor_pos = 0;
            }
            
            // Ctrl+D - exit if empty
            KeyEvent {
                code: KeyCode::Char('d'),
                modifiers: KeyModifiers::CONTROL,
                ..
            } => {
                if self.current_line.is_empty() {
                    return Ok(true);
                }
            }
            
            // Ctrl+O - toggle last Gemini response
            KeyEvent {
                code: KeyCode::Char('o'),
                modifiers: KeyModifiers::CONTROL,
                ..
            } => {
                self.toggle_last_gemini_response();
            }
            
            // Regular character
            KeyEvent {
                code: KeyCode::Char(c),
                modifiers: KeyModifiers::NONE | KeyModifiers::SHIFT,
                ..
            } => {
                self.current_line.insert(self.cursor_pos, c);
                self.cursor_pos += 1;
            }
            
            _ => {}
        }
        
        Ok(false)
    }

    /// Execute the current command
    async fn handle_execute(&mut self) -> Result<()> {
        let command = self.current_line.trim().to_string();
        if command.is_empty() {
            println!();
            return Ok(());
        }
        
        // Clear the prompt line and show the command
        execute!(io::stdout(), MoveToColumn(0), Clear(ClearType::CurrentLine))?;
        let prompt = self.get_prompt();
        
        // Display command in purple (like TypeScript)
        execute!(
            io::stdout(),
            SetForegroundColor(Color::DarkGrey),
            Print(&prompt),
            SetForegroundColor(Color::Magenta),
            Print(&command),
            ResetColor,
            Print("\n"),
        )?;
        
        // Add to history
        self.history.push(command.clone());
        self.history_index = -1;
        self.current_line.clear();
        self.cursor_pos = 0;
        
        // Add command to output
        let cwd = self.shell.current_dir().to_string();
        self.output.push(OutputItem {
            id: format!("cmd-{}", self.output_id_counter),
            output_type: OutputType::Command,
            content: command.clone(),
            collapsed: false,
            cwd: Some(cwd),
        });
        self.output_id_counter += 1;
        
        self.is_executing = true;
        
        // Execute command
        match self.shell.execute(&command).await {
            Ok(result) => {
                // Determine output type based on the route
                let expanded_input = if let Some(gemini) = self.shell.gemini_client() {
                    command.clone() // Response handler expansion happens inside shell
                } else {
                    command.clone()
                };
                
                let route = crate::gemini::CommandRouter::new().route(&expanded_input);
                let is_gemini = matches!(route, CommandRoute::Gemini(_) | CommandRoute::NaturalLanguage(_));
                
                if result.exit_code == 0 {
                    if !result.stdout.is_empty() {
                        if is_gemini {
                            // Store the response for collapsing
                            let id = format!("gemini-{}", self.output_id_counter);
                            self.output_id_counter += 1;
                            
                            self.output.push(OutputItem {
                                id: id.clone(),
                                output_type: OutputType::Gemini,
                                content: result.stdout.clone(),
                                collapsed: false,
                                cwd: None,
                            });
                            
                            self.display_gemini_response(&result.stdout);
                        } else {
                            print!("{}", result.stdout);
                        }
                    }
                } else {
                    if !result.stderr.is_empty() {
                        execute!(
                            io::stdout(),
                            SetForegroundColor(Color::Red),
                            Print(&result.stderr),
                            ResetColor,
                        )?;
                    }
                }
                
                // Handle exit command
                if command == "exit" || command.starts_with("exit ") {
                    return Ok(());
                }
            }
            Err(e) => {
                if e.to_string().contains("Shell exit requested") {
                    return Ok(());
                }
                execute!(
                    io::stdout(),
                    SetForegroundColor(Color::Red),
                    Print(&format!("Error: {}\n", e)),
                    ResetColor,
                )?;
            }
        }
        
        self.is_executing = false;
        Ok(())
    }

    /// Display a Gemini response with collapsible UI
    fn display_gemini_response(&self, response: &str) {
        
        // Display with cyan border and header (like TypeScript)
        println!();
        execute!(
            io::stdout(),
            SetForegroundColor(Color::Cyan),
            Print("╭─────────────────────────────────────────╮\n"),
            Print("│ ✦ Gemini                               │\n"),
            Print("├─────────────────────────────────────────┤\n"),
            ResetColor,
        ).unwrap();
        
        // Display response content
        for line in response.lines() {
            execute!(
                io::stdout(),
                SetForegroundColor(Color::Cyan),
                Print("│ "),
                ResetColor,
                Print(line),
            ).unwrap();
            
            // Pad to box width
            let padding = 40_usize.saturating_sub(line.len());
            for _ in 0..padding {
                print!(" ");
            }
            
            execute!(
                io::stdout(),
                SetForegroundColor(Color::Cyan),
                Print("│\n"),
                ResetColor,
            ).unwrap();
        }
        
        execute!(
            io::stdout(),
            SetForegroundColor(Color::Cyan),
            Print("├─────────────────────────────────────────┤\n"),
            SetForegroundColor(Color::DarkGrey),
            Print("│ Ctrl+O to minimize                      │\n"),
            SetForegroundColor(Color::Cyan),
            Print("╰─────────────────────────────────────────╯\n"),
            ResetColor,
        ).unwrap();
        println!();
    }

    /// Toggle the last Gemini response between collapsed and expanded
    fn toggle_last_gemini_response(&mut self) {
        // Find last Gemini response
        for item in self.output.iter_mut().rev() {
            if item.output_type == OutputType::Gemini {
                item.collapsed = !item.collapsed;
                
                // Clear screen and redraw
                execute!(io::stdout(), Clear(ClearType::All), MoveTo(0, 0)).unwrap();
                
                // Redraw all output
                for output_item in &self.output {
                    match output_item.output_type {
                        OutputType::Command => {
                            if let Some(cwd) = &output_item.cwd {
                                let home = std::env::var("HOME").unwrap_or_default();
                                let display_path = if cwd.starts_with(&home) {
                                    format!("~{}", &cwd[home.len()..])
                                } else {
                                    cwd.clone()
                                };
                                execute!(
                                    io::stdout(),
                                    SetForegroundColor(Color::DarkGrey),
                                    Print(&format!("{} ✦ ", display_path)),
                                    SetForegroundColor(Color::Magenta),
                                    Print(&output_item.content),
                                    ResetColor,
                                    Print("\n"),
                                ).unwrap();
                            }
                        }
                        OutputType::Gemini => {
                            if output_item.collapsed {
                                execute!(
                                    io::stdout(),
                                    Print("\n"),
                                    SetForegroundColor(Color::DarkGrey),
                                    Print("▶ "),
                                    SetForegroundColor(Color::Cyan),
                                    Print("[Gemini analysis available - Ctrl+O to expand]"),
                                    ResetColor,
                                    Print("\n\n"),
                                ).unwrap();
                            } else {
                                // Display expanded response
                                println!();
                                execute!(
                                    io::stdout(),
                                    SetForegroundColor(Color::Cyan),
                                    Print("╭─────────────────────────────────────────╮\n"),
                                    Print("│ ✦ Gemini                               │\n"),
                                    Print("├─────────────────────────────────────────┤\n"),
                                    ResetColor,
                                ).unwrap();
                                
                                // Display response content
                                for line in output_item.content.lines() {
                                    execute!(
                                        io::stdout(),
                                        SetForegroundColor(Color::Cyan),
                                        Print("│ "),
                                        ResetColor,
                                        Print(line),
                                    ).unwrap();
                                    
                                    // Pad to box width
                                    let padding = 40_usize.saturating_sub(line.len());
                                    for _ in 0..padding {
                                        print!(" ");
                                    }
                                    
                                    execute!(
                                        io::stdout(),
                                        SetForegroundColor(Color::Cyan),
                                        Print("│\n"),
                                        ResetColor,
                                    ).unwrap();
                                }
                                
                                execute!(
                                    io::stdout(),
                                    SetForegroundColor(Color::Cyan),
                                    Print("├─────────────────────────────────────────┤\n"),
                                    SetForegroundColor(Color::DarkGrey),
                                    Print("│ Ctrl+O to minimize                      │\n"),
                                    SetForegroundColor(Color::Cyan),
                                    Print("╰─────────────────────────────────────────╯\n"),
                                    ResetColor,
                                ).unwrap();
                                println!();
                            }
                        }
                        OutputType::Output => {
                            print!("{}", output_item.content);
                        }
                        OutputType::Error => {
                            execute!(
                                io::stdout(),
                                SetForegroundColor(Color::Red),
                                Print(&output_item.content),
                                ResetColor,
                            ).unwrap();
                        }
                    }
                }
                
                break;
            }
        }
    }
}