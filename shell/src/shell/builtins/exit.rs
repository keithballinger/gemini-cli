//! exit - exit the shell builtin command

use crate::shell::types::*;

pub struct ExitCommand;

#[async_trait::async_trait]
impl BuiltinCommand for ExitCommand {
    fn name(&self) -> &str {
        "exit"
    }

    fn description(&self) -> &str {
        "Exit the shell"
    }

    async fn execute(
        &self,
        args: &[String],
        env: &mut ShellEnvironment,
        _options: &ShellOptions,
    ) -> Result<i32, ShellError> {
        let exit_code = if args.is_empty() {
            // Use last exit code if no argument given
            env.last_exit_code
        } else {
            // Parse the provided exit code
            match args[0].parse::<i32>() {
                Ok(code) => code,
                Err(_) => {
                    eprintln!("exit: {}: numeric argument required", args[0]);
                    return Ok(128); // Exit with error
                }
            }
        };

        // For now, we'll use a special error to indicate shell should exit
        Err(ShellError::RuntimeError {
            message: format!("EXIT:{}", exit_code),
        })
    }

    fn help(&self) -> String {
        "exit [n]
Exit the shell with a status of N.
If N is omitted, the exit status is that of the last command executed.".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_exit_no_args() {
        let mut env = ShellEnvironment::new();
        env.last_exit_code = 42;
        
        let exit = ExitCommand;
        let result = exit.execute(&[], &mut env, &ShellOptions::default()).await;
        
        assert!(result.is_err());
        match result.unwrap_err() {
            ShellError::RuntimeError { message } => {
                assert_eq!(message, "EXIT:42");
            }
            _ => panic!("Expected RuntimeError with EXIT message"),
        }
    }

    #[tokio::test]
    async fn test_exit_with_code() {
        let mut env = ShellEnvironment::new();
        let exit = ExitCommand;
        
        let result = exit.execute(
            &["5".to_string()], 
            &mut env, 
            &ShellOptions::default()
        ).await;
        
        assert!(result.is_err());
        match result.unwrap_err() {
            ShellError::RuntimeError { message } => {
                assert_eq!(message, "EXIT:5");
            }
            _ => panic!("Expected RuntimeError with EXIT message"),
        }
    }

    #[tokio::test]
    async fn test_exit_invalid_code() {
        let mut env = ShellEnvironment::new();
        let exit = ExitCommand;
        
        let result = exit.execute(
            &["invalid".to_string()], 
            &mut env, 
            &ShellOptions::default()
        ).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 128);
    }
}