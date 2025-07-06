/**
 * Shell command executor
 * Handles execution of simple commands, pipelines, and compound commands
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { 
  Command, 
  ParsedCommand, 
  Pipeline, 
  CompoundCommand,
  ExecutionResult,
  ShellEnvironment,
  ShellOptions,
  CommandNotFoundError,
  ShellError
} from './types.js';
import { builtinRegistry } from './builtins/index.js';
import { resolveCommand } from './pathResolver.js';
import { expandVariables, expandGlobs } from './expansion.js';

export class ShellExecutor {
  constructor(
    private env: ShellEnvironment,
    private options: ShellOptions
  ) {}

  /**
   * Execute a parsed command
   */
  async execute(command: ParsedCommand, execOptions?: { onOutput?: (chunk: string) => void }): Promise<number> {
    try {
      // Expand variables and globs
      const expanded = await this.expandCommand(command);
      
      // Check if it's a builtin
      if (expanded.type === 'builtin' || builtinRegistry.has(expanded.executable || '')) {
        return this.executeBuiltin(expanded, execOptions);
      }
      
      // Execute as external command
      return this.executeExternal(expanded, execOptions);
    } catch (error) {
      if (error instanceof ShellError) {
        console.error(`gemini-shell: ${error.message}`);
        return error.exitCode;
      }
      console.error(`gemini-shell: ${error instanceof Error ? error.message : String(error)}`);
      return 1;
    }
  }

  /**
   * Execute multiple commands (pipeline or compound)
   */
  async executePipeline(pipeline: Pipeline, execOptions?: { onOutput?: (chunk: string) => void }): Promise<number> {
    // Use PipelineExecutor for proper pipeline handling
    const { PipelineExecutor } = await import('./pipelineExecutor.js');
    const pipelineExecutor = new PipelineExecutor(this, this.env, this.options);
    const result = await pipelineExecutor.execute(pipeline, {
      onOutput: execOptions?.onOutput
    });
    return result.exitCode;
  }

  /**
   * Execute compound commands (&&, ||, ;)
   */
  async executeCompound(compound: CompoundCommand): Promise<number> {
    // Execute left side first
    const leftResult = await this.executeNode(compound.left);
    
    // Decide whether to execute right side based on operator
    switch (compound.type) {
      case 'sequence': // ;
        // Always execute right side
        return await this.executeNode(compound.right);
        
      case 'and': // &&
        // Execute right side only if left succeeded
        if (leftResult === 0) {
          return await this.executeNode(compound.right);
        }
        return leftResult;
        
      case 'or': // ||
        // Execute right side only if left failed
        if (leftResult !== 0) {
          return await this.executeNode(compound.right);
        }
        return leftResult;
        
      default:
        throw new Error(`Unknown compound type: ${compound.type}`);
    }
  }

  /**
   * Execute any command node (simple, pipeline, or compound)
   */
  private async executeNode(node: Command | Pipeline | CompoundCommand): Promise<number> {
    if ('type' in node && node.type === 'simple') {
      return this.execute(node as ParsedCommand);
    } else if ('commands' in node) {
      return this.executePipeline(node as Pipeline);
    } else if ('left' in node && 'right' in node) {
      return this.executeCompound(node as CompoundCommand);
    }
    
    throw new Error('Unknown command node type');
  }

  /**
   * Execute a builtin command
   */
  private async executeBuiltin(command: ParsedCommand, execOptions?: { onOutput?: (chunk: string) => void }): Promise<number> {
    const builtin = builtinRegistry.get(command.executable || '');
    if (!builtin) {
      throw new CommandNotFoundError(command.executable || '');
    }
    
    try {
      // Capture output for single commands (pipelines handle their own capture)
      if (execOptions?.onOutput) {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWrite = process.stdout.write.bind(process.stdout);
        
        console.log = (...args) => {
          const text = args.join(' ') + '\n';
          execOptions.onOutput!(text);
        };
        
        console.error = (...args) => {
          const text = args.join(' ') + '\n';
          execOptions.onOutput!(text);
        };
        
        process.stdout.write = function(chunk: any): boolean {
          execOptions.onOutput!(String(chunk));
          return true;
        } as any;
        
        try {
          const exitCode = await builtin.execute(command.args, this.env, this.options);
          this.env.lastExitCode = exitCode;
          return exitCode;
        } finally {
          console.log = originalLog;
          console.error = originalError;
          process.stdout.write = originalWrite;
        }
      } else {
        const exitCode = await builtin.execute(command.args, this.env, this.options);
        this.env.lastExitCode = exitCode;
        return exitCode;
      }
    } catch (error) {
      if (execOptions?.onOutput) {
        execOptions.onOutput(`${command.executable}: ${error instanceof Error ? error.message : String(error)}\n`);
      } else {
        console.error(`${command.executable}: ${error instanceof Error ? error.message : String(error)}`);
      }
      this.env.lastExitCode = 1;
      return 1;
    }
  }

  /**
   * Execute an external command
   */
  private async executeExternal(command: ParsedCommand, execOptions?: { onOutput?: (chunk: string) => void }): Promise<number> {
    const executable = command.executable || '';
    
    // Resolve command in PATH
    const resolvedPath = await resolveCommand(executable, this.env.getVariable('PATH') || '');
    if (!resolvedPath) {
      throw new CommandNotFoundError(executable);
    }
    
    return new Promise((resolve) => {
      // If we have an output callback and no redirections, capture output
      const captureOutput = execOptions?.onOutput && command.redirections.length === 0;
      const stdio = captureOutput ? ['inherit', 'pipe', 'pipe'] : this.setupStdio(command);
      
      const child = spawn(resolvedPath, command.args, {
        cwd: this.env.cwd,
        env: this.env.getExportedVariables(),
        stdio,
        detached: command.background,
        shell: false
      });
      
      // Capture output if requested
      if (captureOutput && child.stdout && child.stderr) {
        child.stdout.on('data', (data) => {
          execOptions.onOutput!(data.toString());
        });
        
        child.stderr.on('data', (data) => {
          execOptions.onOutput!(data.toString());
        });
      }
      
      // Track as job if background
      if (command.background && child.pid) {
        const job = this.env.createJob(command.raw, child.pid, true);
        console.log(`[${job.id}] ${job.pid}`);
        
        // Don't wait for background jobs
        child.unref();
        resolve(0);
        return;
      }
      
      // Handle child process events
      child.on('error', (error) => {
        console.error(`Failed to start process: ${error.message}`);
        resolve(127);
      });
      
      child.on('exit', (code, signal) => {
        const exitCode = code ?? (signal ? 128 + this.getSignalNumber(signal) : 1);
        this.env.lastExitCode = exitCode;
        resolve(exitCode);
      });
    });
  }

  /**
   * Expand variables and globs in command
   */
  private async expandCommand(command: ParsedCommand): Promise<ParsedCommand> {
    const expanded = { ...command };
    
    // Expand executable
    if (expanded.executable) {
      expanded.executable = expandVariables(expanded.executable, this.env);
    }
    
    // Expand arguments
    expanded.args = await Promise.all(
      expanded.args.map(async (arg) => {
        const varExpanded = expandVariables(arg, this.env);
        if (this.options.enableGlobbing) {
          const globExpanded = await expandGlobs(varExpanded, this.env.cwd);
          return globExpanded.length > 0 ? globExpanded.join(' ') : varExpanded;
        }
        return varExpanded;
      })
    );
    
    // Expand redirections
    expanded.redirections = expanded.redirections.map(redir => ({
      ...redir,
      target: expandVariables(redir.target, this.env)
    }));
    
    return expanded;
  }

  /**
   * Setup stdio for child process based on redirections
   */
  private setupStdio(command: ParsedCommand): any {
    const stdio: any = ['inherit', 'inherit', 'inherit'];
    
    for (const redir of command.redirections) {
      switch (redir.type) {
        case 'input':
          stdio[0] = fs.openSync(redir.target, 'r');
          break;
        case 'output':
          stdio[1] = fs.openSync(redir.target, 'w');
          break;
        case 'append':
          stdio[1] = fs.openSync(redir.target, 'a');
          break;
        case 'error':
          stdio[2] = fs.openSync(redir.target, 'w');
          break;
      }
    }
    
    return stdio;
  }

  /**
   * Convert signal name to number
   */
  private getSignalNumber(signal: string): number {
    const signals: Record<string, number> = {
      'SIGHUP': 1,
      'SIGINT': 2,
      'SIGQUIT': 3,
      'SIGTERM': 15,
      'SIGKILL': 9,
      'SIGSTOP': 17,
      'SIGCONT': 19,
      'SIGTSTP': 20
    };
    
    return signals[signal] || 0;
  }
}