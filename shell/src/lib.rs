//! Gemini Shell - High-performance POSIX-compliant shell with AI integration
//!
//! This crate provides a complete shell implementation written in Rust that integrates
//! with the Gemini AI system for intelligent command assistance.

pub mod cli;
pub mod shell;
pub mod gemini;
pub mod ui;
pub mod bridge;
pub mod config;
pub mod utils;

// Re-export core types for easy access
pub use shell::{GeminiShell, ShellEnvironment, ShellOptions, ShellError, ShellResult};

pub use config::ShellConfig;

/// Version information
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const NAME: &str = env!("CARGO_PKG_NAME");