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

async fn run_interactive_shell(shell: &mut GeminiShell) -> anyhow::Result<()> {
    use std::io::{self, Write};
    
    println!("Type 'help' for commands, 'exit' to quit");
    println!();
    
    // Try to initialize Gemini client
    match gemini_shell::gemini::GeminiClient::new().await {
        Ok(client) => {
            shell.with_gemini(client).await;
            println!("✅ Gemini AI integration enabled");
        }
        Err(e) => {
            eprintln!("⚠️  Gemini AI not available: {}", e);
            eprintln!("   Shell will work without AI features");
        }
    }
    
    println!();
    
    // Main shell loop
    loop {
        // Display prompt
        let prompt = format!("{}$ ", shell.current_dir());
        print!("{}", prompt);
        io::stdout().flush()?;
        
        // Read input
        let mut input = String::new();
        match io::stdin().read_line(&mut input) {
            Ok(0) => break, // EOF
            Ok(_) => {
                let input = input.trim();
                if input.is_empty() {
                    continue;
                }
                
                // Execute command
                match shell.execute(input).await {
                    Ok(result) => {
                        if !result.stdout.is_empty() {
                            print!("{}", result.stdout);
                        }
                        if !result.stderr.is_empty() {
                            eprint!("{}", result.stderr);
                        }
                    }
                    Err(e) => {
                        if e.to_string().contains("Shell exit requested") {
                            break;
                        }
                        eprintln!("Error: {}", e);
                    }
                }
            }
            Err(e) => {
                eprintln!("Error reading input: {}", e);
                break;
            }
        }
    }
    
    println!("Goodbye!");
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
