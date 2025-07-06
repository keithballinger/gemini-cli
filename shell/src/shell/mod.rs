//! POSIX-compliant shell implementation

pub mod types;
pub mod parser;
pub mod executor;
pub mod environment;
pub mod builtins;
pub mod utils;

pub use types::*;

use crate::gemini::GeminiClient;
use anyhow::Result;

/// Main shell interface that coordinates all shell components
pub struct GeminiShell {
    environment: ShellEnvironment,
    options: ShellOptions,
    gemini_client: Option<GeminiClient>,
}

impl GeminiShell {
    pub fn new() -> Self {
        Self {
            environment: ShellEnvironment::new(),
            options: ShellOptions::default(),
            gemini_client: None,
        }
    }

    pub fn with_options(options: ShellOptions) -> Self {
        Self {
            environment: ShellEnvironment::new(),
            options,
            gemini_client: None,
        }
    }

    pub async fn with_gemini(mut self, gemini_client: GeminiClient) -> Self {
        self.gemini_client = Some(gemini_client);
        self
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
    pub async fn execute(&mut self, _input: &str) -> Result<ExecutionResult> {
        // This will be implemented as we build out the other components
        todo!("execute method will be implemented after parser and executor are ready")
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