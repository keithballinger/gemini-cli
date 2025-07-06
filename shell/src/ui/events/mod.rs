//! Event handling for terminal UI

use anyhow::Result;
use tokio::sync::mpsc;

/// UI events that can be sent to the shell
#[derive(Debug, Clone)]
pub enum UIEvent {
    /// Execute a command
    ExecuteCommand(String),
    /// Toggle response collapsed state
    ToggleResponse(usize),
    /// Clear all responses
    ClearResponses,
    /// Toggle help panel
    ToggleHelp,
    /// Quit the application
    Quit,
}

/// Event handler for processing terminal events
pub struct EventHandler {
    event_tx: mpsc::UnboundedSender<UIEvent>,
    event_rx: mpsc::UnboundedReceiver<UIEvent>,
}

impl EventHandler {
    pub fn new() -> Self {
        let (event_tx, event_rx) = mpsc::unbounded_channel();
        Self { event_tx, event_rx }
    }

    /// Get a sender for UI events
    pub fn sender(&self) -> mpsc::UnboundedSender<UIEvent> {
        self.event_tx.clone()
    }

    /// Try to receive the next event
    pub fn try_recv(&mut self) -> Option<UIEvent> {
        self.event_rx.try_recv().ok()
    }

    /// Send an event
    pub fn send(&self, event: UIEvent) -> Result<()> {
        self.event_tx.send(event)?;
        Ok(())
    }
}

impl Default for EventHandler {
    fn default() -> Self {
        Self::new()
    }
}