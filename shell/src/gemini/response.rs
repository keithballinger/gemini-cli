//! Response handling for Gemini interactions

use super::GeminiResponse;

/// Manages Gemini response history and formatting
pub struct ResponseHandler {
    history: Vec<GeminiResponse>,
    max_history: usize,
}

impl ResponseHandler {
    pub fn new() -> Self {
        Self {
            history: Vec::new(),
            max_history: 100,
        }
    }
    
    pub fn with_max_history(max_history: usize) -> Self {
        Self {
            history: Vec::new(),
            max_history,
        }
    }
    
    /// Store a new Gemini response
    pub fn store_response(&mut self, response: GeminiResponse) {
        self.history.push(response);
        
        // Keep history within limits
        if self.history.len() > self.max_history {
            self.history.remove(0);
        }
    }
    
    /// Get the last Gemini response
    pub fn get_last_response(&self) -> Option<&str> {
        self.history.last().map(|r| r.text.as_str())
    }
    
    /// Get a specific response by index (0 = oldest, -1 = newest)
    pub fn get_response(&self, index: isize) -> Option<&str> {
        if index < 0 {
            let pos = (self.history.len() as isize + index) as usize;
            self.history.get(pos).map(|r| r.text.as_str())
        } else {
            self.history.get(index as usize).map(|r| r.text.as_str())
        }
    }
    
    /// Expand %% in commands with the last Gemini response
    pub fn expand_response_pipe(&self, command: &str) -> String {
        if let Some(last_response) = self.get_last_response() {
            // Extract just the text content, removing any formatting
            let clean_response = self.extract_plain_text(last_response);
            command.replace("%%", &clean_response)
        } else {
            command.to_string()
        }
    }
    
    /// Extract plain text from Gemini response, removing markdown and formatting
    fn extract_plain_text(&self, response: &str) -> String {
        // Remove markdown code blocks
        let mut cleaned = response.to_string();
        
        // Remove ```language and ``` markers
        cleaned = regex::Regex::new(r"```\w*\n?")
            .unwrap()
            .replace_all(&cleaned, "")
            .to_string();
        cleaned = cleaned.replace("```", "");
        
        // Remove markdown headers
        cleaned = regex::Regex::new(r"^#+\s*")
            .unwrap()
            .replace_all(&cleaned, "")
            .to_string();
        
        // Remove markdown bold/italic
        cleaned = regex::Regex::new(r"\*{1,2}([^*]+)\*{1,2}")
            .unwrap()
            .replace_all(&cleaned, "$1")
            .to_string();
        
        // Remove markdown links [text](url)
        cleaned = regex::Regex::new(r"\[([^\]]+)\]\([^)]+\)")
            .unwrap()
            .replace_all(&cleaned, "$1")
            .to_string();
        
        // Trim whitespace and normalize newlines
        cleaned.trim().to_string()
    }
    
    /// Format response for collapsible display
    pub fn format_collapsible(&self, response: &GeminiResponse, is_collapsed: bool) -> String {
        if is_collapsed {
            "▶ [Gemini analysis available - Ctrl+O to expand]".to_string()
        } else {
            format!(
                "╭─ ✦ Gemini ───────────────────────────────────── Ctrl+O to minimize ─╮\n│ {} │\n╰──────────────────────────────────────────────────────────────────────╯",
                self.wrap_text(&response.text, 66)
            )
        }
    }
    
    /// Wrap text to fit within specified width
    fn wrap_text(&self, text: &str, width: usize) -> String {
        let mut result = String::new();
        let mut current_line = String::new();
        
        for word in text.split_whitespace() {
            if current_line.len() + word.len() + 1 > width {
                if !current_line.is_empty() {
                    result.push_str(&format!("{}│\n│ ", current_line));
                    current_line.clear();
                }
            }
            
            if !current_line.is_empty() {
                current_line.push(' ');
            }
            current_line.push_str(word);
        }
        
        if !current_line.is_empty() {
            result.push_str(&current_line);
        }
        
        result
    }
    
    /// Get all responses in chronological order
    pub fn get_all_responses(&self) -> &[GeminiResponse] {
        &self.history
    }
    
    /// Clear response history
    pub fn clear_history(&mut self) {
        self.history.clear();
    }
    
    /// Get the number of stored responses
    pub fn len(&self) -> usize {
        self.history.len()
    }
    
    /// Check if there are any stored responses
    pub fn is_empty(&self) -> bool {
        self.history.is_empty()
    }
}

impl Default for ResponseHandler {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_response_storage() {
        let mut handler = ResponseHandler::new();
        
        let response = GeminiResponse::new("Test response".to_string());
        handler.store_response(response);
        
        assert_eq!(handler.len(), 1);
        assert_eq!(handler.get_last_response(), Some("Test response"));
    }
    
    #[test]
    fn test_response_pipe_expansion() {
        let mut handler = ResponseHandler::new();
        
        let response = GeminiResponse::new("echo hello world".to_string());
        handler.store_response(response);
        
        let expanded = handler.expand_response_pipe("sh -c '%%'");
        assert_eq!(expanded, "sh -c 'echo hello world'");
    }
    
    #[test]
    fn test_plain_text_extraction() {
        let handler = ResponseHandler::new();
        
        let markdown = "```bash\necho hello\n```\n\n**Bold text** and *italic*";
        let plain = handler.extract_plain_text(markdown);
        
        assert_eq!(plain, "echo hello\n\nBold text and italic");
    }
    
    #[test]
    fn test_history_limits() {
        let mut handler = ResponseHandler::with_max_history(2);
        
        handler.store_response(GeminiResponse::new("Response 1".to_string()));
        handler.store_response(GeminiResponse::new("Response 2".to_string()));
        handler.store_response(GeminiResponse::new("Response 3".to_string()));
        
        assert_eq!(handler.len(), 2);
        assert_eq!(handler.get_last_response(), Some("Response 3"));
    }
}