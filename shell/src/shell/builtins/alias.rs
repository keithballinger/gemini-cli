//! alias - command alias builtin command

use crate::shell::types::*;

pub struct AliasCommand;

#[async_trait::async_trait]
impl BuiltinCommand for AliasCommand {
    fn name(&self) -> &str {
        "alias"
    }

    fn description(&self) -> &str {
        "Define or display command aliases"
    }

    async fn execute(
        &self,
        args: &[String],
        env: &mut ShellEnvironment,
        _options: &ShellOptions,
    ) -> Result<i32, ShellError> {
        if args.is_empty() {
            // Display all aliases
            self.display_all_aliases(env).await
        } else {
            // Process each argument
            for arg in args {
                if arg == "-h" || arg == "--help" {
                    println!("{}", self.help());
                    return Ok(0);
                }

                if let Some(eq_pos) = arg.find('=') {
                    // Define alias: alias name=value
                    let name = arg[..eq_pos].trim().to_string();
                    let value = arg[eq_pos + 1..].trim().to_string();

                    if name.is_empty() {
                        eprintln!("alias: invalid alias name");
                        return Ok(1);
                    }

                    if !is_valid_alias_name(&name) {
                        eprintln!("alias: {}: invalid alias name", name);
                        return Ok(1);
                    }

                    // Remove surrounding quotes if present
                    let value = remove_quotes(&value);
                    
                    env.set_alias(name.clone(), value.clone());
                    
                    if args.len() == 1 {
                        // Display the newly created alias
                        println!("{}='{}'", name, value);
                    }
                } else {
                    // Display specific alias
                    let name = arg.trim();
                    if let Some(value) = env.get_alias(name) {
                        println!("{}='{}'", name, value);
                    } else {
                        eprintln!("alias: {}: not found", name);
                        return Ok(1);
                    }
                }
            }
            Ok(0)
        }
    }

    fn help(&self) -> String {
        "alias [name[=value] ...]
Define or display command aliases.

Without arguments, print all defined aliases.
With arguments, define aliases or display specific ones.

Arguments:
  name=value    Define an alias where NAME expands to VALUE
  name          Display the alias definition for NAME

Alias names must be valid identifiers (letters, digits, underscores).
Alias values can contain any characters.

Examples:
  alias                    Show all aliases
  alias ll='ls -l'         Create alias 'll' for 'ls -l'
  alias la='ls -la'        Create alias 'la' for 'ls -la'
  alias ll                 Show definition of alias 'll'
  alias grep='grep --color=auto'   Create colored grep alias

Notes:
  - Aliases are expanded only for the first word of a command
  - Recursive alias expansion is prevented
  - To remove an alias, use the 'unalias' command".to_string()
    }
}

impl AliasCommand {
    async fn display_all_aliases(&self, env: &ShellEnvironment) -> Result<i32, ShellError> {
        let aliases = env.get_all_aliases();
        
        if aliases.is_empty() {
            // No aliases defined, which is normal
            return Ok(0);
        }

        // Sort aliases by name for consistent output
        let mut sorted_aliases: Vec<_> = aliases.iter().collect();
        sorted_aliases.sort_by_key(|(name, _)| name.as_str());

        for (name, value) in sorted_aliases {
            println!("{}='{}'", name, value);
        }

        Ok(0)
    }
}

/// Check if an alias name is valid
fn is_valid_alias_name(name: &str) -> bool {
    if name.is_empty() {
        return false;
    }

    // First character must be letter or underscore
    let mut chars = name.chars();
    let first = chars.next().unwrap();
    if !first.is_ascii_alphabetic() && first != '_' {
        return false;
    }

    // Remaining characters must be alphanumeric or underscore
    chars.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

/// Remove surrounding quotes from a string
fn remove_quotes(value: &str) -> String {
    let trimmed = value.trim();
    
    if (trimmed.starts_with('"') && trimmed.ends_with('"')) ||
       (trimmed.starts_with('\'') && trimmed.ends_with('\'')) {
        trimmed[1..trimmed.len()-1].to_string()
    } else {
        trimmed.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_alias_display_empty() {
        let mut env = ShellEnvironment::new();
        let alias = AliasCommand;
        
        let result = alias.execute(&[], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[tokio::test]
    async fn test_alias_create_and_display() {
        let mut env = ShellEnvironment::new();
        let alias = AliasCommand;
        
        // Create an alias
        let result = alias.execute(&["ll=ls -l".to_string()], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
        
        // Verify alias was created
        assert_eq!(env.get_alias("ll"), Some(&"ls -l".to_string()));
        
        // Display specific alias
        let result = alias.execute(&["ll".to_string()], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[tokio::test]
    async fn test_alias_with_quotes() {
        let mut env = ShellEnvironment::new();
        let alias = AliasCommand;
        
        // Create alias with quotes
        let result = alias.execute(&["la='ls -la'".to_string()], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
        
        // Verify quotes were removed
        assert_eq!(env.get_alias("la"), Some(&"ls -la".to_string()));
    }

    #[tokio::test]
    async fn test_alias_invalid_name() {
        let mut env = ShellEnvironment::new();
        let alias = AliasCommand;
        
        // Try to create alias with invalid name
        let result = alias.execute(&["123invalid=test".to_string()], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1);
    }

    #[tokio::test]
    async fn test_alias_not_found() {
        let mut env = ShellEnvironment::new();
        let alias = AliasCommand;
        
        // Try to display non-existent alias
        let result = alias.execute(&["nonexistent".to_string()], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1);
    }

    #[tokio::test]
    async fn test_alias_help() {
        let mut env = ShellEnvironment::new();
        let alias = AliasCommand;
        
        let result = alias.execute(&["-h".to_string()], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[test]
    fn test_valid_alias_names() {
        assert!(is_valid_alias_name("ll"));
        assert!(is_valid_alias_name("ls_long"));
        assert!(is_valid_alias_name("_private"));
        assert!(is_valid_alias_name("cmd123"));
        
        assert!(!is_valid_alias_name("123cmd"));
        assert!(!is_valid_alias_name("-invalid"));
        assert!(!is_valid_alias_name(""));
        assert!(!is_valid_alias_name("in-valid"));
    }

    #[test]
    fn test_quote_removal() {
        assert_eq!(remove_quotes("'hello world'"), "hello world");
        assert_eq!(remove_quotes("\"hello world\""), "hello world");
        assert_eq!(remove_quotes("hello world"), "hello world");
        assert_eq!(remove_quotes("'single quote"), "'single quote");
        assert_eq!(remove_quotes(" 'spaced' "), "spaced");
    }
}