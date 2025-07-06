//! UI components for the terminal interface

use super::{ResponseItem, ResponseType, ShellStatus};
use ratatui::{
    prelude::*,
    widgets::*,
};

/// Shell prompt component
pub struct ShellPrompt {
    current_dir: String,
    input: String,
    cursor_pos: usize,
}

impl ShellPrompt {
    pub fn new(current_dir: String, input: String, cursor_pos: usize) -> Self {
        Self {
            current_dir,
            input,
            cursor_pos,
        }
    }

    pub fn render(&self, frame: &mut Frame, area: Rect) {
        let prompt = format!("{}$ ", self.current_dir);
        let input_text = format!("{}{}", prompt, self.input);
        
        let input_widget = Paragraph::new(input_text.as_str())
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .title("Input")
                    .border_style(Style::default().fg(Color::Green)),
            );

        frame.render_widget(input_widget, area);

        // Set cursor position
        let cursor_x = area.x + 1 + prompt.len() as u16 + self.cursor_pos as u16;
        let cursor_y = area.y + 1;
        if cursor_x < area.x + area.width - 1 && cursor_y < area.y + area.height - 1 {
            frame.set_cursor(cursor_x, cursor_y);
        }
    }
}

/// Response panel component for displaying AI and command responses
pub struct ResponsePanel {
    responses: Vec<ResponseItem>,
}

impl ResponsePanel {
    pub fn new(responses: Vec<ResponseItem>) -> Self {
        Self { responses }
    }

    pub fn render(&self, frame: &mut Frame, area: Rect) {
        if self.responses.is_empty() {
            self.render_welcome(frame, area);
            return;
        }

        let responses: Vec<ListItem> = self
            .responses
            .iter()
            .enumerate()
            .map(|(_, item)| self.create_response_item(item))
            .collect();

        let responses_list = List::new(responses)
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .title("Command History & AI Responses")
                    .border_style(Style::default().fg(Color::Blue)),
            )
            .highlight_style(Style::default().add_modifier(Modifier::REVERSED));

        frame.render_widget(responses_list, area);
    }

    fn render_welcome(&self, frame: &mut Frame, area: Rect) {
        let welcome = Paragraph::new(vec![
            Line::from(Span::styled(
                "🦀 Welcome to Gemini Shell",
                Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD),
            )),
            Line::from(""),
            Line::from("Features:"),
            Line::from("  • Full POSIX shell with AI integration"),
            Line::from("  • All standard shell commands work"),
            Line::from("  • Prefix commands with 'g' for AI assistance"),
            Line::from("  • Use '_' prefix for command analysis"),
            Line::from("  • %% to pipe AI responses to commands"),
            Line::from(""),
            Line::from("Built-in Commands:"),
            Line::from("  cd, pwd, echo, export, exit, jobs, history, alias, unalias"),
            Line::from(""),
            Line::from("Shortcuts:"),
            Line::from("  F1 - Help | Ctrl+L - Clear | Ctrl+C/D - Quit"),
            Line::from(""),
            Line::from(Span::styled(
                "Start typing a command below!",
                Style::default().fg(Color::Yellow).add_modifier(Modifier::ITALIC),
            )),
        ])
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title("Welcome")
                .border_style(Style::default().fg(Color::Blue)),
        )
        .wrap(Wrap { trim: true });

        frame.render_widget(welcome, area);
    }

    fn create_response_item(&self, item: &ResponseItem) -> ListItem {
        let color = match item.response_type {
            ResponseType::Command => Color::Yellow,
            ResponseType::Gemini => Color::Green,
            ResponseType::Error => Color::Red,
            ResponseType::System => Color::White,
        };

        let collapse_indicator = if item.collapsed { "▶" } else { "▼" };
        let timestamp = item.timestamp.format("%H:%M:%S");
        let type_indicator = match item.response_type {
            ResponseType::Command => "cmd",
            ResponseType::Gemini => "ai",
            ResponseType::Error => "err",
            ResponseType::System => "sys",
        };

        let mut lines = vec![Line::from(vec![
            Span::styled(
                format!("{} ", collapse_indicator),
                Style::default().fg(Color::DarkGray),
            ),
            Span::styled(
                format!("[{}] ", timestamp),
                Style::default().fg(Color::DarkGray),
            ),
            Span::styled(
                format!("[{}] ", type_indicator),
                Style::default().fg(color),
            ),
            Span::styled(item.query.clone(), Style::default().fg(color).add_modifier(Modifier::BOLD)),
        ])];

        if !item.collapsed && !item.response.is_empty() {
            // Add response lines with smart truncation
            let response_lines: Vec<&str> = item.response.lines().collect();
            let line_count = response_lines.len();
            
            let display_lines = if line_count > 15 {
                let mut lines = response_lines[..10].to_vec();
                lines.push("  ...");
                lines.extend_from_slice(&response_lines[line_count-5..]);
                lines
            } else {
                response_lines
            };

            for line in display_lines {
                lines.push(Line::from(format!("  {}", line)));
            }

            if line_count > 15 {
                lines.push(Line::from(
                    Span::styled(
                        format!("  ({} total lines, {} shown)", line_count, 15),
                        Style::default().fg(Color::DarkGray).add_modifier(Modifier::ITALIC)
                    )
                ));
            }
        }

        ListItem::new(lines).style(Style::default())
    }
}

/// Status bar component
pub struct StatusBar {
    status: ShellStatus,
    gemini_available: bool,
    response_count: usize,
}

impl StatusBar {
    pub fn new(status: ShellStatus, gemini_available: bool, response_count: usize) -> Self {
        Self {
            status,
            gemini_available,
            response_count,
        }
    }

    pub fn render(&self, frame: &mut Frame, area: Rect) {
        let status_text = match &self.status {
            ShellStatus::Ready => "Ready",
            ShellStatus::Executing => "Executing...",
            ShellStatus::WaitingForGemini => "Waiting for Gemini...",
            ShellStatus::Error(e) => e,
        };

        let gemini_status = if self.gemini_available {
            "AI: ✓"
        } else {
            "AI: ✗"
        };

        let status_line = format!(
            "{} | {} | {} responses | F1: Help | Ctrl+L: Clear | Ctrl+C: Quit", 
            status_text, 
            gemini_status, 
            self.response_count
        );

        let status_widget = Paragraph::new(status_line)
            .style(Style::default().bg(Color::Blue).fg(Color::White));

        frame.render_widget(status_widget, area);
    }
}

/// Help overlay component
pub struct HelpOverlay;

impl HelpOverlay {
    pub fn render(frame: &mut Frame, area: Rect) {
        let help_text = vec![
            Line::from(Span::styled(
                "Gemini Shell Help",
                Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD),
            )),
            Line::from(""),
            Line::from(Span::styled("Navigation:", Style::default().add_modifier(Modifier::BOLD))),
            Line::from("  ↑/↓    - Navigate command history"),
            Line::from("  ←/→    - Move cursor"),
            Line::from("  Home   - Move to beginning of line"),
            Line::from("  End    - Move to end of line"),
            Line::from(""),
            Line::from(Span::styled("Commands:", Style::default().add_modifier(Modifier::BOLD))),
            Line::from("  Enter  - Execute command"),
            Line::from(vec![
                Span::raw("  "),
                Span::styled("g ", Style::default().fg(Color::Green).add_modifier(Modifier::BOLD)),
                Span::raw("...  - Send to Gemini AI"),
            ]),
            Line::from(vec![
                Span::raw("  "),
                Span::styled("_ ", Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)),
                Span::raw("...  - Analyze with Gemini"),
            ]),
            Line::from(vec![
                Span::raw("  "),
                Span::styled("%% ", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD)),
                Span::raw(" - Use last AI response"),
            ]),
            Line::from(""),
            Line::from(Span::styled("Shortcuts:", Style::default().add_modifier(Modifier::BOLD))),
            Line::from("  F1/?   - Toggle this help"),
            Line::from("  Ctrl+L - Clear responses"),
            Line::from("  Ctrl+C - Quit shell"),
            Line::from("  Ctrl+D - Quit shell"),
            Line::from(""),
            Line::from(Span::styled("Built-in Commands:", Style::default().add_modifier(Modifier::BOLD))),
            Line::from("  cd, pwd, echo, export, exit"),
            Line::from("  history, alias, unalias, jobs"),
            Line::from(""),
            Line::from(Span::styled(
                "Press F1 or ? to close",
                Style::default().fg(Color::Yellow).add_modifier(Modifier::ITALIC),
            )),
        ];

        let help_widget = Paragraph::new(help_text)
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .title("Help")
                    .border_style(Style::default().fg(Color::Yellow)),
            )
            .wrap(Wrap { trim: true });

        frame.render_widget(Clear, area);
        frame.render_widget(help_widget, area);
    }
}