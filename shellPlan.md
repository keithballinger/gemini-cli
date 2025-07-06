# POSIX Shell Implementation Plan for Gemini CLI

## Overview

This document outlines the implementation plan for transforming Gemini CLI from its current pass-through shell mode into a POSIX-compliant shell with seamless AI integration. The new design eliminates mode switching and provides a unified shell + AI experience with smart command routing and collapsible AI responses.

## Current State

The Gemini CLI currently has a basic shell mode that:
- Toggles with the `!` command
- Passes commands directly to the system shell (bash/cmd.exe)
- Maintains separate shell command history
- Shows visual feedback (yellow border and prompt)
- Runs commands in isolation (no persistent state between commands)

## New Interface Vision

The updated shell interface will feature:
- **No mode switching**: Shell commands execute directly without `!` prefix
- **Smart routing**: Automatic detection of shell commands vs natural language
- **AI prefixes**: Use `g ` or `_ ` to explicitly trigger Gemini analysis
- **Collapsible responses**: AI responses appear in collapsible boxes (Ctrl+O to toggle)
- **Seamless integration**: Natural workflow between shell and AI assistance

## Development Workflow

### Task Management
1. **Before starting a task**: Review the task description and acceptance criteria
2. **During development**: Follow TDD principles, write tests first
3. **After completing a task**:
   - Mark the task as complete with `[x]` in this document
   - Add any implementation notes or decisions made
   - Update related architecture documents if needed
   - Run all tests to ensure nothing is broken
   - Commit changes with descriptive message (no AI attribution)

### Commit Guidelines
- Use conventional commit format: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- Example: `feat: implement command router with g and _ prefix support`
- Commit after each meaningful task or subtask completion
- Keep commits atomic and focused

### Progress Tracking
- Update this plan document in real-time as tasks are completed
- Add notes about any deviations from the original plan
- Document any blocked tasks or dependencies
- Include actual completion dates next to tasks

## Timeline

- **Total Duration**: 9-11 weeks (added Phase 0 for interface redesign)
- **Team Size**: 2-3 developers
- **Review Checkpoints**: End of each phase

## Phase 0: Interface Redesign (Week 1)

### Goals
- Implement the new smart shell interface without `!` mode
- Add collapsible Gemini response boxes
- Create command routing logic for shell vs AI

### Tasks

#### 0.1 Remove Shell Mode Toggle
- [ ] Remove `!` command toggle functionality
- [ ] Update prompt to always show shell-style prompt with current directory
- [ ] Remove yellow border and shell mode visual indicators
- [ ] Update input handling to process all commands directly

#### 0.2 Command Router Implementation
- [ ] Create `CommandRouter` class with routing logic
- [ ] Implement `g ` and `_ ` prefix detection for Gemini queries
- [ ] Add shell command parser integration for validation
- [ ] Implement natural language detection fallback
- [ ] Add configurable prefix patterns

#### 0.3 Collapsible Gemini Response UI
- [ ] Create `CollapsibleGeminiResponse` React/Ink component
- [ ] Implement box drawing with cyan borders
- [ ] Add collapse/expand state management
- [ ] Implement Ctrl+O global toggle functionality
- [ ] Add individual response toggle with Tab key
- [ ] Integrate with existing `MaxSizedBox` for overflow handling

#### 0.4 Update Message Types
- [ ] Add new history item types for AI-enhanced shell commands
- [ ] Update `HistoryItemDisplay` to handle new message types
- [ ] Implement response persistence and state tracking
- [ ] Add configuration for default collapsed state

### Deliverables
- Working shell interface without mode switching
- Collapsible AI response boxes with keyboard shortcuts
- Smart command routing between shell and AI
- Updated documentation for new interface

## Phase 1: Foundation (Weeks 2-3)

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
- [ ] Update `InputPrompt.tsx` to use POSIX shell by default
- [ ] Integrate with new command router from Phase 0
- [ ] Add configuration option for POSIX vs pass-through mode
- [ ] Ensure Gemini analysis works with shell command output

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

## Interface Testing Requirements

### Phase 0 Testing
- Verify `g ` and `_ ` prefixes trigger Gemini correctly
- Test natural language detection accuracy
- Ensure shell commands execute without `!` prefix
- Verify Ctrl+O toggles all Gemini responses
- Test response persistence across commands
- Validate collapsed/expanded state management

### Integration Examples
```bash
# Direct shell command
$ ls -la

# Explicit Gemini query
$ g what does the ls command do

# Shell command with AI analysis
$ _ find . -name "*.log" -size +100M

# Natural language detection
$ how do I compress these files

# Pipeline with AI assistance
$ ps aux | _ grep node
```

## Open Questions

1. Should we support bash-specific extensions?
2. How much of POSIX.1-2017 should we target?
3. Should other prefixes besides `g ` and `_ ` be configurable?
4. Should AI analysis be automatic for certain error conditions?
5. How should we handle ambiguous commands (valid shell command that looks like natural language)?

## Implementation Notes

### Phase 0 Notes
<!-- Add implementation notes here as tasks are completed -->

### Phase 1 Notes
<!-- Add implementation notes here as tasks are completed -->

### Phase 2 Notes
<!-- Add implementation notes here as tasks are completed -->

### Phase 3 Notes
<!-- Add implementation notes here as tasks are completed -->

### Phase 4 Notes
<!-- Add implementation notes here as tasks are completed -->

### Phase 5 Notes
<!-- Add implementation notes here as tasks are completed -->

### Phase 6 Notes
<!-- Add implementation notes here as tasks are completed -->

### Phase 7 Notes
<!-- Add implementation notes here as tasks are completed -->

### Phase 8 Notes
<!-- Add implementation notes here as tasks are completed -->

## Next Steps

1. Review and approve plan
2. Assign development team
3. Set up development environment
4. Begin Phase 0 implementation (Interface Redesign)