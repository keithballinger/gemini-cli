# Gemini Shell Enhanced UI Features

The enhanced UI mode provides a rich terminal experience with mouse support and advanced keybindings inspired by popular shells and editors.

## Activation

Run the shell with the `--enhanced` flag:
```bash
./gemini-shell --enhanced
```

## Mouse Support

- **Click to position cursor**: Click anywhere in the command line to move the cursor
- **Drag to select text**: Click and drag to select text (with visual highlighting)
- **Scroll wheel**: Use mouse wheel to navigate through command history

## Keyboard Shortcuts

### Navigation
- `Ctrl+A` - Move to beginning of line
- `Ctrl+E` - Move to end of line
- `Alt+B` - Move backward one word
- `Alt+F` - Move forward one word
- `←/→` - Move cursor left/right
- `Home/End` - Jump to beginning/end of line

### Editing
- `Ctrl+K` - Kill (cut) from cursor to end of line
- `Ctrl+U` - Kill (cut) from beginning to cursor
- `Ctrl+W` - Delete word backward
- `Ctrl+Y` - Yank (paste) previously killed text
- `Backspace` - Delete character before cursor
- `Delete` - Delete character at cursor

### History
- `Ctrl+R` - Reverse incremental search through history
  - Type to search
  - `Ctrl+R` again to find next match
  - `Enter` to accept
  - `Esc` or `Ctrl+C` to cancel
- `↑/↓` - Navigate through command history

### Selection
- `Ctrl+Space` - Set mark for selection
- Move cursor to extend selection
- Selected text is highlighted

### Completion
- `Tab` - Command and history completion
  - Shows available completions
  - Tab again to cycle through options

### Control
- `Ctrl+C` - Cancel current line or exit if empty
- `Ctrl+D` - Exit shell if line is empty

## Visual Features

### Syntax Highlighting
- Commands are highlighted in purple when executed
- Prompt path is shown in gray
- Errors are displayed in red
- Gemini responses are shown in cyan boxes

### Search Interface
When in search mode (`Ctrl+R`):
- Yellow prompt shows `(reverse-i-search)`
- Matching commands are displayed as you type
- Visual feedback for search results

### Completion Display
When completions are active:
- Available options shown below command line
- Current selection highlighted in green
- Navigate with Tab

## Gemini Integration

The enhanced UI maintains all standard Gemini features:
- `g <query>` - Send queries to Gemini
- `_ <command>` - Analyze command output
- Natural language detection
- Response piping with `%%`

## Comparison with Standard UI

| Feature | Standard UI | Enhanced UI |
|---------|------------|-------------|
| Basic editing | ✓ | ✓ |
| History navigation | ✓ | ✓ |
| Mouse support | ✗ | ✓ |
| Reverse search | ✗ | ✓ |
| Word navigation | ✗ | ✓ |
| Kill/yank | ✗ | ✓ |
| Tab completion | ✗ | ✓ |
| Text selection | ✗ | ✓ |

## Technical Details

The enhanced UI uses:
- `crossterm` for advanced terminal control
- Raw mode for character-by-character input
- Mouse event capture and processing
- Async event handling for responsive UI
- Non-blocking input polling

## Future Enhancements

Planned features:
- Multi-line editing
- Syntax highlighting for commands
- Custom keybinding configuration
- Persistent completion history
- Integration with system clipboard
- Vi mode keybindings option