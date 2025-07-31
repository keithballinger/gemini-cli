# Gemini CLI Shell - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Installation](#installation)
3. [Basic Usage](#basic-usage)
4. [Shell Mode](#shell-mode)
5. [AI Integration](#ai-integration)
6. [Command Reference](#command-reference)
7. [Configuration](#configuration)
8. [Keyboard Shortcuts](#keyboard-shortcuts)
9. [Tips and Tricks](#tips-and-tricks)
10. [Troubleshooting](#troubleshooting)

## Getting Started

The Gemini CLI Shell is a powerful hybrid system that combines a traditional shell with AI capabilities. It can be used in two ways:

1. **As an AI Assistant** (CLI Mode): Get help with coding, ask questions, and execute tools
2. **As Your Login Shell** (Shell Mode): Replace bash/zsh with an AI-enhanced shell

### Quick Start

```bash
# Install globally
npm install -g @google/gemini-cli

# Run in CLI mode (AI assistant)
gemini

# Run in shell mode (login shell)
gemini --shell

# Ask a quick question
gemini "explain how grep works"
```

## Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Gemini API key (get one at [aistudio.google.com](https://aistudio.google.com))

### Installing via npm

```bash
npm install -g @google/gemini-cli
```

### Setting as Login Shell

To use Gemini as your default shell:

1. Add to `/etc/shells`:
   ```bash
   echo "$(which gemini)" | sudo tee -a /etc/shells
   ```

2. Change your default shell:
   ```bash
   chsh -s $(which gemini)
   ```

3. Set the shell mode environment variable in your profile:
   ```bash
   echo 'export GEMINI_SHELL_MODE=true' >> ~/.profile
   ```

### First-Time Setup

On first run, you'll be prompted to:
1. Enter your Gemini API key
2. Choose your preferred model (gemini-2.0-flash-exp recommended)
3. Configure basic settings

## Basic Usage

### CLI Mode (AI Assistant)

In CLI mode, Gemini acts as an interactive AI assistant:

```bash
# Start interactive session
gemini

# Ask a question
> How do I find large files in my system?

# Execute with confirmation
> Can you create a Python script that sorts images by date?

# Direct command
gemini "explain this error: undefined is not a function"
```

### Shell Mode (Login Shell)

In shell mode, Gemini acts as a full shell replacement:

```bash
# Normal shell commands work as expected
ls -la
cd ~/projects
git status

# Prefix with 'g ' for AI assistance
g how do I squash the last 3 commits?

# Use '?' prefix for quick questions
? what does chmod 755 mean?

# Use '_ ' for context-aware help
cat error.log
_ what's causing this error?
```

## Shell Mode

### Shell Features

Gemini Shell provides full POSIX compliance with these features:

- **Command Execution**: Run any program or script
- **Pipes and Redirection**: `ls | grep doc > files.txt`
- **Job Control**: `&`, `fg`, `bg`, `jobs`
- **Environment Variables**: `export PATH=$PATH:/new/path`
- **Aliases**: `alias ll='ls -la'`
- **History**: Up/down arrows, `Ctrl+R` for search
- **Tab Completion**: Complete files and commands
- **Glob Patterns**: `*.txt`, `**/*.js`

### Built-in Commands

| Command | Description |
|---------|-------------|
| `cd` | Change directory |
| `pwd` | Print working directory |
| `export` | Set environment variable |
| `alias` | Create command alias |
| `history` | Show command history |
| `jobs` | List background jobs |
| `fg` | Bring job to foreground |
| `bg` | Send job to background |
| `exit` | Exit the shell |

## AI Integration

### Invoking AI Assistance

There are three ways to invoke AI in shell mode:

1. **Explicit Prefixes**
   ```bash
   g write a function to calculate fibonacci numbers
   _ explain what this command does
   ? how do I use sed?
   ```

2. **Natural Language Detection**
   ```bash
   what files were modified today?
   explain how TCP works
   can you help me debug this?
   ```

3. **Pipeline Integration** 
   ```bash
   ls -la | g summarize these files
   cat log.txt | _ find errors in this log
   ```

### AI-Powered Tools

Gemini can execute various tools with your confirmation:

- **File Operations**: Read, write, edit files
- **Code Analysis**: Understand and modify code
- **System Commands**: Execute shell commands
- **Web Requests**: Fetch URLs and search
- **Project Analysis**: Understand project structure

Example:
```bash
g create a README for this project
# Gemini analyzes your project and creates a comprehensive README
```

### Context Awareness

In shell mode, Gemini understands your context:

```bash
cd ~/projects/my-app
g what does this project do?
# Gemini reads relevant files and explains the project

cat server.js
_ can you add error handling to this?
# Gemini sees the file content and suggests improvements
```

## Command Reference

### Gemini-Specific Commands

| Command | Description | Example |
|---------|-------------|---------|
| `g <query>` | Ask Gemini anything | `g how do I use docker?` |
| `_ <query>` | Context-aware query | `_ explain this error` |
| `? <query>` | Quick question | `? what is npm?` |
| `/help` | Show help | `/help` |
| `/clear` | Clear screen | `/clear` |
| `/model` | Change AI model | `/model gemini-2.0-flash-exp` |
| `/config` | Edit configuration | `/config` |
| `/theme` | Change theme | `/theme` |

### Shell Command Examples

```bash
# File operations
ls -la | g which files are executables?
find . -name "*.log" | _ summarize these logs

# Git integration  
git log --oneline | g what has changed recently?
git diff | _ explain these changes

# System analysis
ps aux | g which process is using most memory?
df -h | _ do I need to free up space?

# Code assistance
g create a Python script to rename files by date
cat app.js | _ add JSDoc comments to all functions
```

## Configuration

### Configuration Files

Gemini uses a hierarchical configuration system:

1. **User Config**: `~/.gemini/config.json`
2. **Project Config**: `.gemini/config.json` in project root
3. **Environment Variables**: Override any setting

### Key Settings

```json
{
  "model": "gemini-2.0-flash-exp",
  "apiKey": "your-api-key",
  "shell": {
    "defaultMode": "shell",
    "historySize": 10000,
    "prompt": "$ "
  },
  "ui": {
    "theme": "dark",
    "streaming": true,
    "confirmTools": true
  },
  "tools": {
    "enabled": ["*"],
    "disabled": [],
    "requireConfirmation": true
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Your Gemini API key | - |
| `GEMINI_MODEL` | Default AI model | gemini-2.0-flash-exp |
| `GEMINI_SHELL_MODE` | Enable shell mode | false |
| `GEMINI_CONFIG_DIR` | Config directory | ~/.gemini |

## Keyboard Shortcuts

### Universal Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Cancel current operation |
| `Ctrl+D` | Exit (if line is empty) |
| `Ctrl+L` | Clear screen |
| `Ctrl+R` | Search history |
| `Tab` | Auto-complete |
| `↑/↓` | Navigate history |

### During AI Responses

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Collapse/expand response |
| `Esc` | Stop streaming |
| `Space` | Pause/resume streaming |

### In Editor Mode

| Shortcut | Action |
|----------|--------|
| `Ctrl+X` | Exit editor |
| `Ctrl+S` | Save and exit |
| `Ctrl+K` | Cut line |
| `Ctrl+U` | Paste |

## Tips and Tricks

### 1. Context is Key

The underscore prefix (`_`) uses context from previous commands:

```bash
curl api.example.com/data
_ parse this JSON and show me user names
```

### 2. Pipe to Gemini

Use Gemini in pipelines for intelligent filtering:

```bash
ls -la | g show only Python files modified this week
ps aux | _ which processes are consuming most CPU?
```

### 3. Quick Corrections

Let Gemini fix your commands:

```bash
$ gti status
command not found: gti
$ _ fix that command
Running: git status
```

### 4. Interactive Development

Use Gemini for live coding assistance:

```bash
$ g watch this file and suggest improvements
# Edit your code, and Gemini provides real-time feedback
```

### 5. Shell Scripting Help

```bash
g write a shell script that backs up my documents daily
# Gemini creates a complete script with cron setup instructions
```

### 6. Project Understanding

```bash
cd new-project
g analyze this codebase and create a development guide
```

### 7. Efficient Aliases

Create aliases for common AI queries:

```bash
alias explain='gemini "_ explain this command"'
alias fix='gemini "_ fix the error above"'
alias summarize='gemini "_ summarize this output"'
```

## Troubleshooting

### Common Issues

**"API key not found"**
```bash
export GEMINI_API_KEY="your-key-here"
# Or run: gemini /config
```

**"Command not found" in shell mode**
```bash
# Check PATH
echo $PATH
# Gemini preserves your original PATH, ensure it's correct
```

**"Shell mode not detected"**
```bash
# Run with explicit flag
gemini --shell
# Or set environment variable
export GEMINI_SHELL_MODE=true
```

**Performance issues**
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
# Check with: gemini /stats
```

### Debug Mode

Enable debug logging:

```bash
export DEBUG=gemini:*
gemini --shell
```

### Getting Help

1. **In-app help**: Type `/help` or `g help`
2. **Documentation**: Visit the project repository
3. **Report issues**: Use `gemini /feedback`

### Reset Configuration

If you need to start fresh:

```bash
# Backup current config
cp -r ~/.gemini ~/.gemini.backup

# Reset to defaults
rm -rf ~/.gemini
gemini /config
```

## Advanced Usage

### Custom Tools

Create project-specific tools in `.gemini/tools/`:

```javascript
// .gemini/tools/deploy.js
module.exports = {
  name: 'deploy',
  description: 'Deploy the application',
  parameters: {
    environment: { type: 'string', required: true }
  },
  execute: async ({ environment }) => {
    // Your deployment logic
  }
}
```

### MCP Servers

Integrate external tools via Model Context Protocol:

```json
{
  "mcpServers": {
    "sqlite": {
      "command": ["mcp-server-sqlite", "database.db"]
    }
  }
}
```

### Workflow Automation

Combine shell and AI for powerful workflows:

```bash
# Daily standup helper
alias standup='git log --since=yesterday --author=$(git config user.name) --oneline | g summarize my work for standup'

# Code review assistant  
alias review='git diff main | g review this code and suggest improvements'

# Documentation generator
alias docs='g analyze this directory and update the documentation'
```

---

Remember: Gemini CLI Shell is designed to enhance, not replace, your command-line expertise. It works best when you combine your shell knowledge with AI assistance for a more productive development experience.