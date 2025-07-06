//! Gemini AI integration module

pub mod client;
pub mod router;
pub mod response;

pub use client::GeminiClient;
pub use router::CommandRouter;
pub use response::ResponseHandler;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum CommandRoute {
    /// Execute as shell command
    Shell(String),
    /// Send to Gemini AI
    Gemini(String),
    /// Execute command and analyze with Gemini
    Analysis { command: String, query: String },
    /// Detected as natural language, send to Gemini
    NaturalLanguage(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeminiResponse {
    pub text: String,
    pub usage: Option<UsageMetadata>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageMetadata {
    pub total_tokens: u32,
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
}

impl GeminiResponse {
    pub fn new(text: String) -> Self {
        Self {
            text,
            usage: None,
            timestamp: chrono::Utc::now(),
        }
    }
}