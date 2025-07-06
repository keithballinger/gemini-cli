//! export - set environment variables builtin command

use crate::shell::types::*;

pub struct ExportCommand;

#[async_trait::async_trait]
impl BuiltinCommand for ExportCommand {
    fn name(&self) -> &str {
        "export"
    }

    fn description(&self) -> &str {
        "Set environment variables"
    }

    async fn execute(
        &self,
        args: &[String],
        env: &mut ShellEnvironment,
        _options: &ShellOptions,
    ) -> Result<i32, ShellError> {
        if args.is_empty() {
            // Display all environment variables
            let exported = env.get_exported_variables();
            let mut vars: Vec<_> = exported.iter().collect();
            vars.sort_by_key(|(k, _)| k.as_str());
            
            for (name, value) in vars {
                println!("export {}=\"{}\"", name, value);
            }
            return Ok(0);
        }

        for arg in args {
            if let Some(eq_pos) = arg.find('=') {
                // Variable assignment: VAR=value
                let name = arg[..eq_pos].to_string();
                let value = arg[eq_pos + 1..].to_string();
                
                // Validate variable name
                if !is_valid_variable_name(&name) {
                    eprintln!("export: {}: not a valid identifier", name);
                    return Ok(1);
                }
                
                env.export_variable(name, Some(value));
            } else {
                // Just variable name: export existing variable
                let name = arg.clone();
                
                // Validate variable name
                if !is_valid_variable_name(&name) {
                    eprintln!("export: {}: not a valid identifier", name);
                    return Ok(1);
                }
                
                if env.get_variable(&name).is_some() {
                    env.export_variable(name, None);
                } else {
                    eprintln!("export: {}: variable not set", name);
                    return Ok(1);
                }
            }
        }

        Ok(0)
    }

    fn help(&self) -> String {
        "export [name[=value] ...]
Set environment variables and mark them for export to child processes.

If no arguments are given, display all exported variables.
If a name is given without a value, export the variable if it exists.".to_string()
    }
}

/// Check if a variable name is valid (POSIX compliant)
fn is_valid_variable_name(name: &str) -> bool {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_export_assignment() {
        let mut env = ShellEnvironment::new();
        let export = ExportCommand;
        
        let result = export.execute(
            &["TEST_VAR=hello".to_string()], 
            &mut env, 
            &ShellOptions::default()
        ).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
        assert_eq!(env.get_variable("TEST_VAR"), Some(&"hello".to_string()));
    }

    #[tokio::test]
    async fn test_export_existing_variable() {
        let mut env = ShellEnvironment::new();
        env.set_variable("EXISTING_VAR".to_string(), "value".to_string());
        
        let export = ExportCommand;
        let result = export.execute(
            &["EXISTING_VAR".to_string()], 
            &mut env, 
            &ShellOptions::default()
        ).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[tokio::test]
    async fn test_export_invalid_name() {
        let mut env = ShellEnvironment::new();
        let export = ExportCommand;
        
        let result = export.execute(
            &["123INVALID=value".to_string()], 
            &mut env, 
            &ShellOptions::default()
        ).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1); // Should return error code
    }

    #[test]
    fn test_valid_variable_names() {
        assert!(is_valid_variable_name("VAR"));
        assert!(is_valid_variable_name("_VAR"));
        assert!(is_valid_variable_name("VAR123"));
        assert!(is_valid_variable_name("_123"));
        
        assert!(!is_valid_variable_name("123VAR"));
        assert!(!is_valid_variable_name("-VAR"));
        assert!(!is_valid_variable_name("VAR-NAME"));
        assert!(!is_valid_variable_name(""));
    }
}