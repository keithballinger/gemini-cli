//! Clean shell interface with enhanced features but readable output

use crate::shell::GeminiShell;
use crate::gemini::CommandRoute;
use anyhow::Result;
use std::io::{self, Write};

/// Clean enhanced shell with better output handling
pub struct CleanShell {
    shell: GeminiShell,
    history: Vec<String>,
    aliases: std::collections::HashMap<String, String>,
}

impl CleanShell {
    pub fn new(shell: GeminiShell) -> Self {
        Self {
            shell,
            history: Vec::new(),
            aliases: std::collections::HashMap::new(),
        }
    }

    pub async fn run(&mut self) -> Result<()> {
        self.print_welcome();
        
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
        
        println!("\nEnhanced features:");
        println!("  • Type 'history' to see command history");
        println!("  • Type 'alias' to manage aliases");
        println!("  • Use '!!' for last command, '!n' for history item n");
        println!("  • Tab completion available in some terminals");
        println!();
        
        // Main loop
        loop {
            // Display prompt
            let prompt = self.get_prompt();
            print!("{}", prompt);
            io::stdout().flush()?;
            
            // Read input
            let mut input = String::new();
            match io::stdin().read_line(&mut input) {
                Ok(0) => break, // EOF
                Ok(_) => {
                    let input = input.trim();
                    if input.is_empty() {
                        continue;
                    }
                    
                    // Handle history expansion
                    let expanded = self.expand_history(input);
                    
                    // Handle aliases
                    let command = self.expand_aliases(&expanded);
                    
                    // Execute command
                    if self.execute_command(&command).await? {
                        break;
                    }
                }
                Err(e) => {
                    eprintln!("Error reading input: {}", e);
                    break;
                }
            }
        }
        
        println!("\nGoodbye!");
        Ok(())
    }

    /// Print welcome message
    fn print_welcome(&self) {
        println!("🚀 Gemini Shell - Clean Enhanced UI");
        println!("Type 'help' for commands, 'exit' to quit");
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
        
        // Use simple ANSI codes for coloring
        format!("\x1b[90m{} ✦ \x1b[0m", display_path)
    }

    /// Expand history references
    fn expand_history(&self, input: &str) -> String {
        if input == "!!" {
            // Last command
            self.history.last().cloned().unwrap_or_default()
        } else if input.starts_with('!') && input.len() > 1 {
            // History by number
            if let Ok(n) = input[1..].parse::<usize>() {
                if n > 0 && n <= self.history.len() {
                    self.history[n - 1].clone()
                } else {
                    input.to_string()
                }
            } else {
                input.to_string()
            }
        } else {
            input.to_string()
        }
    }

    /// Expand aliases
    fn expand_aliases(&self, input: &str) -> String {
        let parts: Vec<&str> = input.split_whitespace().collect();
        if parts.is_empty() {
            return input.to_string();
        }
        
        if let Some(expansion) = self.aliases.get(parts[0]) {
            let mut result = expansion.clone();
            if parts.len() > 1 {
                result.push(' ');
                result.push_str(&parts[1..].join(" "));
            }
            result
        } else {
            input.to_string()
        }
    }

    /// Execute a command
    async fn execute_command(&mut self, command: &str) -> Result<bool> {
        // Handle built-in commands
        match command {
            "exit" => return Ok(true),
            "history" => {
                self.show_history();
                return Ok(false);
            }
            cmd if cmd.starts_with("alias ") => {
                self.handle_alias(cmd);
                return Ok(false);
            }
            _ => {}
        }
        
        // Add to history
        self.history.push(command.to_string());
        
        // Execute through shell
        match self.shell.execute(command).await {
            Ok(result) => {
                // Determine if this is a Gemini command
                let route = crate::gemini::CommandRouter::new().route(command);
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
                        eprintln!("\x1b[31m{}\x1b[0m", result.stderr);
                    }
                }
            }
            Err(e) => {
                if e.to_string().contains("Shell exit requested") {
                    return Ok(true);
                }
                eprintln!("\x1b[31mError: {}\x1b[0m", e);
            }
        }
        
        Ok(false)
    }

    /// Show command history
    fn show_history(&self) {
        if self.history.is_empty() {
            println!("No commands in history");
            return;
        }
        
        println!("\x1b[36m=== Command History ===\x1b[0m");
        for (i, cmd) in self.history.iter().enumerate() {
            println!("{:4} {}", i + 1, cmd);
        }
        println!("\x1b[90mUse !n to execute command n, or !! for the last command\x1b[0m");
    }

    /// Handle alias command
    fn handle_alias(&mut self, command: &str) {
        let parts: Vec<&str> = command.splitn(3, ' ').collect();
        
        if parts.len() == 1 || (parts.len() == 2 && parts[1].is_empty()) {
            // Show all aliases
            if self.aliases.is_empty() {
                println!("No aliases defined");
            } else {
                println!("\x1b[36m=== Aliases ===\x1b[0m");
                for (name, value) in &self.aliases {
                    println!("{}='{}'", name, value);
                }
            }
        } else if parts.len() == 2 {
            // Show specific alias
            let name = parts[1];
            if let Some(value) = self.aliases.get(name) {
                println!("{}='{}'", name, value);
            } else {
                println!("Alias '{}' not found", name);
            }
        } else if parts.len() == 3 {
            // Set alias
            let name = parts[1];
            let value = parts[2];
            
            if value.starts_with("='") && value.ends_with('\'') && value.len() > 2 {
                // Handle alias name='value' format
                let actual_value = &value[2..value.len()-1];
                self.aliases.insert(name.to_string(), actual_value.to_string());
                println!("Alias set: {}='{}'", name, actual_value);
            } else if name.contains('=') {
                // Handle alias name=value format
                let parts: Vec<&str> = name.splitn(2, '=').collect();
                if parts.len() == 2 {
                    self.aliases.insert(parts[0].to_string(), parts[1].to_string());
                    println!("Alias set: {}='{}'", parts[0], parts[1]);
                }
            } else {
                println!("Usage: alias name='value' or alias name=value");
            }
        }
    }

    /// Display a Gemini response with clean formatting
    fn display_gemini_response(&self, response: &str) {
        println!();
        println!("\x1b[36m╭─────────────────────────────────────────────────────────────────────────────╮");
        println!("│ ✦ Gemini                                                                    │");
        println!("├─────────────────────────────────────────────────────────────────────────────┤\x1b[0m");
        
        // Display response content with word wrapping
        for line in response.lines() {
            self.print_wrapped_line(line, 75);
        }
        
        println!("\x1b[36m╰─────────────────────────────────────────────────────────────────────────────╯\x1b[0m");
        println!();
    }

    /// Print a line with word wrapping
    fn print_wrapped_line(&self, line: &str, max_width: usize) {
        if line.len() <= max_width {
            print!("\x1b[36m│ \x1b[0m");
            print!("{}", line);
            
            // Pad to box width
            for _ in line.len()..max_width {
                print!(" ");
            }
            
            println!(" \x1b[36m│\x1b[0m");
        } else {
            // Word wrap
            let words: Vec<&str> = line.split_whitespace().collect();
            let mut current_line = String::new();
            
            for word in words {
                if current_line.is_empty() {
                    current_line = word.to_string();
                } else if current_line.len() + 1 + word.len() <= max_width {
                    current_line.push(' ');
                    current_line.push_str(word);
                } else {
                    // Print current line and start new one
                    self.print_wrapped_line(&current_line, max_width);
                    current_line = word.to_string();
                }
            }
            
            // Print last line
            if !current_line.is_empty() {
                self.print_wrapped_line(&current_line, max_width);
            }
        }
    }
}