use clap::Parser;
use gemini_shell::{GeminiShell, ShellConfig, cli};
use tracing_subscriber;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::fmt::init();
    
    // Parse command line arguments
    let args = cli::Args::parse();
    
    // Detect invocation mode
    let invocation_mode = if args.shell {
        cli::InvocationMode::Shell
    } else {
        cli::detect_invocation_mode()
    };
    
    println!("🚀 Gemini Shell v{}", gemini_shell::VERSION);
    println!("Mode: {:?}", invocation_mode);
    
    // Create shell configuration
    let config = ShellConfig::default();
    
    // Create and run shell
    let mut shell = GeminiShell::new();
    
    match invocation_mode {
        cli::InvocationMode::Shell => {
            println!("Running in shell mode...");
            // TODO: Start interactive shell
            run_interactive_shell(&mut shell).await?;
        }
        cli::InvocationMode::Cli => {
            println!("Running in CLI mode...");
            if let Some(command) = args.command {
                // Execute single command
                execute_single_command(&mut shell, &command).await?;
            } else {
                // Start CLI interaction
                run_cli_mode(&mut shell).await?;
            }
        }
    }
    
    Ok(())
}

async fn run_interactive_shell(_shell: &mut GeminiShell) -> anyhow::Result<()> {
    println!("Interactive shell mode not yet implemented");
    println!("This will provide a full POSIX shell experience with AI integration");
    Ok(())
}

async fn execute_single_command(_shell: &mut GeminiShell, command: &str) -> anyhow::Result<()> {
    println!("Executing command: {}", command);
    println!("Command execution not yet implemented");
    Ok(())
}

async fn run_cli_mode(_shell: &mut GeminiShell) -> anyhow::Result<()> {
    println!("CLI mode not yet implemented");
    println!("This will provide traditional Gemini CLI functionality");
    Ok(())
}
