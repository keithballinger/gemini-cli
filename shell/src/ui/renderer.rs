//! Rendering utilities and layout management

use super::{UIState, components::*};
use ratatui::prelude::*;

/// Main renderer for the shell UI
pub struct UIRenderer;

impl UIRenderer {
    /// Render the complete UI
    pub fn render(frame: &mut Frame, ui_state: &UIState) {
        let chunks = Self::create_layout(frame.size());

        // Render main components
        Self::render_responses(frame, chunks[0], ui_state);
        Self::render_input(frame, chunks[1], ui_state);
        Self::render_status_bar(frame, chunks[2], ui_state);

        // Render overlays
        if ui_state.show_help {
            Self::render_help_overlay(frame);
        }
    }

    /// Create the main layout
    fn create_layout(area: Rect) -> Vec<Rect> {
        Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Min(0),      // Response area
                Constraint::Length(3),   // Input area
                Constraint::Length(1),   // Status bar
            ])
            .split(area)
            .to_vec()
    }

    /// Render the responses area
    fn render_responses(frame: &mut Frame, area: Rect, ui_state: &UIState) {
        let response_panel = ResponsePanel::new(ui_state.responses.clone());
        response_panel.render(frame, area);
    }

    /// Render the input area
    fn render_input(frame: &mut Frame, area: Rect, ui_state: &UIState) {
        let prompt = ShellPrompt::new(
            ui_state.current_dir.clone(),
            ui_state.input.clone(),
            ui_state.cursor_pos,
        );
        prompt.render(frame, area);
    }

    /// Render the status bar
    fn render_status_bar(frame: &mut Frame, area: Rect, ui_state: &UIState) {
        let status_bar = StatusBar::new(
            ui_state.status.clone(),
            ui_state.gemini_available,
            ui_state.responses.len(),
        );
        status_bar.render(frame, area);
    }

    /// Render help overlay
    fn render_help_overlay(frame: &mut Frame) {
        let area = Self::centered_rect(60, 70, frame.size());
        HelpOverlay::render(frame, area);
    }

    /// Create a centered rectangle
    fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
        let popup_layout = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Percentage((100 - percent_y) / 2),
                Constraint::Percentage(percent_y),
                Constraint::Percentage((100 - percent_y) / 2),
            ])
            .split(r);

        Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Percentage((100 - percent_x) / 2),
                Constraint::Percentage(percent_x),
                Constraint::Percentage((100 - percent_x) / 2),
            ])
            .split(popup_layout[1])[1]
    }
}