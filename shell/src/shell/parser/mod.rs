//! Shell command parser module

pub mod pest_parser;

pub use pest_parser::ShellParser;

use crate::shell::types::*;

/// Parser trait for shell command parsing
pub trait CommandParser {
    /// Parse a command string into a list of parsed commands
    fn parse(&self, input: &str) -> ShellResult<Vec<ParsedCommand>>;
    
    /// Validate command syntax without parsing
    fn validate_syntax(&self, input: &str) -> ShellResult<()>;
    
    /// Detect the type of command
    fn detect_command_type(&self, input: &str) -> CommandType;
}

/// Utility functions for command parsing
pub mod utils {
    use super::*;
    
    /// Split input by pipes while respecting quotes
    pub fn split_by_pipes(input: &str) -> Vec<String> {
        let mut segments = Vec::new();
        let mut current = String::new();
        let mut in_single_quote = false;
        let mut in_double_quote = false;
        let mut escaped = false;
        
        for ch in input.chars() {
            if escaped {
                current.push(ch);
                escaped = false;
                continue;
            }
            
            match ch {
                '\\' => {
                    escaped = true;
                    current.push(ch);
                }
                '\'' if !in_double_quote => {
                    in_single_quote = !in_single_quote;
                    current.push(ch);
                }
                '"' if !in_single_quote => {
                    in_double_quote = !in_double_quote;
                    current.push(ch);
                }
                '|' if !in_single_quote && !in_double_quote => {
                    segments.push(current.trim().to_string());
                    current.clear();
                }
                _ => current.push(ch),
            }
        }
        
        if !current.trim().is_empty() {
            segments.push(current.trim().to_string());
        }
        
        segments
    }
    
    /// Basic tokenization of a command
    pub fn tokenize(input: &str) -> Vec<String> {
        shell_words::split(input).unwrap_or_default()
    }
    
    /// Check if a token is a redirection operator
    pub fn is_redirection(token: &str) -> bool {
        matches!(token, ">" | ">>" | "<" | "2>" | "&>" | "2>&1")
    }
    
    /// Parse a redirection operator and target
    pub fn parse_redirection(operator: &str, target: &str) -> Redirection {
        let (redirection_type, fd) = match operator {
            ">" => (RedirectionType::Output, None),
            ">>" => (RedirectionType::Append, None),
            "<" => (RedirectionType::Input, None),
            "2>" => (RedirectionType::Error, Some(2)),
            "&>" | "2>&1" => (RedirectionType::Output, None), // Both stdout and stderr
            _ => (RedirectionType::Output, None),
        };
        
        Redirection {
            redirection_type,
            fd,
            target: target.to_string(),
        }
    }
    
    /// Extract position information from input
    pub fn get_position(input: &str, start_offset: usize, length: usize) -> Position {
        let input_len = input.len();
        let start = start_offset.min(input_len);
        let remaining = input_len.saturating_sub(start);
        let end = start + length.min(remaining);
        
        Position {
            start,
            end,
        }
    }
}