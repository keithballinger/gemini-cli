//! Command routing logic to determine if input should go to shell or Gemini

use regex::Regex;
use std::collections::HashSet;

use super::CommandRoute;

/// Routes commands between shell execution and Gemini queries
pub struct CommandRouter {
    gemini_prefixes: Vec<String>,
    shell_commands: HashSet<String>,
    natural_language_patterns: Vec<Regex>,
}

impl CommandRouter {
    pub fn new() -> Self {
        let natural_language_patterns = vec![
            Regex::new(r"^(how|what|why|when|where|who)\s").unwrap(),
            Regex::new(r"^(can|could|would|should|will)\s").unwrap(),
            Regex::new(r"^(please|help|explain|show|tell)\s").unwrap(),
            Regex::new(r"\?$").unwrap(), // Ends with question mark
        ];
        
        let shell_commands = [
            "ls", "cd", "pwd", "mkdir", "rmdir", "rm", "cp", "mv", "ln",
            "cat", "less", "more", "head", "tail", "grep", "find", "sort",
            "echo", "printf", "which", "whereis", "whoami", "id", "groups",
            "ps", "top", "kill", "jobs", "bg", "fg", "nohup",
            "chmod", "chown", "chgrp", "umask",
            "tar", "gzip", "gunzip", "zip", "unzip",
            "git", "cargo", "npm", "node", "python", "python3", "java", "gcc",
            "make", "cmake", "curl", "wget", "ssh", "scp", "rsync",
        ].iter().map(|s| s.to_string()).collect();
        
        Self {
            gemini_prefixes: vec!["g ".to_string(), "_ ".to_string(), "? ".to_string()],
            shell_commands,
            natural_language_patterns,
        }
    }
    
    /// Route input to appropriate handler
    pub fn route(&self, input: &str) -> CommandRoute {
        let trimmed_input = input.trim();
        
        // Check for explicit Gemini prefixes
        for prefix in &self.gemini_prefixes {
            if trimmed_input.starts_with(prefix) {
                let query = trimmed_input[prefix.len()..].trim();
                if prefix == "_ " {
                    // Special case: execute command and analyze
                    if let Some(space_idx) = query.find(' ') {
                        let command = query[..space_idx].to_string();
                        let rest = query[space_idx + 1..].trim().to_string();
                        return CommandRoute::Analysis { command, query: rest };
                    } else {
                        return CommandRoute::Analysis { 
                            command: query.to_string(), 
                            query: "analyze this command".to_string() 
                        };
                    }
                } else {
                    return CommandRoute::Gemini(query.to_string());
                }
            }
        }
        
        // Check if it looks like a valid shell command
        if self.is_valid_shell_command(trimmed_input) {
            return CommandRoute::Shell(trimmed_input.to_string());
        }
        
        // Check if it looks like natural language
        if self.looks_like_natural_language(trimmed_input) {
            return CommandRoute::NaturalLanguage(trimmed_input.to_string());
        }
        
        // Default to shell (let shell handle "command not found")
        CommandRoute::Shell(trimmed_input.to_string())
    }
    
    /// Check if input looks like a valid shell command
    fn is_valid_shell_command(&self, input: &str) -> bool {
        // Extract the first word (command name)
        let first_word = input.split_whitespace().next().unwrap_or("");
        
        // Check if it's a known shell command
        if self.shell_commands.contains(first_word) {
            return true;
        }
        
        // Check for shell syntax patterns
        if input.contains('|') || input.contains('>') || input.contains('<') {
            return true;
        }
        
        // Check for relative/absolute paths
        if first_word.starts_with("./") || first_word.starts_with("/") || first_word.starts_with("~/") {
            return true;
        }
        
        // Check for variable assignments
        if input.contains('=') && !input.contains(' ') {
            return true;
        }
        
        // If it looks like a command (single word or word with flags)
        if input.split_whitespace().count() <= 5 && 
           !self.looks_like_natural_language(input) {
            return true;
        }
        
        false
    }
    
    /// Check if input looks like natural language
    fn looks_like_natural_language(&self, input: &str) -> bool {
        // Check against natural language patterns
        for pattern in &self.natural_language_patterns {
            if pattern.is_match(input) {
                return true;
            }
        }
        
        // Check for sentence-like structure (multiple words, reasonable length)
        let words: Vec<&str> = input.split_whitespace().collect();
        if words.len() > 3 && input.len() > 20 {
            return true;
        }
        
        // Check for polite language patterns
        let polite_words = ["please", "could", "would", "can you", "help me"];
        if polite_words.iter().any(|&word| input.to_lowercase().contains(word)) {
            return true;
        }
        
        false
    }
    
    /// Add a custom Gemini prefix
    pub fn add_gemini_prefix(&mut self, prefix: String) {
        if !self.gemini_prefixes.contains(&prefix) {
            self.gemini_prefixes.push(prefix);
        }
    }
    
    /// Add a known shell command
    pub fn add_shell_command(&mut self, command: String) {
        self.shell_commands.insert(command);
    }
}

impl Default for CommandRouter {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_gemini_prefixes() {
        let router = CommandRouter::new();
        
        match router.route("g how does rust work") {
            CommandRoute::Gemini(query) => assert_eq!(query, "how does rust work"),
            _ => panic!("Expected Gemini route"),
        }
        
        match router.route("? what is cargo") {
            CommandRoute::Gemini(query) => assert_eq!(query, "what is cargo"),
            _ => panic!("Expected Gemini route"),
        }
    }
    
    #[test]
    fn test_analysis_prefix() {
        let router = CommandRouter::new();
        
        match router.route("_ ls -la") {
            CommandRoute::Analysis { command, query: _ } => assert_eq!(command, "ls"),
            _ => panic!("Expected Analysis route"),
        }
    }
    
    #[test]
    fn test_shell_commands() {
        let router = CommandRouter::new();
        
        match router.route("ls -la") {
            CommandRoute::Shell(_) => {},
            _ => panic!("Expected Shell route"),
        }
        
        match router.route("echo hello | grep world") {
            CommandRoute::Shell(_) => {},
            _ => panic!("Expected Shell route"),
        }
    }
    
    #[test]
    fn test_natural_language() {
        let router = CommandRouter::new();
        
        match router.route("how do I list files in this directory") {
            CommandRoute::NaturalLanguage(_) => {},
            _ => panic!("Expected NaturalLanguage route"),
        }
        
        match router.route("what does this error mean?") {
            CommandRoute::NaturalLanguage(_) => {},
            _ => panic!("Expected NaturalLanguage route"),
        }
    }
    
    #[test]
    fn test_ambiguous_cases() {
        let router = CommandRouter::new();
        
        // Should default to shell for unknown commands
        match router.route("unknown_command") {
            CommandRoute::Shell(_) => {},
            _ => panic!("Expected Shell route for unknown command"),
        }
    }
}