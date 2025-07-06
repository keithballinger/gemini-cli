/**
 * Pipeline executor for the POSIX shell
 * Handles execution of command pipelines with proper pipe setup
 */

import { spawn, ChildProcess } from 'child_process';
import { Readable, Writable } from 'stream';
import { ParsedCommand, Pipeline, ShellEnvironment, ShellOptions } from './types.js';
import { ShellExecutor } from './executor.js';
import { resolveCommand } from './pathResolver.js';
import { expandVariables } from './expansion.js';
import { builtinRegistry } from './builtins/index.js';

export interface PipelineResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  signal?: string;
}

/**
 * Execute a pipeline of commands
 */
export class PipelineExecutor {
  constructor(
    private executor: ShellExecutor,
    private env: ShellEnvironment,
    private options: ShellOptions
  ) {}

  /**
   * Execute a pipeline
   */
  async execute(pipeline: Pipeline): Promise<PipelineResult> {
    if (pipeline.commands.length === 0) {
      return { exitCode: 0, stdout: '', stderr: '' };
    }

    if (pipeline.commands.length === 1) {
      // Single command, no pipeline needed
      const exitCode = await this.executor.execute(pipeline.commands[0] as ParsedCommand);
      return { exitCode, stdout: '', stderr: '' };
    }

    // Execute pipeline with proper pipe setup
    return this.executePipeline(pipeline.commands as ParsedCommand[]);
  }

  /**
   * Execute a true pipeline with multiple commands
   */
  private async executePipeline(commands: ParsedCommand[]): Promise<PipelineResult> {
    const processes: ChildProcess[] = [];
    let lastExitCode = 0;
    let collectedStderr = '';

    try {
      // Create processes for each command
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        const isFirst = i === 0;
        const isLast = i === commands.length - 1;

        // Check if it's a builtin
        if (command.executable && builtinRegistry.has(command.executable)) {
          // TODO: Handle builtins in pipelines
          // For now, skip builtins in pipelines
          throw new Error(`Builtin '${command.executable}' not supported in pipelines yet`);
        }

        // Resolve command path
        const executable = command.executable || '';
        const resolvedPath = await resolveCommand(executable, this.env.getVariable('PATH') || '');
        if (!resolvedPath) {
          throw new Error(`Command not found: ${executable}`);
        }

        // Set up stdio
        const stdio: any[] = [
          isFirst ? 'inherit' : 'pipe',  // stdin
          isLast ? 'inherit' : 'pipe',   // stdout
          'pipe'                         // stderr
        ];

        // Apply redirections
        for (const redir of command.redirections) {
          switch (redir.type) {
            case 'input':
              if (isFirst) {
                stdio[0] = require('fs').openSync(redir.target, 'r');
              }
              break;
            case 'output':
              if (isLast) {
                stdio[1] = require('fs').openSync(redir.target, 'w');
              }
              break;
            case 'append':
              if (isLast) {
                stdio[1] = require('fs').openSync(redir.target, 'a');
              }
              break;
            case 'error':
              stdio[2] = require('fs').openSync(redir.target, 'w');
              break;
          }
        }

        // Spawn the process
        const child = spawn(resolvedPath, command.args, {
          cwd: this.env.cwd,
          env: this.env.getExportedVariables(),
          stdio
        });

        processes.push(child);

        // Collect stderr
        if (child.stderr) {
          child.stderr.on('data', (data) => {
            collectedStderr += data.toString();
          });
        }

        // Connect pipes
        if (i > 0 && processes[i - 1].stdout && child.stdin) {
          processes[i - 1].stdout!.pipe(child.stdin);
        }
      }

      // Wait for all processes to complete
      const exitCodes = await Promise.all(
        processes.map(child => new Promise<number>((resolve) => {
          child.on('exit', (code, signal) => {
            if (signal) {
              resolve(128 + this.getSignalNumber(signal));
            } else {
              resolve(code || 0);
            }
          });
          child.on('error', () => {
            resolve(127); // Command not found
          });
        }))
      );

      // Pipeline exit code is the exit code of the last command
      lastExitCode = exitCodes[exitCodes.length - 1];

    } catch (error) {
      // Clean up processes on error
      processes.forEach(child => {
        if (!child.killed) {
          child.kill('SIGTERM');
        }
      });
      
      throw error;
    }

    return {
      exitCode: lastExitCode,
      stdout: '', // Stdout was piped to next command or redirected
      stderr: collectedStderr
    };
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
      'SIGKILL': 9
    };
    
    return signals[signal] || 0;
  }
}