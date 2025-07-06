//! Terminal UI implementation using ratatui

use super::{UIState, ResponseItem, ResponseType, ShellStatus, KeyMappings};
use crate::shell::{GeminiShell, ExecutionResult};
use anyhow::Result;
use crossterm::{
    event::{self, Event, KeyCode, KeyEvent, KeyModifiers},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    prelude::*,
    widgets::*,
    Terminal,
};
use std::io;
use tokio::sync::mpsc;

/// Main terminal UI handler
pub struct TerminalUI {
    terminal: Terminal<CrosstermBackend<io::Stdout>>,
    ui_state: UIState,
    shell: GeminiShell,
    command_tx: mpsc::UnboundedSender<String>,
    command_rx: mpsc::UnboundedReceiver<String>,
}

impl TerminalUI {
    /// Create a new terminal UI
    pub fn new(shell: GeminiShell) -> Result<Self> {
        enable_raw_mode()?;
        let mut stdout = io::stdout();
        execute!(stdout, EnterAlternateScreen)?;
        let backend = CrosstermBackend::new(stdout);
        let terminal = Terminal::new(backend)?;

        let (command_tx, command_rx) = mpsc::unbounded_channel();

        Ok(Self {
            terminal,
            ui_state: UIState::new(),
            shell,
            command_tx,
            command_rx,
        })
    }

    /// Run the terminal UI main loop
    pub async fn run(&mut self) -> Result<()> {
        loop {
            // Draw the UI
            let ui_state = self.ui_state.clone();
            self.terminal.draw(|f| Self::render_ui(f, &ui_state))?;

            // Handle events
            if self.handle_events().await? {
                break;
            }

            // Process any pending commands
            while let Ok(command) = self.command_rx.try_recv() {
                self.execute_command(command).await?;
            }

            // Small delay to prevent busy-waiting
            tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
        }

        Ok(())
    }

    /// Handle keyboard and other events
    async fn handle_events(&mut self) -> Result<bool> {
        // Check if there's an event available
        if event::poll(std::time::Duration::from_millis(10))? {
            if let Event::Key(key) = event::read()? {
                return self.handle_key_event(key).await;
            }
        }
        Ok(false)
    }

    /// Handle individual key events
    async fn handle_key_event(&mut self, key: KeyEvent) -> Result<bool> {
        // Check for quit conditions
        if KeyMappings::is_quit(&key) {
            return Ok(true);
        }

        // Handle other special keys
        if KeyMappings::is_help(&key) {
            self.ui_state.toggle_help();
            return Ok(false);
        }

        if KeyMappings::is_clear(&key) {
            self.ui_state.clear_responses();
            return Ok(false);
        }

        if KeyMappings::is_submit(&key) {
            let command = self.ui_state.take_input();
            if !command.trim().is_empty() {
                self.ui_state.add_to_history(command.clone());
                self.command_tx.send(command)?;
            }
            return Ok(false);
        }

        // Handle cursor movement and editing
        match key {
            KeyEvent {
                code: KeyCode::Left,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                self.ui_state.move_cursor_left();
            }
            KeyEvent {
                code: KeyCode::Right,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                self.ui_state.move_cursor_right();
            }
            KeyEvent {
                code: KeyCode::Up,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                self.ui_state.history_up();
            }
            KeyEvent {
                code: KeyCode::Down,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                self.ui_state.history_down();
            }
            KeyEvent {
                code: KeyCode::Home,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                self.ui_state.move_cursor_home();
            }
            KeyEvent {
                code: KeyCode::End,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                self.ui_state.move_cursor_end();
            }
            KeyEvent {
                code: KeyCode::Backspace,
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                self.ui_state.delete_char();
            }
            KeyEvent {
                code: KeyCode::Char(c),
                modifiers: KeyModifiers::NONE,
                ..
            } => {
                self.ui_state.insert_char(c);
            }
            KeyEvent {
                code: KeyCode::Char(c),
                modifiers: KeyModifiers::SHIFT,
                ..
            } => {
                self.ui_state.insert_char(c);
            }
            _ => {}
        }

        Ok(false)
    }

    /// Execute a command through the shell
    async fn execute_command(&mut self, command: String) -> Result<()> {
        self.ui_state.status = ShellStatus::Executing;

        // Add command to responses
        self.ui_state.add_response(ResponseItem {
            query: command.clone(),
            response: String::new(),
            collapsed: false,
            timestamp: chrono::Utc::now(),
            response_type: ResponseType::Command,
        });

        // Execute the command
        match self.shell.execute(&command).await {
            Ok(result) => {
                self.handle_execution_result(command, result).await;
            }
            Err(e) => {
                self.ui_state.add_response(ResponseItem {
                    query: command,
                    response: format!("Error: {}", e),
                    collapsed: false,
                    timestamp: chrono::Utc::now(),
                    response_type: ResponseType::Error,
                });
            }
        }

        self.ui_state.status = ShellStatus::Ready;
        Ok(())
    }

    /// Handle the result of command execution
    async fn handle_execution_result(&mut self, command: String, result: ExecutionResult) {
        let response_type = if result.exit_code == 0 {
            // Check if this was a Gemini command
            if command.starts_with('g') || command.starts_with('_') {
                ResponseType::Gemini
            } else {
                ResponseType::System
            }
        } else {
            ResponseType::Error
        };

        let response = if !result.stdout.is_empty() {
            result.stdout
        } else if !result.stderr.is_empty() {
            result.stderr
        } else {
            format!("Command completed with exit code: {}", result.exit_code)
        };

        self.ui_state.add_response(ResponseItem {
            query: command,
            response,
            collapsed: response_type == ResponseType::Gemini, // Auto-collapse Gemini responses
            timestamp: chrono::Utc::now(),
            response_type,
        });
    }

    /// Render the UI
    fn render_ui(frame: &mut Frame, ui_state: &UIState) {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Min(0),      // Response area
                Constraint::Length(3),   // Input area
                Constraint::Length(1),   // Status bar
            ])
            .split(frame.size());

        // Render responses area
        Self::render_responses(frame, chunks[0], ui_state);

        // Render input area
        Self::render_input(frame, chunks[1], ui_state);

        // Render status bar
        Self::render_status_bar(frame, chunks[2], ui_state);

        // Render help if shown
        if ui_state.show_help {
            Self::render_help(frame);
        }
    }

    /// Render the responses area
    fn render_responses(frame: &mut Frame, area: Rect, ui_state: &UIState) {
        if ui_state.responses.is_empty() {
            let welcome = Paragraph::new(vec![
                Line::from("🦀 Welcome to Gemini Shell"),
                Line::from(""),
                Line::from("Commands:"),
                Line::from("  • Normal shell commands work as expected"),
                Line::from("  • Prefix with 'g' for Gemini AI assistance"),
                Line::from("  • Press F1 or ? for help"),
                Line::from("  • Ctrl+C or Ctrl+D to quit"),
            ])
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .title("Welcome")
                    .border_style(Style::default().fg(Color::Blue)),
            )
            .wrap(Wrap { trim: true });

            frame.render_widget(welcome, area);
            return;
        }

        let responses: Vec<ListItem> = ui_state
            .responses
            .iter()
            .enumerate()
            .map(|(_, item)| {
                let color = match item.response_type {
                    ResponseType::Command => Color::Yellow,
                    ResponseType::Gemini => Color::Green,
                    ResponseType::Error => Color::Red,
                    ResponseType::System => Color::White,
                };

                let collapse_indicator = if item.collapsed { "▶" } else { "▼" };
                let timestamp = item.timestamp.format("%H:%M:%S");

                let mut lines = vec![Line::from(vec![
                    Span::styled(
                        format!("{} [{}] ", collapse_indicator, timestamp),
                        Style::default().fg(Color::DarkGray),
                    ),
                    Span::styled(&item.query, Style::default().fg(color).add_modifier(Modifier::BOLD)),
                ])];

                if !item.collapsed && !item.response.is_empty() {
                    // Add response lines
                    for line in item.response.lines().take(10) {
                        lines.push(Line::from(format!("  {}", line)));
                    }

                    if item.response.lines().count() > 10 {
                        lines.push(Line::from(
                            Span::styled("  ... (truncated)", Style::default().fg(Color::DarkGray))
                        ));
                    }
                }

                ListItem::new(lines).style(Style::default())
            })
            .collect();

        let responses_list = List::new(responses)
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .title("Command History")
                    .border_style(Style::default().fg(Color::Blue)),
            )
            .highlight_style(Style::default().add_modifier(Modifier::REVERSED));

        frame.render_widget(responses_list, area);
    }

    /// Render the input area
    fn render_input(frame: &mut Frame, area: Rect, ui_state: &UIState) {
        let prompt = format!("{}$ ", ui_state.current_dir);
        let input_text = format!("{}{}", prompt, ui_state.input);
        
        let input = Paragraph::new(input_text.as_str())
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .title("Input")
                    .border_style(Style::default().fg(Color::Green)),
            );

        frame.render_widget(input, area);

        // Set cursor position
        let cursor_x = area.x + 1 + prompt.len() as u16 + ui_state.cursor_pos as u16;
        let cursor_y = area.y + 1;
        frame.set_cursor(cursor_x, cursor_y);
    }

    /// Render the status bar
    fn render_status_bar(frame: &mut Frame, area: Rect, ui_state: &UIState) {
        let status_text = match &ui_state.status {
            ShellStatus::Ready => "Ready",
            ShellStatus::Executing => "Executing...",
            ShellStatus::WaitingForGemini => "Waiting for Gemini...",
            ShellStatus::Error(e) => e,
        };

        let gemini_status = if ui_state.gemini_available {
            "AI: ✓"
        } else {
            "AI: ✗"
        };

        let status_line = format!("{} | {} | F1: Help | Ctrl+L: Clear | Ctrl+C: Quit", 
                                 status_text, gemini_status);

        let status = Paragraph::new(status_line)
            .style(Style::default().bg(Color::Blue).fg(Color::White));

        frame.render_widget(status, area);
    }

    /// Render help overlay
    fn render_help(frame: &mut Frame) {
        let area = centered_rect(60, 70, frame.size());

        let help_text = vec![
            Line::from("Gemini Shell Help"),
            Line::from(""),
            Line::from("Navigation:"),
            Line::from("  ↑/↓    - Navigate command history"),
            Line::from("  ←/→    - Move cursor"),
            Line::from("  Home   - Move to beginning of line"),
            Line::from("  End    - Move to end of line"),
            Line::from(""),
            Line::from("Commands:"),
            Line::from("  Enter  - Execute command"),
            Line::from("  g ...  - Send to Gemini AI"),
            Line::from("  _ ...  - Analyze with Gemini"),
            Line::from(""),
            Line::from("Shortcuts:"),
            Line::from("  F1/?   - Toggle this help"),
            Line::from("  Ctrl+L - Clear responses"),
            Line::from("  Ctrl+C - Quit shell"),
            Line::from("  Ctrl+D - Quit shell"),
            Line::from(""),
            Line::from("Built-in Commands:"),
            Line::from("  cd, pwd, echo, export, exit"),
            Line::from("  history, alias, unalias, jobs"),
            Line::from(""),
            Line::from("Press F1 or ? to close"),
        ];

        let help = Paragraph::new(help_text)
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .title("Help")
                    .border_style(Style::default().fg(Color::Yellow)),
            )
            .wrap(Wrap { trim: true });

        frame.render_widget(Clear, area);
        frame.render_widget(help, area);
    }
}

impl Drop for TerminalUI {
    fn drop(&mut self) {
        let _ = disable_raw_mode();
        let _ = execute!(
            self.terminal.backend_mut(),
            LeaveAlternateScreen
        );
    }
}

/// Helper function to create a centered rectangle
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