//! Configuration management

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShellConfig {
    // Shell behavior
    pub enable_job_control: bool,
    pub history_size: usize,
    pub prompt_format: String,
    
    // Gemini integration
    pub gemini_prefixes: Vec<String>,
    pub auto_analyze_errors: bool,
    pub default_collapsed: bool,
    
    // Features
    pub enable_aliases: bool,
    pub enable_globbing: bool,
    pub persist_history: bool,
}

impl Default for ShellConfig {
    fn default() -> Self {
        Self {
            enable_job_control: true,
            history_size: 1000,
            prompt_format: "${PWD} $ ".to_string(),
            gemini_prefixes: vec!["g ".to_string(), "_ ".to_string(), "? ".to_string()],
            auto_analyze_errors: false,
            default_collapsed: true,
            enable_aliases: true,
            enable_globbing: true,
            persist_history: true,
        }
    }
}