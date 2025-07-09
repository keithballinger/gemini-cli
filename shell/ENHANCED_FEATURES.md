# Gemini Shell Enhanced Features

The enhanced mode provides additional shell features for improved productivity while maintaining clean, readable output.

## Activation

Run the shell with the `--enhanced` flag:
```bash
./gemini-shell --enhanced
```

## Enhanced Features

### Command History
- Type `history` to view all previous commands with numbers
- Use `!!` to execute the last command
- Use `!n` to execute command number n from history
- History is preserved across shell sessions

### Aliases
- Create aliases with `alias name='command'`
- View all aliases with `alias`
- View specific alias with `alias name`
- Aliases expand automatically when used

Examples:
```bash
alias ll='ls -la'
alias gc='git commit'
alias gs='git status'
```

### History Expansion
- `!!` - Execute the previous command
- `!5` - Execute the 5th command from history
- `!-2` - Execute the command before last

### Clean Output
- Minimal ANSI color codes for better readability
- Gray prompt with diamond (✦) separator
- Red error messages
- Cyan boxes for Gemini responses
- No terminal control sequences cluttering output

## Gemini Integration

The enhanced mode maintains all standard Gemini features:
- `g <query>` - Send queries to Gemini
- `_ <command>` - Analyze command output
- Natural language detection
- Clean formatted responses in cyan boxes

## Examples

```bash
# Create useful aliases
alias ll='ls -la'
alias ..='cd ..'
alias ...='cd ../..'

# Use history expansion
echo "Hello World"
!!  # Runs: echo "Hello World"

# View command history
history
!3  # Execute the 3rd command

# Gemini integration
g explain the ls command
g what is the weather today
```

## Benefits

1. **Clean Output** - No terminal control sequences or escape codes
2. **Simple Interface** - Standard readline-based input
3. **Productivity Features** - Aliases and history expansion
4. **Gemini Integration** - Clean, formatted AI responses
5. **Compatibility** - Works in all terminals without special support