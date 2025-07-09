//! Simple shell interface that matches the TypeScript UI exactly

use crate::shell::GeminiShell;
use crate::gemini::CommandRoute;
use anyhow::Result;
use std::io::{self, Write};

/// Simple shell interface matching TypeScript implementation
pub struct SimpleShell {
    shell: GeminiShell,
}

impl SimpleShell {
    pub fn new(shell: GeminiShell) -> Self {
        Self { shell }
    }

    pub async fn run(&mut self) -> Result<()> {
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
            // Display prompt with diamond
            let prompt = self.get_prompt();
            print!("\x1b[38;5;8m{}\x1b[0m", prompt);
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
                    
                    // Execute command
                    match self.shell.execute(input).await {
                        Ok(result) => {
                            // Determine if this is a Gemini command
                            let route = crate::gemini::CommandRouter::new().route(input);
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
                            
                            // Handle exit command
                            if input == "exit" || input.starts_with("exit ") {
                                break;
                            }
                        }
                        Err(e) => {
                            if e.to_string().contains("Shell exit requested") {
                                break;
                            }
                            eprintln!("\x1b[31mError: {}\x1b[0m", e);
                        }
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

    /// Display a Gemini response with collapsible UI
    fn display_gemini_response(&self, response: &str) {
        println!();
        
        // Box drawing characters for a nice border
        println!("\x1b[36m╭─────────────────────────────────────────────────────────────────────────────╮");
        println!("│ ✦ Gemini                                                                    │");
        println!("├─────────────────────────────────────────────────────────────────────────────┤\x1b[0m");
        
        // Display response content
        for line in response.lines() {
            print!("\x1b[36m│ \x1b[0m");
            
            // Handle long lines by wrapping
            let max_width = 75;
            if line.len() <= max_width {
                print!("{}", line);
                // Pad to box width
                for _ in line.len()..max_width {
                    print!(" ");
                }
            } else {
                // Simple word wrapping
                let mut remaining = line;
                let mut first = true;
                while !remaining.is_empty() {
                    if !first {
                        print!("\x1b[36m│ \x1b[0m");
                    }
                    first = false;
                    
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
                    
                    print!("{}", chunk);
                    // Pad to box width
                    for _ in chunk.len()..max_width {
                        print!(" ");
                    }
                    println!(" \x1b[36m│\x1b[0m");
                }
                continue;
            }
            
            println!(" \x1b[36m│\x1b[0m");
        }
        
        println!("\x1b[36m├─────────────────────────────────────────────────────────────────────────────┤");
        println!("\x1b[38;5;8m│ Press Ctrl+O in enhanced UI mode to minimize                               │\x1b[0m");
        println!("\x1b[36m╰─────────────────────────────────────────────────────────────────────────────╯\x1b[0m");
        println!();
    }
}