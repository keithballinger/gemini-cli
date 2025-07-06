//! POSIX-compliant shell implementation

pub mod types;
pub mod parser;
pub mod executor;
pub mod environment;
pub mod builtins;
pub mod utils;

pub use types::*;

use crate::gemini::{GeminiClient, CommandRouter, ResponseHandler};
use anyhow::Result;
use parser::{ShellParser, CommandParser};
use executor::ShellExecutor;

/// Main shell interface that coordinates all shell components
pub struct GeminiShell {
    environment: ShellEnvironment,
    options: ShellOptions,
    parser: ShellParser,
    executor: ShellExecutor,
    command_router: CommandRouter,
    response_handler: ResponseHandler,
    gemini_client: Option<GeminiClient>,
}

impl GeminiShell {
    pub fn new() -> Self {
        Self {
            environment: ShellEnvironment::new(),
            options: ShellOptions::default(),
            parser: ShellParser::new(),
            executor: ShellExecutor::new(),
            command_router: CommandRouter::new(),
            response_handler: ResponseHandler::new(),
            gemini_client: None,
        }
    }

    pub fn with_options(options: ShellOptions) -> Self {
        Self {
            environment: ShellEnvironment::new(),
            options,
            parser: ShellParser::new(),
            executor: ShellExecutor::new(),
            command_router: CommandRouter::new(),
            response_handler: ResponseHandler::new(),
            gemini_client: None,
        }
    }

    pub async fn with_gemini(&mut self, gemini_client: GeminiClient) {
        self.gemini_client = Some(gemini_client);
    }

    pub fn environment(&self) -> &ShellEnvironment {
        &self.environment
    }

    pub fn environment_mut(&mut self) -> &mut ShellEnvironment {
        &mut self.environment
    }

    pub fn options(&self) -> &ShellOptions {
        &self.options
    }

    pub fn gemini_client(&self) -> Option<&GeminiClient> {
        self.gemini_client.as_ref()
    }

    /// Execute a shell command or Gemini query
    pub async fn execute(&mut self, input: &str) -> Result<ExecutionResult> {
        // Expand %% with last Gemini response if any
        let expanded_input = self.response_handler.expand_response_pipe(input);
        
        // Route the command
        let route = self.command_router.route(&expanded_input);
        
        match route {
            crate::gemini::CommandRoute::Shell(cmd) => {
                self.execute_shell_command(&cmd).await
            }
            crate::gemini::CommandRoute::Gemini(query) => {
                self.execute_gemini_query(&query).await
            }
            crate::gemini::CommandRoute::Analysis { command, query: _ } => {
                // Execute command and analyze result
                let result = self.execute_shell_command(&command).await?;
                
                // TODO: Add Gemini analysis of the result
                // For now, just return the command result
                Ok(result)
            }
            crate::gemini::CommandRoute::NaturalLanguage(query) => {
                self.execute_gemini_query(&query).await
            }
        }
    }
    
    /// Execute a shell command
    async fn execute_shell_command(&mut self, command: &str) -> Result<ExecutionResult> {
        // Parse the command
        let parsed_commands = self.parser.parse(command)?;
        
        if parsed_commands.is_empty() {
            return Ok(ExecutionResult::success(String::new()));
        }
        
        // For now, execute the first command
        // TODO: Handle multiple commands (compound commands)
        let result = self.executor.execute(&parsed_commands[0], &mut self.environment, &self.options).await?;
        
        // Add command to history
        self.environment.add_to_history(command.to_string());
        
        Ok(result)
    }
    
    /// Execute a Gemini query
    async fn execute_gemini_query(&mut self, query: &str) -> Result<ExecutionResult> {
        if let Some(ref gemini_client) = self.gemini_client {
            match gemini_client.query(query).await {
                Ok(response) => {
                    // Store the response for %% piping
                    self.response_handler.store_response(response.clone());
                    
                    // Add to environment history
                    self.environment.add_gemini_response(response.text.clone());
                    
                    Ok(ExecutionResult::success(response.text))
                }
                Err(e) => {
                    Ok(ExecutionResult::error(1, format!("Gemini error: {}", e)))
                }
            }
        } else {
            Ok(ExecutionResult::error(1, "Gemini client not available".to_string()))
        }
    }

    /// Check if the shell is in interactive mode
    pub fn is_interactive(&self) -> bool {
        self.options.interactive_mode
    }

    /// Get the current working directory
    pub fn current_dir(&self) -> &str {
        &self.environment.cwd
    }

    /// Get the last exit code
    pub fn last_exit_code(&self) -> i32 {
        self.environment.last_exit_code
    }
}