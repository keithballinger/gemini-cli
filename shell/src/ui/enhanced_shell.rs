//! Enhanced shell interface with mouse support and advanced keybindings

use crate::shell::GeminiShell;
use crate::gemini::CommandRoute;
use anyhow::Result;
use std::io::{self, Write};
use crossterm::{
    event::{self, Event, KeyCode, KeyEvent, KeyModifiers, MouseEvent, MouseEventKind},
    execute,
    style::{Color, Print, ResetColor, SetForegroundColor},
    terminal::{self, Clear, ClearType, EnableLineWrap, DisableLineWrap},
    cursor::{MoveTo, MoveToColumn, Show, Hide},
};

/// Enhanced shell with full terminal UI features
pub struct EnhancedShell {
    shell: GeminiShell,
    current_line: String,
    cursor_pos: usize,
    history: Vec<String>,
    history_index: isize,
    search_mode: bool,
    search_query: String,
    search_results: Vec<(usize, String)>,
    search_index: usize,
    clipboard: String,
    mark_pos: Option<usize>,
    mouse_enabled: bool,
    show_completions: bool,
    completions: Vec<String>,
    completion_index: usize,
}

impl EnhancedShell {
    pub fn new(shell: GeminiShell) -> Self {
        Self {
            shell,
            current_line: String::new(),
            cursor_pos: 0,
            history: Vec::new(),
            history_index: -1,
            search_mode: false,
            search_query: String::new(),
            search_results: Vec::new(),
            search_index: 0,
            clipboard: String::new(),
            mark_pos: None,
            mouse_enabled: true,
            show_completions: false,
            completions: Vec::new(),
            completion_index: 0,
        }
    }

    pub async fn run(&mut self) -> Result<()> {
        // Initialize terminal
        terminal::enable_raw_mode()?;
        if self.mouse_enabled {
            execute!(io::stdout(), crossterm::event::EnableMouseCapture)?;
        }
        
        execute!(io::stdout(), Clear(ClearType::All), MoveTo(0, 0))?;
        
        println!("Type 'help' for commands, 'exit' to quit");
        println!("Enhanced UI: Ctrl+R for search, Tab for completion, mouse support enabled");
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
            self.render()?;
            
            if let Ok(should_exit) = self.handle_event().await {
                if should_exit {
                    break;
                }
            }
        }
        
        // Cleanup
        if self.mouse_enabled {
            execute!(io::stdout(), crossterm::event::DisableMouseCapture)?;
        }
        terminal::disable_raw_mode()?;
        
        println!("\nGoodbye!");
        Ok(())
    }

    /// Render the current state
    fn render(&self) -> Result<()> {
        // Clear current line
        execute!(io::stdout(), MoveToColumn(0), Clear(ClearType::CurrentLine))?;
        
        if self.search_mode {
            // Show search interface
            execute!(
                io::stdout(),
                SetForegroundColor(Color::Yellow),
                Print("(reverse-i-search)`"),
                ResetColor,
                Print(&self.search_query),
                Print("': "),
            )?;
            
            if let Some((_, cmd)) = self.search_results.get(self.search_index) {
                print!("{}", cmd);
            }
        } else {
            // Normal prompt
            let prompt = self.get_prompt();
            execute!(
                io::stdout(),
                SetForegroundColor(Color::DarkGrey),
                Print(&prompt),
                ResetColor,
            )?;
            
            // Display current line with mark highlighting
            if let Some(mark) = self.mark_pos {
                let start = mark.min(self.cursor_pos);
                let end = mark.max(self.cursor_pos);
                
                print!("{}", &self.current_line[..start]);
                execute!(
                    io::stdout(),
                    SetForegroundColor(Color::Black),
                    crossterm::style::SetBackgroundColor(Color::White),
                    Print(&self.current_line[start..end]),
                    ResetColor,
                )?;
                print!("{}", &self.current_line[end..]);
            } else {
                print!("{}", self.current_line);
            }
            
            // Show completions if active
            if self.show_completions && !self.completions.is_empty() {
                println!();
                execute!(
                    io::stdout(),
                    SetForegroundColor(Color::DarkGrey),
                    Print("Completions: "),
                    ResetColor,
                )?;
                
                for (i, completion) in self.completions.iter().enumerate() {
                    if i == self.completion_index {
                        execute!(
                            io::stdout(),
                            SetForegroundColor(Color::Green),
                            Print(format!("[{}] ", completion)),
                            ResetColor,
                        )?;
                    } else {
                        print!("{} ", completion);
                    }
                }
            }
            
            // Position cursor
            let cursor_x = prompt.chars().count() + self.cursor_pos;
            execute!(io::stdout(), MoveToColumn(cursor_x as u16))?;
        }
        
        io::stdout().flush()?;
        Ok(())
    }

    /// Get the shell prompt
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

    /// Handle input events
    async fn handle_event(&mut self) -> Result<bool> {
        if event::poll(std::time::Duration::from_millis(100))? {
            match event::read()? {
                Event::Key(key) => return self.handle_key(key).await,
                Event::Mouse(mouse) => self.handle_mouse(mouse),
                _ => {}
            }
        }
        Ok(false)
    }

    /// Handle keyboard input
    async fn handle_key(&mut self, key: KeyEvent) -> Result<bool> {
        // Handle search mode
        if self.search_mode {
            return self.handle_search_key(key).await;
        }
        
        match key {
            // Ctrl+C - Cancel current line or exit
            KeyEvent {
                code: KeyCode::Char('c'),
                modifiers: KeyModifiers::CONTROL,
                ..
            } => {
                if self.current_line.is_empty() {
                    return Ok(true);
                }
                self.current_line.clear();
                self.cursor_pos = 0;
                self.mark_pos = None;
                println!("^C");
            }
            
            // Ctrl+D - Exit if empty
            KeyEvent {
                code: KeyCode::Char('d'),
                modifiers: KeyModifiers::CONTROL,
                ..
            } => {
                if self.current_line.is_empty() {
                    return Ok(true);
                }
            }
            
            // Ctrl+R - Reverse search
            KeyEvent {
                code: KeyCode::Char('r'),
                modifiers: KeyModifiers::CONTROL,
                ..
            } => {
                self.enter_search_mode();
            }
            
            // Ctrl+A - Move to beginning
            KeyEvent {
                code: KeyCode::Char('a'),
                modifiers: KeyModifiers::CONTROL,
                ..
            } => {
                self.cursor_pos = 0;
            }
            
            // Ctrl+E - Move to end
            KeyEvent {
                code: KeyCode::Char('e'),
                modifiers: KeyModifiers::CONTROL,
                ..
            } => {
                self.cursor_pos = self.current_line.len();
            }
            
            // Ctrl+K - Kill to end of line
            KeyEvent {
                code: KeyCode::Char('k'),
                modifiers: KeyModifiers::CONTROL,
                ..
            } => {
                if self.cursor_pos < self.current_line.len() {
                    self.clipboard = self.current_line[self.cursor_pos..].to_string();
                    self.current_line.truncate(self.cursor_pos);
                }
            }
            
            // Ctrl+U - Kill to beginning of line
            KeyEvent {
                code: KeyCode::Char('u'),
                modifiers: KeyModifiers::CONTROL,
                ..
            } => {
                if self.cursor_pos > 0 {
                    self.clipboard = self.current_line[..self.cursor_pos].to_string();
                    self.current_line = self.current_line[self.cursor_pos..].to_string();
                    self.cursor_pos = 0;
                }
            }
            
            // Ctrl+Y - Yank (paste)
            KeyEvent {
                code: KeyCode::Char('y'),
                modifiers: KeyModifiers::CONTROL,
                ..
            } => {
                self.current_line.insert_str(self.cursor_pos, &self.clipboard);
                self.cursor_pos += self.clipboard.len();
            }
            
            // Ctrl+W - Delete word backward
            KeyEvent {
                code: KeyCode::Char('w'),
                modifiers: KeyModifiers::CONTROL,
                ..
            } => {
                if self.cursor_pos > 0 {
                    let start = self.current_line[..self.cursor_pos]
                        .rfind(char::is_whitespace)
                        .map(|i| i + 1)
                        .unwrap_or(0);
                    self.clipboard = self.current_line[start..self.cursor_pos].to_string();
                    self.current_line.replace_range(start..self.cursor_pos, "");
                    self.cursor_pos = start;
                }
            }
            
            // Alt+B - Move word backward
            KeyEvent {
                code: KeyCode::Char('b'),
                modifiers: KeyModifiers::ALT,
                ..
            } => {
                if self.cursor_pos > 0 {
                    self.cursor_pos = self.current_line[..self.cursor_pos]
                        .rfind(char::is_whitespace)
                        .map(|i| i + 1)
                        .unwrap_or(0);
                }
            }
            
            // Alt+F - Move word forward
            KeyEvent {
                code: KeyCode::Char('f'),
                modifiers: KeyModifiers::ALT,
                ..
            } => {
                if self.cursor_pos < self.current_line.len() {
                    self.cursor_pos = self.current_line[self.cursor_pos..]
                        .find(char::is_whitespace)
                        .map(|i| self.cursor_pos + i)
                        .unwrap_or(self.current_line.len());
                }
            }
            
            // Ctrl+Space - Set mark
            KeyEvent {
                code: KeyCode::Char(' '),
                modifiers: KeyModifiers::CONTROL,
                ..
            } => {
                self.mark_pos = Some(self.cursor_pos);
            }
            
            // Tab - Completion
            KeyEvent {
                code: KeyCode::Tab,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                self.handle_completion();
            }
            
            // Enter - Execute
            KeyEvent {
                code: KeyCode::Enter,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                self.show_completions = false;
                self.handle_execute().await?;
            }
            
            // Arrow keys
            KeyEvent {
                code: KeyCode::Up,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                self.history_up();
            }
            
            KeyEvent {
                code: KeyCode::Down,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                self.history_down();
            }
            
            KeyEvent {
                code: KeyCode::Left,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                if self.cursor_pos > 0 {
                    self.cursor_pos -= 1;
                }
            }
            
            KeyEvent {
                code: KeyCode::Right,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                if self.cursor_pos < self.current_line.len() {
                    self.cursor_pos += 1;
                }
            }
            
            // Home/End
            KeyEvent {
                code: KeyCode::Home,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                self.cursor_pos = 0;
            }
            
            KeyEvent {
                code: KeyCode::End,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                self.cursor_pos = self.current_line.len();
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
            
            // Delete
            KeyEvent {
                code: KeyCode::Delete,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                if self.cursor_pos < self.current_line.len() {
                    self.current_line.remove(self.cursor_pos);
                }
            }
            
            // Regular character input
            KeyEvent {
                code: KeyCode::Char(c),
                modifiers: KeyModifiers::NONE | KeyModifiers::SHIFT,
                ..
            } => {
                self.current_line.insert(self.cursor_pos, c);
                self.cursor_pos += 1;
                self.mark_pos = None;
                
                // Update completions if showing
                if self.show_completions {
                    self.update_completions();
                }
            }
            
            _ => {}
        }
        
        Ok(false)
    }

    /// Handle search mode keys
    async fn handle_search_key(&mut self, key: KeyEvent) -> Result<bool> {
        match key {
            // Escape or Ctrl+C - Exit search
            KeyEvent {
                code: KeyCode::Esc,
                ..
            } | KeyEvent {
                code: KeyCode::Char('c'),
                modifiers: KeyModifiers::CONTROL,
                ..
            } => {
                self.exit_search_mode();
            }
            
            // Enter - Accept search result
            KeyEvent {
                code: KeyCode::Enter,
                ..
            } => {
                if let Some((_, cmd)) = self.search_results.get(self.search_index) {
                    self.current_line = cmd.clone();
                    self.cursor_pos = self.current_line.len();
                }
                self.exit_search_mode();
            }
            
            // Ctrl+R - Next search result
            KeyEvent {
                code: KeyCode::Char('r'),
                modifiers: KeyModifiers::CONTROL,
                ..
            } => {
                if !self.search_results.is_empty() {
                    self.search_index = (self.search_index + 1) % self.search_results.len();
                }
            }
            
            // Backspace
            KeyEvent {
                code: KeyCode::Backspace,
                ..
            } => {
                self.search_query.pop();
                self.update_search_results();
            }
            
            // Character input
            KeyEvent {
                code: KeyCode::Char(c),
                modifiers: KeyModifiers::NONE | KeyModifiers::SHIFT,
                ..
            } => {
                self.search_query.push(c);
                self.update_search_results();
            }
            
            _ => {}
        }
        
        Ok(false)
    }

    /// Handle mouse events
    fn handle_mouse(&mut self, mouse: MouseEvent) {
        match mouse.kind {
            MouseEventKind::Down(_) => {
                // Calculate position in line based on mouse click
                let prompt_len = self.get_prompt().chars().count() as u16;
                if mouse.column >= prompt_len {
                    let new_pos = (mouse.column - prompt_len) as usize;
                    if new_pos <= self.current_line.len() {
                        self.cursor_pos = new_pos;
                    }
                }
            }
            MouseEventKind::Drag(_) => {
                // Support text selection with mouse
                let prompt_len = self.get_prompt().chars().count() as u16;
                if mouse.column >= prompt_len {
                    let new_pos = (mouse.column - prompt_len) as usize;
                    if new_pos <= self.current_line.len() {
                        if self.mark_pos.is_none() {
                            self.mark_pos = Some(self.cursor_pos);
                        }
                        self.cursor_pos = new_pos;
                    }
                }
            }
            MouseEventKind::ScrollUp => {
                // Scroll through history
                self.history_up();
            }
            MouseEventKind::ScrollDown => {
                // Scroll through history
                self.history_down();
            }
            _ => {}
        }
    }

    /// Enter search mode
    fn enter_search_mode(&mut self) {
        self.search_mode = true;
        self.search_query.clear();
        self.search_results.clear();
        self.search_index = 0;
    }

    /// Exit search mode
    fn exit_search_mode(&mut self) {
        self.search_mode = false;
        self.search_query.clear();
        self.search_results.clear();
    }

    /// Update search results
    fn update_search_results(&mut self) {
        self.search_results.clear();
        self.search_index = 0;
        
        if self.search_query.is_empty() {
            return;
        }
        
        for (i, cmd) in self.history.iter().enumerate().rev() {
            if cmd.contains(&self.search_query) {
                self.search_results.push((i, cmd.clone()));
            }
        }
    }

    /// Handle tab completion
    fn handle_completion(&mut self) {
        if !self.show_completions {
            self.show_completions = true;
            self.update_completions();
        } else if !self.completions.is_empty() {
            // Cycle through completions
            self.completion_index = (self.completion_index + 1) % self.completions.len();
            
            // Apply current completion
            let completion = &self.completions[self.completion_index];
            let word_start = self.current_line[..self.cursor_pos]
                .rfind(char::is_whitespace)
                .map(|i| i + 1)
                .unwrap_or(0);
            
            self.current_line.replace_range(word_start..self.cursor_pos, completion);
            self.cursor_pos = word_start + completion.len();
        }
    }

    /// Update completion list
    fn update_completions(&mut self) {
        self.completions.clear();
        self.completion_index = 0;
        
        // Get current word
        let word_start = self.current_line[..self.cursor_pos]
            .rfind(char::is_whitespace)
            .map(|i| i + 1)
            .unwrap_or(0);
        let current_word = &self.current_line[word_start..self.cursor_pos];
        
        if current_word.is_empty() {
            self.show_completions = false;
            return;
        }
        
        // Add command completions
        let commands = vec!["ls", "cd", "pwd", "echo", "exit", "help", "history", "alias", "export", "g", "_"];
        for cmd in commands {
            if cmd.starts_with(current_word) {
                self.completions.push(cmd.to_string());
            }
        }
        
        // Add history completions
        for cmd in &self.history {
            if cmd.starts_with(current_word) && !self.completions.contains(cmd) {
                self.completions.push(cmd.clone());
            }
        }
        
        if self.completions.is_empty() {
            self.show_completions = false;
        }
    }

    /// Navigate history up
    fn history_up(&mut self) {
        if self.history.is_empty() {
            return;
        }
        
        if self.history_index < self.history.len() as isize - 1 {
            self.history_index += 1;
            let idx = (self.history.len() as isize - 1 - self.history_index) as usize;
            self.current_line = self.history[idx].clone();
            self.cursor_pos = self.current_line.len();
        }
    }

    /// Navigate history down
    fn history_down(&mut self) {
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

    /// Execute the current command
    async fn handle_execute(&mut self) -> Result<()> {
        let command = self.current_line.trim().to_string();
        if command.is_empty() {
            println!();
            return Ok(());
        }
        
        // Clear the line and show command
        execute!(io::stdout(), MoveToColumn(0), Clear(ClearType::CurrentLine))?;
        let prompt = self.get_prompt();
        
        // Display command
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
        self.mark_pos = None;
        
        // Execute command
        match self.shell.execute(&command).await {
            Ok(result) => {
                // Determine if this is a Gemini command
                let route = crate::gemini::CommandRouter::new().route(&command);
                let is_gemini = matches!(route, CommandRoute::Gemini(_) | CommandRoute::NaturalLanguage(_));
                
                if result.exit_code == 0 {
                    if !result.stdout.is_empty() {
                        if is_gemini {
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
        
        Ok(())
    }

    /// Display a Gemini response
    fn display_gemini_response(&self, response: &str) {
        println!();
        execute!(
            io::stdout(),
            SetForegroundColor(Color::Cyan),
            Print("╭─────────────────────────────────────────────────────────────────────────────╮\n"),
            Print("│ ✦ Gemini                                                                    │\n"),
            Print("├─────────────────────────────────────────────────────────────────────────────┤\n"),
            ResetColor,
        ).unwrap();
        
        // Display response content with wrapping
        for line in response.lines() {
            self.print_wrapped_line(line, 75);
        }
        
        execute!(
            io::stdout(),
            SetForegroundColor(Color::Cyan),
            Print("├─────────────────────────────────────────────────────────────────────────────┤\n"),
            SetForegroundColor(Color::DarkGrey),
            Print("│ Enhanced UI: Ctrl+R search, Tab completion, mouse support                   │\n"),
            SetForegroundColor(Color::Cyan),
            Print("╰─────────────────────────────────────────────────────────────────────────────╯\n"),
            ResetColor,
        ).unwrap();
        println!();
    }

    /// Print a line with word wrapping
    fn print_wrapped_line(&self, line: &str, max_width: usize) {
        if line.len() <= max_width {
            execute!(
                io::stdout(),
                SetForegroundColor(Color::Cyan),
                Print("│ "),
                ResetColor,
                Print(line),
            ).unwrap();
            
            // Pad to box width
            for _ in line.len()..max_width {
                print!(" ");
            }
            
            execute!(
                io::stdout(),
                SetForegroundColor(Color::Cyan),
                Print(" │\n"),
                ResetColor,
            ).unwrap();
        } else {
            // Word wrap
            let mut remaining = line;
            while !remaining.is_empty() {
                let chunk = if remaining.len() <= max_width {
                    let c = remaining;
                    remaining = "";
                    c
                } else {
                    // Find last space before max_width
                    let mut split_pos = max_width;
                    for (i, ch) in remaining[..max_width].char_indices().rev() {
                        if ch.is_whitespace() {
                            split_pos = i;
                            break;
                        }
                    }
                    let (chunk, rest) = remaining.split_at(split_pos);
                    remaining = rest.trim_start();
                    chunk
                };
                
                self.print_wrapped_line(chunk, max_width);
            }
        }
    }
}