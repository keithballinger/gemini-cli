//! echo - display line of text builtin command

use crate::shell::types::*;

pub struct EchoCommand;

#[async_trait::async_trait]
impl BuiltinCommand for EchoCommand {
    fn name(&self) -> &str {
        "echo"
    }

    fn description(&self) -> &str {
        "Display line of text"
    }

    async fn execute(
        &self,
        args: &[String],
        _env: &mut ShellEnvironment,
        _options: &ShellOptions,
    ) -> Result<i32, ShellError> {
        let mut newline = true;
        let mut start_index = 0;

        // Check for -n flag (no trailing newline)
        if !args.is_empty() && args[0] == "-n" {
            newline = false;
            start_index = 1;
        }

        // Print arguments separated by spaces
        if start_index < args.len() {
            print!("{}", args[start_index..].join(" "));
        }

        if newline {
            println!();
        }

        Ok(0)
    }

    fn help(&self) -> String {
        "echo [-n] [string ...]
Display the STRINGs on the standard output followed by a newline.

  -n    do not output the trailing newline".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_echo_basic() {
        let mut env = ShellEnvironment::new();
        let echo = EchoCommand;
        
        let result = echo.execute(
            &["hello".to_string(), "world".to_string()], 
            &mut env, 
            &ShellOptions::default()
        ).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[tokio::test]
    async fn test_echo_no_newline() {
        let mut env = ShellEnvironment::new();
        let echo = EchoCommand;
        
        let result = echo.execute(
            &["-n".to_string(), "hello".to_string()], 
            &mut env, 
            &ShellOptions::default()
        ).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[tokio::test]
    async fn test_echo_empty() {
        let mut env = ShellEnvironment::new();
        let echo = EchoCommand;
        
        let result = echo.execute(&[], &mut env, &ShellOptions::default()).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }
}