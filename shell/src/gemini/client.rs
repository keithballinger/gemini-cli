//! Gemini AI client for communicating with Node.js service

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::process::Stdio;
use tokio::process::{Child, Command};
use anyhow::Result;

use super::{GeminiResponse, UsageMetadata};

#[derive(Debug, Serialize)]
struct QueryRequest {
    prompt: String,
    context: Option<String>,
}

#[derive(Debug, Deserialize)]
struct QueryResponse {
    text: String,
    usage: Option<UsageMetadata>,
}

#[derive(Debug, Serialize)]
struct AnalysisRequest {
    command: String,
    output: String,
    query: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AnalysisResponse {
    analysis: String,
    suggestions: Option<Vec<String>>,
}

/// Client for communicating with the Node.js Gemini service
pub struct GeminiClient {
    http: Client,
    service_url: String,
    service_process: Option<Child>,
}

impl GeminiClient {
    /// Create a new Gemini client and start the Node.js service
    pub async fn new() -> Result<Self> {
        let mut client = Self {
            http: Client::new(),
            service_url: String::new(),
            service_process: None,
        };
        
        client.start_service().await?;
        Ok(client)
    }
    
    /// Start the Node.js Gemini service
    async fn start_service(&mut self) -> Result<()> {
        // Find an available port
        let port = self.find_available_port().await?;
        self.service_url = format!("http://localhost:{}", port);
        
        // Start the Node.js service
        let service_path = std::env::current_dir()?
            .join("gemini-service")
            .join("dist")
            .join("server.js");
            
        if !service_path.exists() {
            tracing::warn!("Gemini service not found at {:?}, running without AI integration", service_path);
            return Ok(());
        }
        
        let mut child = Command::new("node")
            .arg(&service_path)
            .arg("--port")
            .arg(port.to_string())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;
            
        // Give the service time to start
        tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
        
        // Check if service is healthy
        if !self.is_service_healthy().await? {
            child.kill().await?;
            return Err(anyhow::anyhow!("Failed to start Gemini service"));
        }
        
        self.service_process = Some(child);
        tracing::info!("Gemini service started on port {}", port);
        Ok(())
    }
    
    /// Find an available port for the service
    async fn find_available_port(&self) -> Result<u16> {
        // Simple port finding - try ports 3000-3100
        for port in 3000..3100 {
            if self.is_port_available(port).await {
                return Ok(port);
            }
        }
        Err(anyhow::anyhow!("No available ports found"))
    }
    
    /// Check if a port is available
    async fn is_port_available(&self, port: u16) -> bool {
        tokio::net::TcpListener::bind(("127.0.0.1", port)).await.is_ok()
    }
    
    /// Check if the service is healthy
    async fn is_service_healthy(&self) -> Result<bool> {
        match self.http.get(&format!("{}/health", self.service_url)).send().await {
            Ok(response) => Ok(response.status().is_success()),
            Err(_) => Ok(false),
        }
    }
    
    /// Send a query to Gemini
    pub async fn query(&self, prompt: &str) -> Result<GeminiResponse> {
        let request = QueryRequest {
            prompt: prompt.to_string(),
            context: None,
        };
        
        let response = self.http
            .post(&format!("{}/api/query", self.service_url))
            .json(&request)
            .send()
            .await?;
            
        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Gemini service error: {}", response.status()));
        }
        
        let query_response: QueryResponse = response.json().await?;
        
        Ok(GeminiResponse {
            text: query_response.text,
            usage: query_response.usage,
            timestamp: chrono::Utc::now(),
        })
    }
    
    /// Analyze a command and its output
    pub async fn analyze_command(&self, command: &str, output: &str, query: Option<&str>) -> Result<GeminiResponse> {
        let request = AnalysisRequest {
            command: command.to_string(),
            output: output.to_string(),
            query: query.map(|s| s.to_string()),
        };
        
        let response = self.http
            .post(&format!("{}/api/analyze", self.service_url))
            .json(&request)
            .send()
            .await?;
            
        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Gemini service error: {}", response.status()));
        }
        
        let analysis_response: AnalysisResponse = response.json().await?;
        
        Ok(GeminiResponse {
            text: analysis_response.analysis,
            usage: None,
            timestamp: chrono::Utc::now(),
        })
    }
    
    /// Check if Gemini integration is available
    pub fn is_available(&self) -> bool {
        self.service_process.is_some()
    }
}

impl Drop for GeminiClient {
    fn drop(&mut self) {
        if let Some(mut child) = self.service_process.take() {
            // Attempt to gracefully shutdown the service
            let _ = tokio::task::spawn(async move {
                let _ = child.kill().await;
            });
        }
    }
}