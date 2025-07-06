# POSIX Shell Implementation Plan for Gemini CLI

## Overview

This document outlines the implementation plan for transforming Gemini CLI from its current pass-through shell mode into a POSIX-compliant shell while maintaining its AI capabilities. The implementation will be done in phases to ensure stability and backward compatibility.

## Current State

The Gemini CLI currently has a basic shell mode that:
- Toggles with the `!` command
- Passes commands directly to the system shell (bash/cmd.exe)
- Maintains separate shell command history
- Shows visual feedback (yellow border and prompt)
- Runs commands in isolation (no persistent state between commands)

## Timeline

- **Total Duration**: 8-10 weeks
- **Team Size**: 2-3 developers
- **Review Checkpoints**: End of each phase

## Phase 1: Foundation (Weeks 1-2)

### Goals
- Set up core shell infrastructure
- Implement basic command parsing
- Create minimal viable shell that improves on current pass-through

### Tasks

#### 1.1 Project Setup
- [ ] Create `packages/core/src/shell/` directory structure
- [ ] Set up TypeScript configurations for shell module
- [ ] Create base types and interfaces (`types.ts`)
- [ ] Set up unit test framework for shell components

#### 1.2 Command Parser
- [ ] Integrate sh-syntax library for command parsing (WASM-based)
- [ ] Create wrapper around sh-syntax for our needs
- [ ] Support simple commands (no pipes or redirections initially)
- [ ] Handle quoted strings (single and double quotes)
- [ ] Add basic error handling for malformed commands
- [ ] Set up WASM loading and initialization

#### 1.3 Command Executor
- [ ] Create `ShellExecutor` class
- [ ] Implement PATH resolution
- [ ] Execute simple external commands
- [ ] Capture and display command output
- [ ] Handle command not found errors
- [ ] Integrate with existing shellCommandProcessor.ts

#### 1.4 Shell Environment
- [ ] Create `ShellEnvironment` class
- [ ] Implement persistent environment variable storage
- [ ] Add persistent working directory tracking (fix current stateless issue)
- [ ] Store last exit code
- [ ] Integrate with existing shell history

### Deliverables
- Basic shell with persistent state between commands
- Proper cd command that maintains directory
- Unit tests for parser and executor
- Documentation for shell architecture

## Phase 2: Built-in Commands (Week 3)

### Goals
- Implement essential built-in commands
- Integrate with existing Gemini CLI

### Tasks

#### 2.1 Core Built-ins
- [ ] `cd` - Change directory with proper error handling
- [ ] `pwd` - Print working directory
- [ ] `echo` - Print arguments with escape sequence support
- [ ] `exit` - Exit shell with status code

#### 2.2 Environment Built-ins
- [ ] `export` - Set environment variables
- [ ] `unset` - Remove environment variables
- [ ] `env` - Display all environment variables

#### 2.3 Integration
- [ ] Modify `shellCommandProcessor.ts` to use new shell executor
- [ ] Update `InputPrompt.tsx` to use POSIX shell when in shell mode
- [ ] Maintain existing `!` toggle functionality
- [ ] Add configuration option for POSIX vs pass-through mode

### Deliverables
- Working built-in commands
- Integrated shell mode in Gemini CLI
- Tests for all built-in commands

## Phase 3: Variable Expansion & Quoting (Week 4)

### Goals
- Implement variable expansion
- Handle complex quoting scenarios

### Tasks

#### 3.1 Variable Expansion
- [ ] Implement `$VAR` and `${VAR}` expansion
- [ ] Handle special variables (`$?`, `$$`, `$#`, `$@`)
- [ ] Implement tilde expansion (`~` and `~user`)
- [ ] Add command substitution basics

#### 3.2 Advanced Quoting
- [ ] Handle escaped characters
- [ ] Implement ANSI-C quoting (`$'...'`)
- [ ] Process backquotes for command substitution
- [ ] Handle nested quoting scenarios

### Deliverables
- Full variable expansion support
- Comprehensive quoting handling
- Test suite for expansion and quoting

## Phase 4: Pipelines & Redirection (Weeks 5-6)

### Goals
- Implement POSIX pipelines
- Add I/O redirection support

### Tasks

#### 4.1 Pipeline Support
- [ ] Parse pipeline operators (`|`)
- [ ] Create pipe infrastructure
- [ ] Execute pipeline commands
- [ ] Handle pipeline error propagation
- [ ] Support multiple pipes

#### 4.2 I/O Redirection
- [ ] Implement output redirection (`>`, `>>`)
- [ ] Implement input redirection (`<`)
- [ ] Add error redirection (`2>`, `2>&1`)
- [ ] Handle file descriptor manipulation
- [ ] Support here documents (`<<`)

#### 4.3 Complex Command Parsing
- [ ] Support compound commands (`;`, `&&`, `||`)
- [ ] Handle parentheses for subshells
- [ ] Parse command grouping with braces

### Deliverables
- Working pipelines and redirection
- Complex command execution
- Integration tests for pipelines

## Phase 5: Job Control (Week 7)

### Goals
- Implement full job control
- Add signal handling

### Tasks

#### 5.1 Background Jobs
- [ ] Parse background operator (`&`)
- [ ] Implement job table management
- [ ] Create job status tracking
- [ ] Handle job completion notifications

#### 5.2 Job Control Commands
- [ ] `jobs` - List current jobs
- [ ] `fg` - Bring job to foreground
- [ ] `bg` - Resume job in background
- [ ] `kill` - Send signals to jobs

#### 5.3 Signal Handling
- [ ] Handle SIGINT (Ctrl+C)
- [ ] Handle SIGTSTP (Ctrl+Z)
- [ ] Implement signal forwarding to child processes
- [ ] Add proper cleanup on shell exit

### Deliverables
- Full job control implementation
- Signal handling infrastructure
- Job control test suite

## Phase 6: Advanced Features (Week 8)

### Goals
- Add remaining built-ins
- Implement aliases and functions

### Tasks

#### 6.1 Additional Built-ins
- [ ] `alias` / `unalias` - Command aliases
- [ ] `source` / `.` - Execute script in current shell
- [ ] `history` - Command history management
- [ ] `which` - Find command in PATH

#### 6.2 Shell Features
- [ ] Command history with arrow keys
- [ ] Tab completion for commands and files
- [ ] Implement `.bashrc` / `.geminirc` loading
- [ ] Add shell prompt customization

#### 6.3 Platform Support
- [ ] Enhance Windows compatibility
- [ ] Test on macOS and Linux
- [ ] Add browser shell emulation layer

### Deliverables
- Complete built-in command set
- Enhanced user experience features
- Cross-platform compatibility

## Phase 7: Testing & Documentation (Week 9)

### Goals
- Comprehensive testing
- Complete documentation

### Tasks

#### 7.1 Test Suite
- [ ] POSIX compliance test suite
- [ ] Performance benchmarks
- [ ] Integration tests with AI features
- [ ] Cross-platform testing

#### 7.2 Documentation
- [ ] User guide for shell features
- [ ] Developer documentation
- [ ] Migration guide from old shell mode
- [ ] POSIX compliance documentation

#### 7.3 Bug Fixes
- [ ] Address issues from testing
- [ ] Performance optimizations
- [ ] Edge case handling

### Deliverables
- Complete test coverage
- User and developer documentation
- Bug-free shell implementation

## Phase 8: Launch Preparation (Week 10)

### Goals
- Prepare for release
- Plan rollout strategy

### Tasks

#### 8.1 Release Preparation
- [ ] Create feature flags for gradual rollout
- [ ] Implement telemetry for shell usage
- [ ] Prepare release notes
- [ ] Update CLI help documentation

#### 8.2 Migration Support
- [ ] Create migration tools if needed
- [ ] Test upgrade path
- [ ] Prepare rollback plan
- [ ] Train support team

### Deliverables
- Release-ready shell feature
- Migration and rollback plans
- Updated documentation

## Risk Mitigation

### Technical Risks
1. **Cross-platform compatibility**: Mitigate with early testing and platform abstraction
2. **Performance impact**: Regular benchmarking and optimization
3. **Breaking changes**: Feature flags and gradual rollout

### Schedule Risks
1. **Complexity underestimation**: Built-in buffer time between phases
2. **Integration issues**: Continuous integration testing
3. **Resource availability**: Identify backup developers

## Success Metrics

1. **Functionality**: Pass 95% of POSIX shell compliance tests
2. **Performance**: Command execution within 10ms overhead
3. **Compatibility**: Zero breaking changes to existing features
4. **Adoption**: 50% of users using shell mode within 3 months
5. **Quality**: Less than 5 critical bugs in first month

## Dependencies

- Existing Gemini CLI codebase
- Platform abstraction layer
- Node.js child_process capabilities
- TypeScript 5.0+

### Core Libraries
- **sh-syntax** - WASM-based POSIX-compliant shell parser with AST generation (primary choice)
- **node-pty** - Pseudo-terminal support for proper job control and interactive commands
- **glob** - POSIX-compliant pathname expansion
- **minimist** or **yargs-parser** - Argument parsing for built-in commands

### Alternative/Supplementary Libraries to Evaluate
- **bash-parser** - Older JavaScript shell parser (fallback if sh-syntax has issues)
- **shell-quote** - Lightweight quote parsing and escaping
- **xterm.js** - Terminal emulation for enhanced UI (if needed)

## Open Questions

1. Should we support bash-specific extensions?
2. How much of POSIX.1-2017 should we target?
3. Should shell mode be opt-in or default?
4. Integration with AI features in pipelines?

## Next Steps

1. Review and approve plan
2. Assign development team
3. Set up development environment
4. Begin Phase 1 implementation