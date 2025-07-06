//! Terminal UI module for interactive shell interface

pub mod terminal;
pub mod components;
pub mod events;
pub mod renderer;

pub use terminal::TerminalUI;
pub use events::{UIEvent, EventHandler};
pub use components::{ShellPrompt, ResponsePanel, StatusBar};

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

/// Main UI state and management
#[derive(Debug, Clone)]
pub struct UIState {
    /// Current input being typed
    pub input: String,
    /// Cursor position in input
    pub cursor_pos: usize,
    /// Command history for up/down navigation
    pub command_history: Vec<String>,
    /// Current position in history
    pub history_pos: Option<usize>,
    /// AI responses with collapsible state
    pub responses: Vec<ResponseItem>,
    /// Current working directory
    pub current_dir: String,
    /// Shell status
    pub status: ShellStatus,
    /// Whether Gemini is available
    pub gemini_available: bool,
    /// Show help panel
    pub show_help: bool,
}

#[derive(Debug, Clone)]
pub struct ResponseItem {
    /// The query that generated this response
    pub query: String,
    /// The AI response text
    pub response: String,
    /// Whether this response is collapsed
    pub collapsed: bool,
    /// Timestamp of response
    pub timestamp: chrono::DateTime<chrono::Utc>,
    /// Response type
    pub response_type: ResponseType,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ResponseType {
    Command,
    Gemini,
    Error,
    System,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ShellStatus {
    Ready,
    Executing,
    WaitingForGemini,
    Error(String),
}

impl UIState {
    pub fn new() -> Self {
        Self {
            input: String::new(),
            cursor_pos: 0,
            command_history: Vec::new(),
            history_pos: None,
            responses: Vec::new(),
            current_dir: std::env::current_dir()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
            status: ShellStatus::Ready,
            gemini_available: false,
            show_help: false,
        }
    }

    /// Add a character at cursor position
    pub fn insert_char(&mut self, c: char) {
        self.input.insert(self.cursor_pos, c);
        self.cursor_pos += 1;
    }

    /// Delete character before cursor
    pub fn delete_char(&mut self) {
        if self.cursor_pos > 0 {
            self.input.remove(self.cursor_pos - 1);
            self.cursor_pos -= 1;
        }
    }

    /// Move cursor left
    pub fn move_cursor_left(&mut self) {
        if self.cursor_pos > 0 {
            self.cursor_pos -= 1;
        }
    }

    /// Move cursor right
    pub fn move_cursor_right(&mut self) {
        if self.cursor_pos < self.input.len() {
            self.cursor_pos += 1;
        }
    }

    /// Move cursor to beginning of line
    pub fn move_cursor_home(&mut self) {
        self.cursor_pos = 0;
    }

    /// Move cursor to end of line
    pub fn move_cursor_end(&mut self) {
        self.cursor_pos = self.input.len();
    }

    /// Clear current input
    pub fn clear_input(&mut self) {
        self.input.clear();
        self.cursor_pos = 0;
        self.history_pos = None;
    }

    /// Get current input and clear it
    pub fn take_input(&mut self) -> String {
        let input = self.input.clone();
        self.clear_input();
        input
    }

    /// Navigate history up
    pub fn history_up(&mut self) {
        if self.command_history.is_empty() {
            return;
        }

        let new_pos = match self.history_pos {
            None => Some(self.command_history.len() - 1),
            Some(pos) => {
                if pos > 0 {
                    Some(pos - 1)
                } else {
                    Some(pos)
                }
            }
        };

        if let Some(pos) = new_pos {
            self.history_pos = Some(pos);
            self.input = self.command_history[pos].clone();
            self.cursor_pos = self.input.len();
        }
    }

    /// Navigate history down
    pub fn history_down(&mut self) {
        match self.history_pos {
            None => {}
            Some(pos) => {
                if pos < self.command_history.len() - 1 {
                    let new_pos = pos + 1;
                    self.history_pos = Some(new_pos);
                    self.input = self.command_history[new_pos].clone();
                    self.cursor_pos = self.input.len();
                } else {
                    self.history_pos = None;
                    self.input.clear();
                    self.cursor_pos = 0;
                }
            }
        }
    }

    /// Add command to history
    pub fn add_to_history(&mut self, command: String) {
        if !command.trim().is_empty() && !self.command_history.contains(&command) {
            self.command_history.push(command);
        }
        self.history_pos = None;
    }

    /// Add response item
    pub fn add_response(&mut self, item: ResponseItem) {
        self.responses.push(item);
    }

    /// Toggle response collapsed state
    pub fn toggle_response(&mut self, index: usize) {
        if let Some(response) = self.responses.get_mut(index) {
            response.collapsed = !response.collapsed;
        }
    }

    /// Toggle help panel
    pub fn toggle_help(&mut self) {
        self.show_help = !self.show_help;
    }

    /// Clear all responses
    pub fn clear_responses(&mut self) {
        self.responses.clear();
    }
}

impl Default for UIState {
    fn default() -> Self {
        Self::new()
    }
}

/// Key mappings for the shell UI
pub struct KeyMappings;

impl KeyMappings {
    /// Check if key combination should quit the application
    pub fn is_quit(key: &KeyEvent) -> bool {
        matches!(
            key,
            KeyEvent {
                code: KeyCode::Char('c'),
                modifiers: KeyModifiers::CONTROL,
                ..
            } | KeyEvent {
                code: KeyCode::Char('d'),
                modifiers: KeyModifiers::CONTROL,
                ..
            }
        )
    }

    /// Check if key should toggle help
    pub fn is_help(key: &KeyEvent) -> bool {
        matches!(
            key,
            KeyEvent {
                code: KeyCode::F(1),
                modifiers: KeyModifiers::NONE,
                ..
            } | KeyEvent {
                code: KeyCode::Char('?'),
                modifiers: KeyModifiers::NONE,
                ..
            }
        )
    }

    /// Check if key should clear screen
    pub fn is_clear(key: &KeyEvent) -> bool {
        matches!(
            key,
            KeyEvent {
                code: KeyCode::Char('l'),
                modifiers: KeyModifiers::CONTROL,
                ..
            }
        )
    }

    /// Check if key should submit command
    pub fn is_submit(key: &KeyEvent) -> bool {
        matches!(
            key,
            KeyEvent {
                code: KeyCode::Enter,
                modifiers: KeyModifiers::NONE,
                ..
            }
        )
    }
}