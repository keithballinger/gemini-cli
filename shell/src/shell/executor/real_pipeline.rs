//! Real pipeline executor with proper process chaining

use crate::shell::{
    types::{ParsedCommand, RedirectionType},
    ExecutionResult, ShellError, ShellOptions, ShellEnvironment,
};
use std::process::{Command as StdCommand, Stdio as StdStdio};
use std::io::Write;

/// Execute a real pipeline using std::process for better pipe handling
pub async fn execute_real_pipeline(
    commands: &[ParsedCommand],
    env: &mut ShellEnvironment,
    options: &ShellOptions,
) -> Result<ExecutionResult, ShellError> {
    if commands.is_empty() {
        return Ok(ExecutionResult::success(String::new()));
    }

    if commands.len() == 1 {
        // Single command - use regular executor
        let executor = crate::shell::executor::ShellExecutor::new();
        return executor.execute(&commands[0], env, options).await
            .map_err(|e| ShellError::RuntimeError { message: e.to_string() });
    }

    // Build and execute pipeline using std::process
    let mut previous_stdout = None;
    let mut processes = Vec::new();

    for (i, parsed_cmd) in commands.iter().enumerate() {
        let cmd = &parsed_cmd.command;
        let executable = match &cmd.executable {
            Some(exe) => exe,
            None => continue,
        };

        let mut command = StdCommand::new(executable);
        command.args(&cmd.args);
        command.envs(&env.variables);
        command.current_dir(&env.cwd);

        // Configure stdin
        if let Some(stdout) = previous_stdout.take() {
            command.stdin(stdout);
        } else if i == 0 {
            // First command - inherit stdin
            command.stdin(StdStdio::inherit());
        }

        // Configure stdout  
        if i == commands.len() - 1 {
            // Last command - check for output redirection
            let mut stdout_redirected = false;
            for redirection in &cmd.redirections {
                match redirection.redirection_type {
                    RedirectionType::Output => {
                        let file = std::fs::File::create(&redirection.target)
                            .map_err(|e| ShellError::IoError {
                                message: format!("Failed to create output file '{}': {}", redirection.target, e)
                            })?;
                        command.stdout(file);
                        stdout_redirected = true;
                    }
                    RedirectionType::Append => {
                        let file = std::fs::OpenOptions::new()
                            .create(true)
                            .append(true)
                            .open(&redirection.target)
                            .map_err(|e| ShellError::IoError {
                                message: format!("Failed to open output file '{}': {}", redirection.target, e)
                            })?;
                        command.stdout(file);
                        stdout_redirected = true;
                    }
                    _ => {}
                }
            }
            
            if !stdout_redirected {
                // Capture final output
                command.stdout(StdStdio::piped());
            }
        } else {
            // Not last - pipe to next command
            command.stdout(StdStdio::piped());
        }

        // Configure stderr
        let mut stderr_redirected = false;
        for redirection in &cmd.redirections {
            if redirection.redirection_type == RedirectionType::Error {
                let file = std::fs::File::create(&redirection.target)
                    .map_err(|e| ShellError::IoError {
                        message: format!("Failed to create error file '{}': {}", redirection.target, e)
                    })?;
                command.stderr(file);
                stderr_redirected = true;
            }
        }
        if !stderr_redirected {
            command.stderr(StdStdio::piped());
        }

        // Spawn the process
        let mut child = command.spawn()
            .map_err(|e| ShellError::CommandNotFound {
                command: format!("{}: {}", executable, e)
            })?;

        // Save stdout for next command if not last
        if i < commands.len() - 1 {
            previous_stdout = child.stdout.take().map(StdStdio::from);
        }

        processes.push(child);
    }

    // Wait for all processes to complete
    let mut final_exit_code = 0;
    let mut final_output = String::new();
    let mut final_error = String::new();

    for (i, mut child) in processes.into_iter().enumerate() {
        let is_last = i == commands.len() - 1;

        // For the last command, capture output
        if is_last {
            let output = child.wait_with_output()
                .map_err(|e| ShellError::IoError {
                    message: format!("Failed to wait for process: {}", e)
                })?;

            final_exit_code = output.status.code().unwrap_or(-1);
            final_output = String::from_utf8_lossy(&output.stdout).to_string();
            final_error = String::from_utf8_lossy(&output.stderr).to_string();
        } else {
            // Just wait for intermediate commands
            let status = child.wait()
                .map_err(|e| ShellError::IoError {
                    message: format!("Failed to wait for process: {}", e)
                })?;

            let exit_code = status.code().unwrap_or(-1);
            if exit_code != 0 && !options.ignore_pipeline_errors {
                return Ok(ExecutionResult {
                    exit_code,
                    stdout: String::new(),
                    stderr: format!("Pipeline failed at command {}: exit code {}", i + 1, exit_code),
                    signal: None,
                });
            }
        }
    }

    env.last_exit_code = final_exit_code;

    Ok(ExecutionResult {
        exit_code: final_exit_code,
        stdout: final_output,
        stderr: final_error,
        signal: None,
    })
}

/// Execute pipeline in a separate blocking thread
pub async fn execute_pipeline_blocking(
    commands: &[ParsedCommand],
    env: &mut ShellEnvironment,
    options: &ShellOptions,
) -> Result<ExecutionResult, ShellError> {
    let commands = commands.to_vec();
    let env_clone = env.clone();
    let options_clone = options.clone();

    // Run the blocking pipeline in a separate thread
    let result = tokio::task::spawn_blocking(move || {
        tokio::runtime::Handle::current().block_on(async {
            execute_real_pipeline(&commands, &mut env_clone.clone(), &options_clone).await
        })
    }).await
    .map_err(|e| ShellError::RuntimeError { message: format!("Pipeline execution failed: {}", e) })??;

    // Update environment with any changes
    env.last_exit_code = result.exit_code;

    Ok(result)
}