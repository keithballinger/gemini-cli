# How to Try the Gemini POSIX Shell

## Quick Start

### 1. Build the Project
```bash
npm install
npm run build
```

### 2. Try the Test Shell
```bash
node test-shell.js
```

This will start a basic POSIX shell where you can test commands like:
```bash
✦ pwd
✦ cd /tmp
✦ echo "Hello from Gemini Shell!"
✦ ls -la | grep .json
✦ export MY_VAR="test"
✦ echo $MY_VAR
✦ exit
```

### 3. Use with the Full Gemini CLI

The shell is integrated into the main Gemini CLI. To use it:

#### Option A: Shell Mode Flag
```bash
# Run Gemini in shell mode
./packages/cli/dist/cli.js --shell
```

#### Option B: Set as Login Shell (Advanced)
```bash
# First, create a symlink to the CLI
sudo ln -s $(pwd)/packages/cli/dist/cli.js /usr/local/bin/gemini-shell

# Then set it as your shell (be careful!)
chsh -s /usr/local/bin/gemini-shell
```

## Features to Try

### 1. Persistent Working Directory
```bash
✦ cd ~/Desktop
✦ pwd
# The directory change persists!
```

### 2. Variable Expansion
```bash
✦ export PROJECT="my-awesome-project"
✦ echo "Working on $PROJECT"
✦ echo "Home is ${HOME}"
```

### 3. Command Substitution
```bash
✦ echo "Current date: $(date)"
✦ echo "Files: $(ls | wc -l)"
```

### 4. Pipelines
```bash
✦ ls -la | grep -v node_modules | sort
✦ cat package.json | grep version
```

### 5. I/O Redirection
```bash
✦ echo "Hello" > test.txt
✦ echo "World" >> test.txt
✦ cat < test.txt
```

### 6. Background Jobs
```bash
✦ sleep 10 &
✦ jobs
✦ fg %1
```

### 7. Built-in Commands
```bash
✦ help              # Show available commands
✦ alias ll='ls -la' # Create an alias
✦ history           # Show command history
✦ env              # Display environment
```

### 8. AI Integration (in full CLI)
When running the full Gemini CLI in shell mode:
```bash
✦ g explain this error    # AI query with 'g' prefix
✦ _ what does ls do?      # AI query with '_' prefix
✦ what is node.js?        # Natural language detection
```

## Known Limitations

1. **Tab completion** - Not yet implemented
2. **Complex job control** - Basic support only
3. **Here documents** - Not yet supported
4. **Command execution in env** - The `env` command can display but not execute
5. **Source command** - Can read but not execute scripts yet

## Debug Mode

To see debug output:
```bash
DEBUG=1 node test-shell.js
```

## Architecture

The shell is built with:
- **Parser**: sh-syntax (WASM-based POSIX parser)
- **Executor**: Custom TypeScript implementation
- **Built-ins**: 13+ POSIX-compliant commands
- **Persistence**: History and state saved to `~/.config/gemini-shell/`

## Troubleshooting

If you encounter issues:

1. **Build errors**: Make sure you have Node.js 20+ and run `npm install`
2. **Permission errors**: The shell needs write access to `~/.config/gemini-shell/`
3. **Command not found**: External commands require proper PATH setup

## Next Steps

This is a fully functional POSIX shell with AI integration! While some advanced features are still being implemented, it's already quite capable for daily use. Try it out and see how it compares to your regular shell!