//! pwd - print working directory builtin command

use crate::shell::types::*;

pub struct PwdCommand;

#[async_trait::async_trait]
impl BuiltinCommand for PwdCommand {
    fn name(&self) -> &str {
        "pwd"
    }

    fn description(&self) -> &str {
        "Print the current working directory"
    }

    async fn execute(
        &self,
        _args: &[String],
        env: &mut ShellEnvironment,
        _options: &ShellOptions,
    ) -> Result<i32, ShellError> {
        println!("{}", env.cwd);
        Ok(0)
    }

    fn help(&self) -> String {
        "pwd
Print the absolute pathname of the current working directory.".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_pwd() {
        let mut env = ShellEnvironment::new();
        env.cwd = "/test/directory".to_string();
        
        let pwd = PwdCommand;
        let result = pwd.execute(&[], &mut env, &ShellOptions::default()).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }
}