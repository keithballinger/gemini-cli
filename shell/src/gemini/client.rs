//! Gemini AI client for communicating with Node.js service

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::process::Stdio;
use tokio::process::{Child, Command};
use anyhow::Result;

use super::{GeminiResponse, UsageMetadata};

#[derive(Debug, Serialize)]
struct QueryRequest {
    query: String,
    options: QueryOptions,
}

#[derive(Debug, Serialize)]
struct QueryOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    context: Option<String>,
}

#[derive(Debug, Deserialize)]
struct QueryResponse {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    response: Option<QueryResponseData>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct QueryResponseData {
    text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    metadata: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
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
        // First check if service is already running on default port 3001
        let default_port = 3001;
        self.service_url = format!("http://localhost:{}", default_port);
        
        if self.is_service_healthy().await? {
            println!("✅ Connected to existing Gemini service on port {}", default_port);
            return Ok(());
        }
        
        // If not, find an available port and start our own
        let port = self.find_available_port().await?;
        self.service_url = format!("http://localhost:{}", port);
        
        // Start the Node.js service
        let service_path = std::env::current_dir()?
            .join("nodejs-bridge")
            .join("src")
            .join("server.js");
            
        if !service_path.exists() {
            eprintln!("Warning: Gemini service not found at {:?}, running without AI integration", service_path);
            return Ok(());
        }
        
        let mut child = Command::new("node")
            .arg(&service_path)
            .env("GEMINI_BRIDGE_PORT", port.to_string())
            .env("GEMINI_BRIDGE_HOST", "localhost")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()?;
            
        // Give the service time to start
        tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
        
        // Check if service is healthy
        if !self.is_service_healthy().await? {
            child.kill().await?;
            return Err(anyhow::anyhow!("Failed to start Gemini service"));
        }
        
        self.service_process = Some(child);
        println!("Started new Gemini service on port {}", port);
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
        // Check if service is healthy instead of checking service_process
        if !self.is_service_healthy().await? {
            return Err(anyhow::anyhow!("Gemini service not available"));
        }

        let request = QueryRequest {
            query: prompt.to_string(),
            options: QueryOptions {
                context: None,
            },
        };
        
        let response = self.http
            .post(&format!("{}/query", self.service_url))
            .json(&request)
            .send()
            .await?;
            
        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Gemini service error: {}", response.status()));
        }
        
        let query_response: QueryResponse = response.json().await?;
        
        if !query_response.success {
            return Err(anyhow::anyhow!("Gemini query failed: {}", 
                query_response.error.unwrap_or_else(|| "Unknown error".to_string())));
        }

        let response_data = query_response.response.ok_or_else(|| 
            anyhow::anyhow!("No response data received"))?;
        
        Ok(GeminiResponse {
            text: response_data.text,
            usage: response_data.usage,
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
        // We might be connected to an external service
        true
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