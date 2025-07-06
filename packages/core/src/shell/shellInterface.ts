/**
 * Shell interface that bridges the new POSIX shell with existing CLI infrastructure
 */

import { ShellExecutor } from './executor.js';
import { ShellEnvironmentManager } from './environment.js';
import { ShellParser } from './parser.js';
import { JobControlManager } from './jobControl.js';
import { builtinRegistry } from './builtins/index.js';
import { ShellOptions, ParsedCommand, Pipeline } from './types.js';
import { ShellPersistence } from './persistence.js';
import { spawn } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

export interface ShellExecutionOptions {
  cwd: string;
  env?: Record<string, string>;
  abortSignal?: AbortSignal;
  onOutput?: (chunk: string) => void;
  onDebug?: (message: string) => void;
  captureWorkingDirectory?: boolean;
}

export interface ShellExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  signal?: string;
  error?: Error;
  aborted: boolean;
  finalWorkingDirectory?: string;
}

/**
 * High-level shell interface for the Gemini CLI
 */
export class GeminiShell {
  private parser: ShellParser;
  private executor: ShellExecutor;
  private environment: ShellEnvironmentManager;
  private jobControl: JobControlManager;
  private persistence: ShellPersistence;
  private options: ShellOptions;

  constructor(options: Partial<ShellOptions> = {}) {
    this.options = {
      interactiveMode: true,
      posixMode: true,
      debugMode: false,
      enableJobControl: true,
      enableHistory: true,
      enableAliases: true,
      enableGlobbing: true,
      historySize: 1000,
      maxJobs: 100,
      ...options
    };

    // Initialize components
    this.environment = new ShellEnvironmentManager(this.options);
    this.parser = new ShellParser();
    this.executor = new ShellExecutor(this.environment, this.options);
    this.jobControl = new JobControlManager(this.environment);
    this.persistence = new ShellPersistence();

    // Load persisted state in interactive mode
    if (this.options.interactiveMode) {
      this.loadState();
    }
  }

  /**
   * Load persisted shell state
   */
  private async loadState(): Promise<void> {
    try {
      await this.persistence.loadState(this.environment);
      await this.persistence.loadRCFile(this.environment);
    } catch (error) {
      console.error('Failed to load shell state:', error);
    }
  }

  /**
   * Save shell state
   */
  async saveState(): Promise<void> {
    if (this.options.interactiveMode) {
      await this.persistence.saveState(this.environment);
    }
  }

  /**
   * Execute a command string
   * This is the main entry point for command execution
   */
  async execute(
    commandString: string,
    options: ShellExecutionOptions
  ): Promise<ShellExecutionResult> {
    const result: ShellExecutionResult = {
      stdout: '',
      stderr: '',
      exitCode: 0,
      aborted: false
    };

    try {
      // Update working directory if different
      if (options.cwd && options.cwd !== this.environment.cwd) {
        this.environment.changeDirectory(options.cwd);
      }

      // Parse the command
      const commands = await this.parser.parse(commandString);
      if (commands.length === 0) {
        return result;
      }

      // Check if this is a pipeline
      if (commands.length > 1) {
        // Create a pipeline and execute it
        const pipeline: Pipeline = { commands };
        const exitCode = await this.executor.executePipeline(pipeline);
        result.exitCode = exitCode;
      } else {
        // Single command
        const cmdResult = await this.executeCommand(commands[0], options);
        result.stdout = cmdResult.stdout;
        result.stderr = cmdResult.stderr;
        result.exitCode = cmdResult.exitCode;
        result.signal = cmdResult.signal;
        result.error = cmdResult.error;
        result.aborted = cmdResult.aborted;
      }

      // Capture final working directory if requested
      if (options.captureWorkingDirectory) {
        result.finalWorkingDirectory = this.environment.cwd;
      }

      // Add to history
      this.environment.addToHistory(commandString);
      
      // Persist history in interactive mode
      if (this.options.interactiveMode) {
        await this.persistence.appendToHistory(commandString);
      }

    } catch (error) {
      result.error = error instanceof Error ? error : new Error(String(error));
      result.exitCode = 1;
    }

    return result;
  }

  /**
   * Execute a single parsed command
   */
  private async executeCommand(
    command: ParsedCommand,
    options: ShellExecutionOptions
  ): Promise<ShellExecutionResult> {
    const result: ShellExecutionResult = {
      stdout: '',
      stderr: '',
      exitCode: 0,
      aborted: false
    };

    try {
      // Use the executor for all commands
      const exitCode = await this.executor.execute(command, {
        onOutput: options.onOutput
      });
      result.exitCode = exitCode;
      
      // Update environment's last exit code
      this.environment.lastExitCode = exitCode;
    } catch (error) {
      result.error = error instanceof Error ? error : new Error(String(error));
      result.exitCode = 1;
      this.environment.lastExitCode = 1;
    }

    return result;
  }

  /**
   * Get the shell environment
   */
  getEnvironment(): ShellEnvironmentManager {
    return this.environment;
  }

  /**
   * Get command history
   */
  getHistory(): string[] {
    return this.environment.history;
  }

  /**
   * Check if a command is a builtin
   */
  isBuiltin(command: string): boolean {
    return builtinRegistry.has(command);
  }

  /**
   * Get list of all builtins
   */
  getBuiltins(): string[] {
    return builtinRegistry.list();
  }
}

/**
 * Legacy compatibility function that matches the existing executeShellCommand signature
 */
export async function executeShellCommandLegacy(
  commandToExecute: string,
  cwd: string,
  abortSignal: AbortSignal,
  onOutputChunk: (chunk: string) => void,
  onDebugMessage: (message: string) => void,
): Promise<{
  rawOutput: Buffer;
  output: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  error: Error | null;
  aborted: boolean;
}> {
  // Create a shell instance for this execution
  const shell = new GeminiShell({
    interactiveMode: false,
    enableHistory: false
  });

  const result = await shell.execute(commandToExecute, {
    cwd,
    abortSignal,
    onOutput: onOutputChunk,
    onDebug: onDebugMessage
  });

  // Convert to legacy format
  const output = result.stdout + (result.stderr ? '\n' + result.stderr : '');
  
  return {
    rawOutput: Buffer.from(output),
    output,
    exitCode: result.exitCode,
    signal: result.signal as NodeJS.Signals | null,
    error: result.error || null,
    aborted: result.aborted
  };
}