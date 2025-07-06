//! CLI argument parsing and invocation detection

use clap::Parser;

#[derive(Parser, Debug)]
#[command(name = "gemini-shell")]
#[command(about = "High-performance POSIX shell with AI integration")]
#[command(version)]
pub struct Args {
    /// Force shell mode (bypass auto-detection)
    #[arg(long)]
    pub shell: bool,
    
    /// Enable UI mode with ratatui interface
    #[arg(long)]
    pub ui: bool,
    
    /// Enable debug mode
    #[arg(long)]
    pub debug: bool,
    
    /// Command to execute
    #[arg(short, long)]
    pub command: Option<String>,
}

/// Detect how the shell was invoked
pub fn detect_invocation_mode() -> InvocationMode {
    // Check command line arguments
    let args = std::env::args().collect::<Vec<_>>();
    if args.iter().any(|arg| arg == "--shell") {
        return InvocationMode::Shell;
    }
    
    // Check if we're a login shell (argv[0] starts with -)
    if let Some(arg0) = args.first() {
        if arg0.starts_with('-') {
            return InvocationMode::Shell;
        }
    }
    
    // Check SHELL environment variable
    if let Ok(shell_var) = std::env::var("SHELL") {
        if let Some(arg0) = args.first() {
            if shell_var.contains("gemini-shell") || arg0.contains("gemini-shell") {
                return InvocationMode::Shell;
            }
        }
    }
    
    // Check parent process (simplified detection)
    // In a real implementation, we'd check if ppid == 1 or if parent is a login process
    
    InvocationMode::Cli
}

#[derive(Debug, Clone, PartialEq)]
pub enum InvocationMode {
    /// Traditional CLI mode (gemini command from another shell)
    Cli,
    /// Shell mode (set as login shell or --shell flag)
    Shell,
}