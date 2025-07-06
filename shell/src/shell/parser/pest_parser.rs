//! Pest-based shell parser implementation

use pest::Parser;
use pest_derive::Parser;

use crate::shell::types::*;
use super::{utils, CommandParser};

#[derive(Parser)]
#[grammar = "shell/parser/shell.pest"]
pub struct ShellPestParser;

// pest_derive generates a Rule enum automatically

/// POSIX shell parser using pest
pub struct ShellParser {
    // Parser options could go here
}

impl ShellParser {
    pub fn new() -> Self {
        Self {}
    }
    
    /// Parse a simple command segment
    fn parse_segment(&self, segment: &str, _original_input: &str) -> ShellResult<Option<ParsedCommand>> {
        let tokens = utils::tokenize(segment);
        if tokens.is_empty() {
            return Ok(None);
        }
        
        let mut command = Command {
            command_type: CommandType::Simple,
            executable: None,
            args: Vec::new(),
            redirections: Vec::new(),
            background: false,
        };
        
        let mut i = 0;
        
        // First token is usually the command
        if i < tokens.len() && !utils::is_redirection(&tokens[i]) {
            command.executable = Some(tokens[i].clone());
            i += 1;
        }
        
        // Process remaining tokens
        while i < tokens.len() {
            let token = &tokens[i];
            
            if utils::is_redirection(token) {
                // Handle redirection
                if i + 1 < tokens.len() {
                    command.redirections.push(utils::parse_redirection(token, &tokens[i + 1]));
                    i += 2;
                } else {
                    return Err(ShellError::SyntaxError {
                        message: format!("Missing target for redirection '{}'", token),
                    });
                }
            } else if token == "&" {
                command.background = true;
                i += 1;
            } else {
                // Regular argument
                command.args.push(token.clone());
                i += 1;
            }
        }
        
        let parsed_command = ParsedCommand {
            command,
            raw: segment.to_string(),
            tokens: tokens.into_iter().enumerate().map(|(idx, value)| Token {
                token_type: TokenType::Word, // Simplified for now
                value,
                position: utils::get_position(segment, idx * 10, 10), // Approximate positions
            }).collect(),
        };
        
        Ok(Some(parsed_command))
    }
    
    /// Parse compound commands (&&, ||, ;)
    fn parse_compound(&self, input: &str) -> ShellResult<Vec<ParsedCommand>> {
        // Simple compound command detection for now
        // TODO: Implement proper compound command parsing using pest
        
        if let Some(captures) = regex::Regex::new(r"(.*?)(&&|\|\||;)(.*)$")
            .unwrap()
            .captures(input) 
        {
            let first_part = captures.get(1).unwrap().as_str().trim();
            if !first_part.is_empty() {
                return self.parse_simple(first_part);
            }
        }
        
        self.parse_simple(input)
    }
    
    /// Parse simple commands and pipelines
    fn parse_simple(&self, input: &str) -> ShellResult<Vec<ParsedCommand>> {
        let mut commands = Vec::new();
        
        // Split by pipes
        let pipe_segments = utils::split_by_pipes(input);
        
        for segment in pipe_segments {
            if segment.trim().is_empty() {
                continue;
            }
            
            if let Some(command) = self.parse_segment(&segment, input)? {
                commands.push(command);
            }
        }
        
        // If we have multiple commands, they form a pipeline
        if commands.len() > 1 {
            for command in &mut commands {
                command.command.command_type = CommandType::Pipeline;
            }
        }
        
        Ok(commands)
    }
}

impl Default for ShellParser {
    fn default() -> Self {
        Self::new()
    }
}

impl CommandParser for ShellParser {
    fn parse(&self, input: &str) -> ShellResult<Vec<ParsedCommand>> {
        if input.trim().is_empty() {
            return Ok(Vec::new());
        }
        
        // TODO: Parse with pest for validation once Rule enum is properly accessible
        // For now, just use the simple parser
        tracing::debug!("Using simple parser (pest validation disabled temporarily)");
        
        // Detect compound commands
        if input.contains("&&") || input.contains("||") || input.contains(';') {
            return self.parse_compound(input);
        }
        
        // Parse simple commands and pipelines
        self.parse_simple(input)
    }
    
    fn validate_syntax(&self, _input: &str) -> ShellResult<()> {
        // TODO: Implement pest syntax validation once Rule enum is accessible
        Ok(())
    }
    
    fn detect_command_type(&self, input: &str) -> CommandType {
        if input.contains('|') {
            CommandType::Pipeline
        } else if input.contains("&&") || input.contains("||") || input.contains(';') {
            CommandType::Compound
        } else {
            CommandType::Simple
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_simple_command_parsing() {
        let parser = ShellParser::new();
        let result = parser.parse("ls -la").unwrap();
        
        assert_eq!(result.len(), 1);
        let cmd = &result[0];
        assert_eq!(cmd.command.executable, Some("ls".to_string()));
        assert_eq!(cmd.command.args, vec!["-la"]);
        assert!(!cmd.command.background);
    }
    
    #[test]
    fn test_pipeline_parsing() {
        let parser = ShellParser::new();
        let result = parser.parse("ls -la | grep rust").unwrap();
        
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].command.executable, Some("ls".to_string()));
        assert_eq!(result[1].command.executable, Some("grep".to_string()));
    }
    
    #[test]
    fn test_background_command() {
        let parser = ShellParser::new();
        let result = parser.parse("sleep 5 &").unwrap();
        
        assert_eq!(result.len(), 1);
        assert!(result[0].command.background);
    }
    
    #[test]
    fn test_redirection() {
        let parser = ShellParser::new();
        let result = parser.parse("echo hello > output.txt").unwrap();
        
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].command.redirections.len(), 1);
        assert_eq!(result[0].command.redirections[0].target, "output.txt");
    }
    
    #[test]
    fn test_empty_input() {
        let parser = ShellParser::new();
        let result = parser.parse("").unwrap();
        assert!(result.is_empty());
        
        let result = parser.parse("   ").unwrap();
        assert!(result.is_empty());
    }
}