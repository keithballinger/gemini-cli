//! history - command history builtin command

use crate::shell::types::*;
use std::fs::OpenOptions;
use std::io::Write;

pub struct HistoryCommand;

#[async_trait::async_trait]
impl BuiltinCommand for HistoryCommand {
    fn name(&self) -> &str {
        "history"
    }

    fn description(&self) -> &str {
        "Display or manipulate command history"
    }

    async fn execute(
        &self,
        args: &[String],
        env: &mut ShellEnvironment,
        _options: &ShellOptions,
    ) -> Result<i32, ShellError> {
        if args.is_empty() {
            // Display entire history
            self.display_history(&env.history, None).await
        } else {
            match args[0].as_str() {
                "-c" => {
                    // Clear history
                    env.history.clear();
                    Ok(0)
                }
                "-d" => {
                    // Delete specific entry
                    if args.len() < 2 {
                        eprintln!("history: -d: option requires an argument");
                        return Ok(1);
                    }
                    
                    match args[1].parse::<usize>() {
                        Ok(index) => {
                            if index > 0 && index <= env.history.len() {
                                env.history.remove(index - 1);
                                Ok(0)
                            } else {
                                eprintln!("history: {}: history position out of range", index);
                                Ok(1)
                            }
                        }
                        Err(_) => {
                            eprintln!("history: {}: numeric argument required", args[1]);
                            Ok(1)
                        }
                    }
                }
                "-w" => {
                    // Write history to file
                    let filename = if args.len() > 1 {
                        &args[1]
                    } else {
                        ".shell_history"
                    };
                    
                    self.write_history_to_file(&env.history, filename).await
                }
                "-r" => {
                    // Read history from file
                    let filename = if args.len() > 1 {
                        &args[1]
                    } else {
                        ".shell_history"
                    };
                    
                    self.read_history_from_file(env, filename).await
                }
                "-a" => {
                    // Append new history lines to file
                    let filename = if args.len() > 1 {
                        &args[1]
                    } else {
                        ".shell_history"
                    };
                    
                    self.append_history_to_file(&env.history, filename).await
                }
                "-n" => {
                    // Read only new lines from file
                    eprintln!("history: -n: not yet implemented");
                    Ok(1)
                }
                "-h" | "--help" => {
                    println!("{}", self.help());
                    Ok(0)
                }
                arg if arg.starts_with('-') => {
                    eprintln!("history: {}: invalid option", arg);
                    Ok(1)
                }
                _ => {
                    // Display N most recent commands
                    match args[0].parse::<usize>() {
                        Ok(n) => self.display_history(&env.history, Some(n)).await,
                        Err(_) => {
                            eprintln!("history: {}: numeric argument required", args[0]);
                            Ok(1)
                        }
                    }
                }
            }
        }
    }

    fn help(&self) -> String {
        "history [-c] [-d offset] [-anrw] [filename] or history [n]
Display or manipulate the command history list.

Options:
  -c            Clear the history list by deleting all entries
  -d offset     Delete the history entry at position OFFSET
  -a [filename] Append history lines to the history file
  -n [filename] Read all history lines not already read from file
  -r [filename] Read the history file and use its contents as history
  -w [filename] Write the current history to the history file

Arguments:
  n             Display the last N commands
  filename      Use FILENAME as the history file (default: .shell_history)

Examples:
  history           Show all history
  history 10        Show last 10 commands
  history -c        Clear all history
  history -d 5      Delete 5th history entry
  history -w        Write history to default file
  history -r        Read history from default file".to_string()
    }
}

impl HistoryCommand {
    async fn display_history(&self, history: &[String], limit: Option<usize>) -> Result<i32, ShellError> {
        let items = match limit {
            Some(n) => {
                let start = if history.len() > n {
                    history.len() - n
                } else {
                    0
                };
                &history[start..]
            }
            None => history,
        };

        for (i, command) in items.iter().enumerate() {
            let line_number = match limit {
                Some(n) => {
                    if history.len() > n {
                        history.len() - n + i + 1
                    } else {
                        i + 1
                    }
                }
                None => i + 1,
            };
            println!("{:5} {}", line_number, command);
        }

        Ok(0)
    }

    async fn write_history_to_file(&self, history: &[String], filename: &str) -> Result<i32, ShellError> {
        match std::fs::write(filename, history.join("\n")) {
            Ok(_) => Ok(0),
            Err(e) => {
                eprintln!("history: {}: {}", filename, e);
                Ok(1)
            }
        }
    }

    async fn read_history_from_file(&self, env: &mut ShellEnvironment, filename: &str) -> Result<i32, ShellError> {
        match std::fs::read_to_string(filename) {
            Ok(content) => {
                env.history.clear();
                for line in content.lines() {
                    if !line.trim().is_empty() {
                        env.history.push(line.to_string());
                    }
                }
                Ok(0)
            }
            Err(e) => {
                eprintln!("history: {}: {}", filename, e);
                Ok(1)
            }
        }
    }

    async fn append_history_to_file(&self, history: &[String], filename: &str) -> Result<i32, ShellError> {
        match OpenOptions::new().create(true).append(true).open(filename) {
            Ok(mut file) => {
                for command in history {
                    if let Err(e) = writeln!(file, "{}", command) {
                        eprintln!("history: {}: {}", filename, e);
                        return Ok(1);
                    }
                }
                Ok(0)
            }
            Err(e) => {
                eprintln!("history: {}: {}", filename, e);
                Ok(1)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_history_display() {
        let mut env = ShellEnvironment::new();
        env.history.push("command1".to_string());
        env.history.push("command2".to_string());
        env.history.push("command3".to_string());

        let history = HistoryCommand;
        let result = history.execute(&[], &mut env, &ShellOptions::default()).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[tokio::test]
    async fn test_history_limit() {
        let mut env = ShellEnvironment::new();
        for i in 1..=10 {
            env.history.push(format!("command{}", i));
        }

        let history = HistoryCommand;
        let result = history.execute(&["5".to_string()], &mut env, &ShellOptions::default()).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[tokio::test]
    async fn test_history_clear() {
        let mut env = ShellEnvironment::new();
        env.history.push("command1".to_string());
        env.history.push("command2".to_string());

        let history = HistoryCommand;
        let result = history.execute(&["-c".to_string()], &mut env, &ShellOptions::default()).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
        assert!(env.history.is_empty());
    }

    #[tokio::test]
    async fn test_history_delete() {
        let mut env = ShellEnvironment::new();
        env.history.push("command1".to_string());
        env.history.push("command2".to_string());
        env.history.push("command3".to_string());

        let history = HistoryCommand;
        let result = history.execute(&["-d".to_string(), "2".to_string()], &mut env, &ShellOptions::default()).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
        assert_eq!(env.history.len(), 2);
        assert_eq!(env.history[1], "command3");
    }

    #[tokio::test]
    async fn test_history_delete_invalid() {
        let mut env = ShellEnvironment::new();
        env.history.push("command1".to_string());

        let history = HistoryCommand;
        
        // Test out of range
        let result = history.execute(&["-d".to_string(), "5".to_string()], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1);
        
        // Test invalid number
        let result = history.execute(&["-d".to_string(), "abc".to_string()], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1);
    }

    #[tokio::test]
    async fn test_history_help() {
        let mut env = ShellEnvironment::new();
        let history = HistoryCommand;
        
        let result = history.execute(&["-h".to_string()], &mut env, &ShellOptions::default()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }
}