//! Core types for the POSIX-compliant shell implementation

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum CommandType {
    Simple,
    Pipeline,
    Compound,
    Builtin,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Command {
    pub command_type: CommandType,
    pub executable: Option<String>,
    pub args: Vec<String>,
    pub redirections: Vec<Redirection>,
    pub background: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ParsedCommand {
    pub command: Command,
    pub raw: String,
    pub tokens: Vec<Token>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum TokenType {
    Word,
    Operator,
    Redirect,
    Pipe,
    Separator,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Token {
    pub token_type: TokenType,
    pub value: String,
    pub position: Position,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Position {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum RedirectionType {
    Input,
    Output,
    Append,
    Error,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Redirection {
    pub redirection_type: RedirectionType,
    pub fd: Option<i32>,
    pub target: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Pipeline {
    pub commands: Vec<Command>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum CompoundOperator {
    Sequence,  // ;
    And,       // &&
    Or,        // ||
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CompoundCommand {
    pub operator: CompoundOperator,
    pub left: Box<CommandNode>,
    pub right: Box<CommandNode>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum CommandNode {
    Command(Command),
    Pipeline(Pipeline),
    Compound(CompoundCommand),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum JobStatus {
    Running,
    Stopped,
    Done,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Job {
    pub id: u32,
    pub pid: u32,
    pub command: String,
    pub status: JobStatus,
    pub background: bool,
    pub process_group: Option<u32>,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShellEnvironment {
    pub variables: HashMap<String, String>,
    pub aliases: HashMap<String, String>,
    pub functions: HashMap<String, String>,
    pub jobs: HashMap<u32, Job>,
    pub last_exit_code: i32,
    pub cwd: String,
    pub history: Vec<String>,
    pub gemini_responses: Vec<String>,
}

impl ShellEnvironment {
    pub fn new() -> Self {
        let mut env = Self {
            variables: HashMap::new(),
            aliases: HashMap::new(),
            functions: HashMap::new(),
            jobs: HashMap::new(),
            last_exit_code: 0,
            cwd: std::env::current_dir()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
            history: Vec::new(),
            gemini_responses: Vec::new(),
        };

        // Initialize with current environment variables
        for (key, value) in std::env::vars() {
            env.variables.insert(key, value);
        }

        env
    }

    pub fn get_variable(&self, name: &str) -> Option<&String> {
        self.variables.get(name)
    }

    pub fn set_variable(&mut self, name: String, value: String) {
        self.variables.insert(name, value);
    }

    pub fn unset_variable(&mut self, name: &str) {
        self.variables.remove(name);
    }

    pub fn export_variable(&mut self, name: String, value: Option<String>) {
        if let Some(val) = value {
            self.variables.insert(name.clone(), val.clone());
            std::env::set_var(&name, &val);
        } else if let Some(val) = self.variables.get(&name) {
            std::env::set_var(&name, val);
        }
    }

    pub fn get_exported_variables(&self) -> HashMap<String, String> {
        std::env::vars().collect()
    }

    pub fn change_directory(&mut self, dir: &str) -> Result<(), std::io::Error> {
        std::env::set_current_dir(dir)?;
        self.cwd = std::env::current_dir()?.to_string_lossy().to_string();
        self.set_variable("PWD".to_string(), self.cwd.clone());
        Ok(())
    }

    pub fn add_to_history(&mut self, command: String) {
        self.history.push(command);
    }

    pub fn add_gemini_response(&mut self, response: String) {
        self.gemini_responses.push(response);
    }

    pub fn get_gemini_response(&self, index: Option<usize>) -> Option<&String> {
        match index {
            Some(i) => self.gemini_responses.get(i),
            None => self.gemini_responses.last(),
        }
    }

    pub fn create_job(&mut self, command: String, pid: u32, background: bool) -> Job {
        let id = self.jobs.len() as u32 + 1;
        let job = Job {
            id,
            pid,
            command,
            status: JobStatus::Running,
            background,
            process_group: None,
            exit_code: None,
        };
        self.jobs.insert(id, job.clone());
        job
    }

    pub fn update_job_status(&mut self, job_id: u32, status: JobStatus, exit_code: Option<i32>) {
        if let Some(job) = self.jobs.get_mut(&job_id) {
            job.status = status;
            job.exit_code = exit_code;
        }
    }

    pub fn get_job(&self, job_id: u32) -> Option<&Job> {
        self.jobs.get(&job_id)
    }

    pub fn get_all_jobs(&self) -> Vec<&Job> {
        self.jobs.values().collect()
    }

    // Alias methods
    pub fn set_alias(&mut self, name: String, value: String) {
        self.aliases.insert(name, value);
    }

    pub fn get_alias(&self, name: &str) -> Option<&String> {
        self.aliases.get(name)
    }

    pub fn remove_alias(&mut self, name: &str) -> bool {
        self.aliases.remove(name).is_some()
    }

    pub fn get_all_aliases(&self) -> &HashMap<String, String> {
        &self.aliases
    }
}

impl Default for ShellEnvironment {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShellOptions {
    // Shell behavior options
    pub interactive_mode: bool,
    pub posix_mode: bool,
    pub debug_mode: bool,

    // Feature toggles
    pub enable_job_control: bool,
    pub enable_history: bool,
    pub enable_aliases: bool,
    pub enable_globbing: bool,
    
    // Pipeline behavior
    pub ignore_pipeline_errors: bool,

    // Limits
    pub history_size: usize,
    pub max_jobs: usize,
}

impl Default for ShellOptions {
    fn default() -> Self {
        Self {
            interactive_mode: true,
            posix_mode: true,
            debug_mode: false,
            enable_job_control: true,
            enable_history: true,
            enable_aliases: true,
            enable_globbing: true,
            ignore_pipeline_errors: false,
            history_size: 1000,
            max_jobs: 100,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub signal: Option<String>,
}

impl ExecutionResult {
    pub fn success(stdout: String) -> Self {
        Self {
            exit_code: 0,
            stdout,
            stderr: String::new(),
            signal: None,
        }
    }

    pub fn error(exit_code: i32, stderr: String) -> Self {
        Self {
            exit_code,
            stdout: String::new(),
            stderr,
            signal: None,
        }
    }

    pub fn with_signal(exit_code: i32, signal: String) -> Self {
        Self {
            exit_code,
            stdout: String::new(),
            stderr: String::new(),
            signal: Some(signal),
        }
    }
}

/// Trait for built-in shell commands
#[async_trait::async_trait]
pub trait BuiltinCommand: Send + Sync {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn aliases(&self) -> &[&str] {
        &[]
    }
    async fn execute(
        &self,
        args: &[String],
        env: &mut ShellEnvironment,
        options: &ShellOptions,
    ) -> Result<i32, ShellError>;
    fn help(&self) -> String;
}

#[derive(Debug, Error)]
pub enum ShellError {
    #[error("Parse error: {message}")]
    ParseError {
        message: String,
        position: Option<Position>,
    },

    #[error("Command not found: {command}")]
    CommandNotFound { command: String },

    #[error("Permission denied: {path}")]
    PermissionDenied { path: String },

    #[error("No such file or directory: {path}")]
    FileNotFound { path: String },

    #[error("I/O error: {message}")]
    IoError { message: String },

    #[error("Variable not set: {name}")]
    VariableNotSet { name: String },

    #[error("Job control error: {message}")]
    JobControlError { message: String },

    #[error("Syntax error: {message}")]
    SyntaxError { message: String },

    #[error("Runtime error: {message}")]
    RuntimeError { message: String },
}

impl ShellError {
    pub fn exit_code(&self) -> i32 {
        match self {
            ShellError::ParseError { .. } => 2,
            ShellError::CommandNotFound { .. } => 127,
            ShellError::PermissionDenied { .. } => 126,
            ShellError::FileNotFound { .. } => 1,
            ShellError::IoError { .. } => 1,
            ShellError::VariableNotSet { .. } => 1,
            ShellError::JobControlError { .. } => 1,
            ShellError::SyntaxError { .. } => 2,
            ShellError::RuntimeError { .. } => 1,
        }
    }
}

impl From<std::io::Error> for ShellError {
    fn from(err: std::io::Error) -> Self {
        match err.kind() {
            std::io::ErrorKind::NotFound => ShellError::FileNotFound {
                path: err.to_string(),
            },
            std::io::ErrorKind::PermissionDenied => ShellError::PermissionDenied {
                path: err.to_string(),
            },
            _ => ShellError::IoError {
                message: err.to_string(),
            },
        }
    }
}

pub type ShellResult<T> = Result<T, ShellError>;