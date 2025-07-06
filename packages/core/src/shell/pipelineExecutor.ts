/**
 * Pipeline executor for the POSIX shell
 * Handles execution of command pipelines with proper pipe setup
 */

import { spawn, ChildProcess } from 'child_process';
import { Readable, Writable, PassThrough } from 'stream';
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

interface BuiltinProcess {
  stdin?: Writable;
  stdout?: Readable;
  stderr?: Readable;
  isBuiltin: boolean;
  execute: () => Promise<number>;
  killed?: boolean;
  kill?: (signal: string) => void;
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
    const processes: (ChildProcess | BuiltinProcess)[] = [];
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
          const builtinProcess = await this.createBuiltinProcess(command, isFirst, isLast);
          processes.push(builtinProcess);
          continue;
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
        if (i > 0) {
          const prevProcess = processes[i - 1];
          const currProcess = child;
          
          if ('stdout' in prevProcess && prevProcess.stdout && currProcess.stdin) {
            prevProcess.stdout.pipe(currProcess.stdin);
          }
        }
      }

      // Connect pipes for builtin processes
      for (let i = 0; i < processes.length; i++) {
        if (i > 0) {
          const prevProcess = processes[i - 1];
          const currProcess = processes[i];
          
          if ('isBuiltin' in currProcess && currProcess.isBuiltin && currProcess.stdin) {
            if ('stdout' in prevProcess && prevProcess.stdout) {
              prevProcess.stdout.pipe(currProcess.stdin);
            }
          }
        }
      }

      // Execute builtin processes
      const builtinPromises = processes.map((process, index) => {
        if ('isBuiltin' in process && process.isBuiltin) {
          return (process as BuiltinProcess).execute();
        }
        return null;
      }).filter(p => p !== null);

      // Wait for all processes to complete
      const regularProcessPromises = processes.map((child, index) => {
        if ('isBuiltin' in child && child.isBuiltin) {
          return null; // Already handled above
        }
        
        return new Promise<number>((resolve) => {
          (child as ChildProcess).on('exit', (code, signal) => {
            if (signal) {
              resolve(128 + this.getSignalNumber(signal));
            } else {
              resolve(code || 0);
            }
          });
          (child as ChildProcess).on('error', () => {
            resolve(127); // Command not found
          });
        });
      }).filter(p => p !== null);

      // Wait for all processes (both regular and builtin)
      const allPromises = [...regularProcessPromises, ...builtinPromises];
      const results = await Promise.all(allPromises);
      
      // Get exit codes in the correct order
      const exitCodes: number[] = [];
      let builtinIndex = 0;
      let regularIndex = 0;
      
      for (const process of processes) {
        if ('isBuiltin' in process && process.isBuiltin) {
          exitCodes.push(results[regularProcessPromises.length + builtinIndex]);
          builtinIndex++;
        } else {
          exitCodes.push(results[regularIndex]);
          regularIndex++;
        }
      }

      // Pipeline exit code is the exit code of the last command
      lastExitCode = exitCodes[exitCodes.length - 1];

    } catch (error) {
      // Clean up processes on error
      processes.forEach(child => {
        if ('killed' in child && !child.killed && 'kill' in child && child.kill) {
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
   * Create a pseudo-process for a builtin command that can participate in pipelines
   */
  private async createBuiltinProcess(
    command: ParsedCommand, 
    isFirst: boolean, 
    isLast: boolean
  ): Promise<BuiltinProcess> {
    const stdin = isFirst ? undefined : new PassThrough();
    const stdout = isLast ? undefined : new PassThrough();
    const stderr = new PassThrough();

    const execute = async (): Promise<number> => {
      const builtin = builtinRegistry.get(command.executable!);
      if (!builtin) {
        return 127;
      }

      // Capture console output
      const originalLog = console.log;
      const originalError = console.error;
      
      try {
        // Redirect console output to our streams
        if (stdout) {
          console.log = (...args) => {
            const text = args.join(' ') + '\n';
            stdout.write(text);
          };
        }
        
        console.error = (...args) => {
          const text = args.join(' ') + '\n';
          stderr.write(text);
        };

        // If we have stdin, collect it into a string and set as env variable
        if (stdin) {
          let inputData = '';
          stdin.on('data', (chunk) => {
            inputData += chunk.toString();
          });
          
          await new Promise((resolve) => {
            stdin.on('end', resolve);
          });
          
          // Some builtins might need to access piped input
          // We could pass this through environment or extend builtin interface
        }

        // Execute the builtin
        const exitCode = await builtin.execute(command.args, this.env, this.options);
        
        // Close output streams
        if (stdout) {
          stdout.end();
        }
        stderr.end();
        
        return exitCode;
      } finally {
        // Restore console functions
        console.log = originalLog;
        console.error = originalError;
      }
    };

    return { stdin, stdout, stderr, isBuiltin: true, execute, killed: false };
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