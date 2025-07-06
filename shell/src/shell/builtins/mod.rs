//! Built-in shell commands

pub mod cd;
pub mod pwd;
pub mod echo;
pub mod export;
pub mod exit;
pub mod jobs;
pub mod history;
pub mod alias;
pub mod unalias;

pub use cd::CdCommand;
pub use pwd::PwdCommand;
pub use echo::EchoCommand;
pub use export::ExportCommand;
pub use exit::ExitCommand;
pub use jobs::JobsCommand;
pub use history::HistoryCommand;
pub use alias::AliasCommand;
pub use unalias::UnaliasCommand;

use crate::shell::types::*;
use std::collections::HashMap;

/// Registry for all built-in commands
pub struct BuiltinRegistry {
    commands: HashMap<String, Box<dyn BuiltinCommand + Send + Sync>>,
}

impl BuiltinRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            commands: HashMap::new(),
        };
        
        // Register all built-in commands
        registry.register(Box::new(CdCommand));
        registry.register(Box::new(PwdCommand));
        registry.register(Box::new(EchoCommand));
        registry.register(Box::new(ExportCommand));
        registry.register(Box::new(ExitCommand));
        registry.register(Box::new(JobsCommand));
        registry.register(Box::new(HistoryCommand));
        registry.register(Box::new(AliasCommand));
        registry.register(Box::new(UnaliasCommand));
        
        registry
    }
    
    /// Register a built-in command
    pub fn register(&mut self, command: Box<dyn BuiltinCommand + Send + Sync>) {
        let name = command.name().to_string();
        let aliases: Vec<_> = command.aliases().iter().map(|s| s.to_string()).collect();
        
        self.commands.insert(name.clone(), command);
        
        // Also register aliases if any
        for alias in aliases {
            self.commands.insert(alias, Box::new(AliasRedirectCommand {
                target: name.clone(),
            }));
        }
    }
    
    /// Check if a command is a built-in
    pub fn is_builtin(&self, name: &str) -> bool {
        self.commands.contains_key(name)
    }
    
    /// Get a built-in command by name
    pub fn get(&self, name: &str) -> Option<&(dyn BuiltinCommand + Send + Sync)> {
        self.commands.get(name).map(|cmd| cmd.as_ref())
    }
    
    /// Execute a built-in command
    pub async fn execute(
        &self,
        name: &str,
        args: &[String],
        env: &mut ShellEnvironment,
        options: &ShellOptions,
    ) -> Result<i32, ShellError> {
        match self.commands.get(name) {
            Some(command) => command.execute(args, env, options).await,
            None => Err(ShellError::CommandNotFound {
                command: name.to_string(),
            }),
        }
    }
    
    /// List all available built-in commands
    pub fn list_commands(&self) -> Vec<&str> {
        let mut names: Vec<_> = self.commands.keys().map(|s| s.as_str()).collect();
        names.sort();
        names
    }
}

impl Default for BuiltinRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Alias command that redirects to another command
struct AliasRedirectCommand {
    target: String,
}

#[async_trait::async_trait]
impl BuiltinCommand for AliasRedirectCommand {
    fn name(&self) -> &str {
        "alias"
    }
    
    fn description(&self) -> &str {
        "Command alias"
    }
    
    async fn execute(
        &self,
        _args: &[String],
        _env: &mut ShellEnvironment,
        _options: &ShellOptions,
    ) -> Result<i32, ShellError> {
        // This should be handled by the registry to redirect to the target command
        // For now, just return an error
        Err(ShellError::RuntimeError {
            message: format!("Alias {} should redirect to {}", self.name(), self.target),
        })
    }
    
    fn help(&self) -> String {
        format!("Alias for {}", self.target)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_builtin_registry() {
        let registry = BuiltinRegistry::new();
        
        // Test that commands are registered
        assert!(registry.is_builtin("cd"));
        assert!(registry.is_builtin("pwd"));
        assert!(registry.is_builtin("echo"));
        assert!(registry.is_builtin("export"));
        assert!(registry.is_builtin("exit"));
        
        // Test that non-existent command is not registered
        assert!(!registry.is_builtin("nonexistent"));
    }

    #[tokio::test]
    async fn test_execute_builtin() {
        let registry = BuiltinRegistry::new();
        let mut env = ShellEnvironment::new();
        let options = ShellOptions::default();
        
        // Test executing pwd
        let result = registry.execute("pwd", &[], &mut env, &options).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[tokio::test]
    async fn test_execute_nonexistent() {
        let registry = BuiltinRegistry::new();
        let mut env = ShellEnvironment::new();
        let options = ShellOptions::default();
        
        let result = registry.execute("nonexistent", &[], &mut env, &options).await;
        assert!(result.is_err());
        match result.unwrap_err() {
            ShellError::CommandNotFound { .. } => (),
            _ => panic!("Expected CommandNotFound error"),
        }
    }
}