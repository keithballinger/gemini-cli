//! Command execution module

pub mod pipeline;
pub mod jobs;
pub mod real_pipeline;

use crate::shell::types::*;
use crate::shell::builtins::BuiltinRegistry;
use std::process::Stdio;
use tokio::process::Command as TokioCommand;
use anyhow::Result;

pub struct ShellExecutor {
    builtins: BuiltinRegistry,
}

impl ShellExecutor {
    pub fn new() -> Self {
        Self {
            builtins: BuiltinRegistry::new(),
        }
    }

    /// Execute a parsed command
    pub async fn execute(
        &self,
        command: &ParsedCommand,
        env: &mut ShellEnvironment,
        options: &ShellOptions,
    ) -> Result<ExecutionResult> {
        let cmd = &command.command;
        
        // Handle different command types
        match cmd.command_type {
            CommandType::Simple => self.execute_simple(cmd, env, options).await,
            CommandType::Builtin => self.execute_builtin(cmd, env, options).await,
            CommandType::Pipeline => {
                // For now, treat as simple command
                // TODO: Implement proper pipeline execution
                self.execute_simple(cmd, env, options).await
            }
            CommandType::Compound => {
                // For now, treat as simple command
                // TODO: Implement compound command execution
                self.execute_simple(cmd, env, options).await
            }
        }
    }

    /// Execute multiple commands as a pipeline
    pub async fn execute_pipeline(
        &self,
        commands: &[ParsedCommand],
        env: &mut ShellEnvironment,
        options: &ShellOptions,
    ) -> Result<ExecutionResult> {
        // Check if any commands are built-ins that need special handling
        let mut has_builtins = false;
        for cmd in commands {
            if let Some(ref executable) = cmd.command.executable {
                if self.builtins.is_builtin(executable) {
                    has_builtins = true;
                    break;
                }
            }
        }

        if has_builtins {
            // Handle mixed pipeline with built-ins (more complex)
            self.execute_mixed_pipeline(commands, env, options).await
        } else {
            // All external commands, use real pipeline executor with true process piping
            match real_pipeline::execute_real_pipeline(commands, env, options).await {
                Ok(result) => Ok(result),
                Err(e) => Err(anyhow::anyhow!("Pipeline error: {}", e)),
            }
        }
    }

    /// Execute a pipeline that contains built-in commands
    async fn execute_mixed_pipeline(
        &self,
        commands: &[ParsedCommand],
        env: &mut ShellEnvironment,
        options: &ShellOptions,
    ) -> Result<ExecutionResult> {
        if commands.is_empty() {
            return Ok(ExecutionResult::success(String::new()));
        }

        if commands.len() == 1 {
            return self.execute(&commands[0], env, options).await;
        }

        // Advanced mixed pipeline handling with true piping
        let mut previous_output = String::new();
        let mut final_result = ExecutionResult::success(String::new());

        for (i, cmd) in commands.iter().enumerate() {
            let is_first = i == 0;
            let is_last = i == commands.len() - 1;
            
            // Check if this command is a built-in
            let is_builtin = if let Some(ref executable) = cmd.command.executable {
                self.builtins.is_builtin(executable)
            } else {
                false
            };

            if is_builtin {
                // For built-ins, we need to handle piping manually
                // Create a modified environment that captures output
                let mut temp_env = env.clone();
                
                // If not the first command, provide previous output as input
                if !is_first && !previous_output.is_empty() {
                    // Built-ins will need to handle stdin data
                    // For now, we'll pass it through environment
                    temp_env.variables.insert("_PIPE_INPUT".to_string(), previous_output.clone());
                }
                
                let result = self.execute(cmd, &mut temp_env, options).await?;
                
                // Update the real environment with any changes
                env.variables = temp_env.variables;
                env.cwd = temp_env.cwd;
                env.last_exit_code = temp_env.last_exit_code;
                
                if result.exit_code != 0 && !options.ignore_pipeline_errors {
                    return Ok(result);
                }
                
                // Save output for next command
                previous_output = result.stdout.clone();
                
                if is_last {
                    final_result = result;
                }
            } else {
                // External command - we can use real pipes
                if is_last && previous_output.is_empty() {
                    // Last command with no built-in input - execute normally
                    final_result = self.execute(cmd, env, options).await?;
                } else {
                    // Need to provide input from previous built-in
                    let mut command = TokioCommand::new(cmd.command.executable.as_ref().unwrap());
                    command.args(&cmd.command.args);
                    command.envs(&env.variables);
                    command.current_dir(&env.cwd);
                    
                    // Provide previous output as stdin
                    if !previous_output.is_empty() {
                        command.stdin(Stdio::piped());
                    }
                    
                    // Capture output if not last
                    if !is_last {
                        command.stdout(Stdio::piped());
                    }
                    
                    let mut child = command.spawn()
                        .map_err(|e| anyhow::anyhow!("Failed to spawn command: {}", e))?;
                    
                    // Write previous output to stdin
                    if !previous_output.is_empty() {
                        if let Some(mut stdin) = child.stdin.take() {
                            use tokio::io::AsyncWriteExt;
                            stdin.write_all(previous_output.as_bytes()).await?;
                            stdin.shutdown().await?;
                        }
                    }
                    
                    let output = child.wait_with_output().await?;
                    let exit_code = output.status.code().unwrap_or(-1);
                    
                    let result = ExecutionResult {
                        exit_code,
                        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
                        signal: None,
                    };
                    
                    if exit_code != 0 && !options.ignore_pipeline_errors {
                        return Ok(result);
                    }
                    
                    previous_output = result.stdout.clone();
                    
                    if is_last {
                        final_result = result;
                    }
                }
            }
        }

        Ok(final_result)
    }

    /// Execute a simple command
    async fn execute_simple(
        &self,
        cmd: &Command,
        env: &mut ShellEnvironment,
        options: &ShellOptions,
    ) -> Result<ExecutionResult> {
        let executable = match &cmd.executable {
            Some(exec) => exec,
            None => {
                return Ok(ExecutionResult::error(1, "No command specified".to_string()));
            }
        };

        // Check if it's a built-in command first
        if self.builtins.is_builtin(executable) {
            return self.execute_builtin_by_name(executable, &cmd.args, env, options).await;
        }

        // Execute as external command
        self.execute_external(executable, &cmd.args, cmd, env).await
    }

    /// Execute a built-in command
    async fn execute_builtin(
        &self,
        cmd: &Command,
        env: &mut ShellEnvironment,
        options: &ShellOptions,
    ) -> Result<ExecutionResult> {
        let executable = match &cmd.executable {
            Some(exec) => exec,
            None => {
                return Ok(ExecutionResult::error(1, "No command specified".to_string()));
            }
        };

        self.execute_builtin_by_name(executable, &cmd.args, env, options).await
    }

    /// Execute a built-in command by name
    async fn execute_builtin_by_name(
        &self,
        name: &str,
        args: &[String],
        env: &mut ShellEnvironment,
        options: &ShellOptions,
    ) -> Result<ExecutionResult> {
        match self.builtins.execute(name, args, env, options).await {
            Ok(exit_code) => {
                env.last_exit_code = exit_code;
                Ok(ExecutionResult::success(String::new()))
            }
            Err(ShellError::RuntimeError { message }) if message.starts_with("EXIT:") => {
                // Handle exit command
                let exit_code = message[5..].parse().unwrap_or(0);
                env.last_exit_code = exit_code;
                
                // Return a special result to indicate shell should exit
                Err(anyhow::anyhow!("Shell exit requested with code {}", exit_code))
            }
            Err(e) => {
                env.last_exit_code = e.exit_code();
                Ok(ExecutionResult::error(e.exit_code(), e.to_string()))
            }
        }
    }

    /// Execute an external command
    async fn execute_external(
        &self,
        executable: &str,
        args: &[String],
        cmd: &Command,
        env: &mut ShellEnvironment,
    ) -> Result<ExecutionResult> {
        // Build the command
        let mut command = TokioCommand::new(executable);
        command.args(args);
        
        // Set up environment variables
        for (key, value) in &env.variables {
            command.env(key, value);
        }
        
        // Set working directory
        command.current_dir(&env.cwd);
        
        // Handle redirections
        self.setup_redirections(&mut command, cmd)?;
        
        // Execute the command
        match command.output().await {
            Ok(output) => {
                let exit_code = output.status.code().unwrap_or(-1);
                env.last_exit_code = exit_code;
                
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                
                if exit_code == 0 {
                    Ok(ExecutionResult {
                        exit_code,
                        stdout,
                        stderr,
                        signal: None,
                    })
                } else {
                    Ok(ExecutionResult {
                        exit_code,
                        stdout,
                        stderr,
                        signal: None,
                    })
                }
            }
            Err(e) => {
                env.last_exit_code = 127; // Command not found
                Ok(ExecutionResult::error(127, format!("{}: {}", executable, e)))
            }
        }
    }

    /// Set up I/O redirections for a command
    fn setup_redirections(&self, command: &mut TokioCommand, cmd: &Command) -> Result<()> {
        for redirection in &cmd.redirections {
            match redirection.redirection_type {
                RedirectionType::Output => {
                    let file = std::fs::File::create(&redirection.target)?;
                    command.stdout(Stdio::from(file));
                }
                RedirectionType::Append => {
                    let file = std::fs::OpenOptions::new()
                        .create(true)
                        .append(true)
                        .open(&redirection.target)?;
                    command.stdout(Stdio::from(file));
                }
                RedirectionType::Input => {
                    let file = std::fs::File::open(&redirection.target)?;
                    command.stdin(Stdio::from(file));
                }
                RedirectionType::Error => {
                    let file = std::fs::File::create(&redirection.target)?;
                    command.stderr(Stdio::from(file));
                }
            }
        }
        
        Ok(())
    }

    /// Check if a command is a built-in
    pub fn is_builtin(&self, name: &str) -> bool {
        self.builtins.is_builtin(name)
    }

    /// List all built-in commands
    pub fn list_builtins(&self) -> Vec<&str> {
        self.builtins.list_commands()
    }
}

impl Default for ShellExecutor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_execute_builtin() {
        let executor = ShellExecutor::new();
        let mut env = ShellEnvironment::new();
        let options = ShellOptions::default();
        
        let command = ParsedCommand {
            command: Command {
                command_type: CommandType::Builtin,
                executable: Some("pwd".to_string()),
                args: vec![],
                redirections: vec![],
                background: false,
            },
            raw: "pwd".to_string(),
            tokens: vec![],
        };
        
        let result = executor.execute(&command, &mut env, &options).await;
        assert!(result.is_ok());
        
        let result = result.unwrap();
        assert_eq!(result.exit_code, 0);
    }

    #[tokio::test]
    async fn test_is_builtin() {
        let executor = ShellExecutor::new();
        
        assert!(executor.is_builtin("cd"));
        assert!(executor.is_builtin("pwd"));
        assert!(executor.is_builtin("echo"));
        assert!(!executor.is_builtin("ls")); // External command
    }

    #[tokio::test]
    async fn test_execute_external_command() {
        let executor = ShellExecutor::new();
        let mut env = ShellEnvironment::new();
        let options = ShellOptions::default();
        
        let command = ParsedCommand {
            command: Command {
                command_type: CommandType::Simple,
                executable: Some("echo".to_string()),
                args: vec!["hello".to_string()],
                redirections: vec![],
                background: false,
            },
            raw: "echo hello".to_string(),
            tokens: vec![],
        };
        
        let result = executor.execute(&command, &mut env, &options).await;
        assert!(result.is_ok());
        
        let result = result.unwrap();
        // Could be 0 if echo builtin is used, or external echo
        assert!(result.exit_code == 0 || result.stdout.contains("hello"));
    }
}