use clap::Parser;
use gemini_shell::{GeminiShell, ShellConfig, cli, ui::{SimpleShell, CleanShell}};
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
            if args.enhanced {
                println!("Enhanced UI enabled - mouse support, advanced keybindings");
                run_enhanced_shell(shell).await?;
            } else {
                run_unified_shell(shell).await?;
            }
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

async fn run_unified_shell(shell: GeminiShell) -> anyhow::Result<()> {
    let mut simple_shell = SimpleShell::new(shell);
    simple_shell.run().await
}

async fn run_enhanced_shell(shell: GeminiShell) -> anyhow::Result<()> {
    let mut clean_shell = CleanShell::new(shell);
    clean_shell.run().await
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

