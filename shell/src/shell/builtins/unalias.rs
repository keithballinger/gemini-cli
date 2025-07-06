//! unalias - remove command aliases builtin command

use crate::shell::types::*;

pub struct UnaliasCommand;

#[async_trait::async_trait]
impl BuiltinCommand for UnaliasCommand {
    fn name(&self) -> &str {
        "unalias"
    }

    fn description(&self) -> &str {
        "Remove command aliases"
    }

    async fn execute(
        &self,
        args: &[String],
        env: &mut ShellEnvironment,
        _options: &ShellOptions,
    ) -> Result<i32, ShellError> {
        if args.is_empty() {
            eprintln!("unalias: usage: unalias [-a] name [name ...]");
            return Ok(1);
        }

        let mut remove_all = false;
        let mut alias_names = Vec::new();

        // Parse arguments
        for arg in args {
            match arg.as_str() {
                "-a" => remove_all = true,
                "-h" | "--help" => {
                    println!("{}", self.help());
                    return Ok(0);
                }
                name if name.starts_with('-') => {
                    eprintln!("unalias: {}: invalid option", name);
                    return Ok(1);
                }
                name => alias_names.push(name),
            }
        }

        if remove_all {
            // Remove all aliases
            let count = env.get_all_aliases().len();
            env.aliases.clear();
            
            if count > 0 {
                println!("Removed {} aliases", count);
            }
            
            return Ok(0);
        }

        if alias_names.is_empty() {
            eprintln!("unalias: usage: unalias [-a] name [name ...]");
            return Ok(1);
        }

        // Remove specific aliases
        let mut errors = 0;
        for name in alias_names {
            if env.remove_alias(name) {
                // Successfully removed
            } else {
                eprintln!("unalias: {}: not found", name);
                errors += 1;
            }
        }

        if errors > 0 {
            Ok(1)
        } else {
            Ok(0)
        }
    }

    fn help(&self) -> String {
        "unalias [-a] name [name ...]
Remove aliases from the current environment.

Options:
  -a    Remove all alias definitions

Arguments:
  name  Name of alias to remove

Exit Status:
  Returns 0 unless NAME is not an existing alias or an invalid option is given.

Examples:
  unalias ll           Remove the 'll' alias
  unalias ll la        Remove both 'll' and 'la' aliases
  unalias -a           Remove all aliases".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_unalias_no_args() {
        let mut env = ShellEnvironment::new();
        let unalias = UnaliasCommand;
        
        let result = unalias.execute(&[], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1);
    }

    #[tokio::test]
    async fn test_unalias_existing() {
        let mut env = ShellEnvironment::new();
        env.set_alias("ll".to_string(), "ls -l".to_string());
        env.set_alias("la".to_string(), "ls -la".to_string());
        
        let unalias = UnaliasCommand;
        
        // Remove one alias
        let result = unalias.execute(&["ll".to_string()], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
        assert!(env.get_alias("ll").is_none());
        assert!(env.get_alias("la").is_some());
    }

    #[tokio::test]
    async fn test_unalias_nonexistent() {
        let mut env = ShellEnvironment::new();
        let unalias = UnaliasCommand;
        
        let result = unalias.execute(&["nonexistent".to_string()], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1);
    }

    #[tokio::test]
    async fn test_unalias_multiple() {
        let mut env = ShellEnvironment::new();
        env.set_alias("ll".to_string(), "ls -l".to_string());
        env.set_alias("la".to_string(), "ls -la".to_string());
        env.set_alias("lt".to_string(), "ls -lt".to_string());
        
        let unalias = UnaliasCommand;
        
        // Remove multiple aliases
        let result = unalias.execute(
            &["ll".to_string(), "la".to_string()], 
            &mut env, 
            &ShellOptions::default()
        ).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
        assert!(env.get_alias("ll").is_none());
        assert!(env.get_alias("la").is_none());
        assert!(env.get_alias("lt").is_some());
    }

    #[tokio::test]
    async fn test_unalias_all() {
        let mut env = ShellEnvironment::new();
        env.set_alias("ll".to_string(), "ls -l".to_string());
        env.set_alias("la".to_string(), "ls -la".to_string());
        env.set_alias("lt".to_string(), "ls -lt".to_string());
        
        let unalias = UnaliasCommand;
        
        // Remove all aliases
        let result = unalias.execute(&["-a".to_string()], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
        assert!(env.get_all_aliases().is_empty());
    }

    #[tokio::test]
    async fn test_unalias_mixed_results() {
        let mut env = ShellEnvironment::new();
        env.set_alias("ll".to_string(), "ls -l".to_string());
        
        let unalias = UnaliasCommand;
        
        // Try to remove one existing and one non-existing alias
        let result = unalias.execute(
            &["ll".to_string(), "nonexistent".to_string()], 
            &mut env, 
            &ShellOptions::default()
        ).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1); // Should return error due to non-existing alias
        assert!(env.get_alias("ll").is_none()); // But existing alias should still be removed
    }

    #[tokio::test]
    async fn test_unalias_help() {
        let mut env = ShellEnvironment::new();
        let unalias = UnaliasCommand;
        
        let result = unalias.execute(&["-h".to_string()], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }
}