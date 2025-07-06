/**
 * exit - exit the shell
 */

import { BuiltinCommand, ShellEnvironment, ShellOptions } from '../types.js';

export class ExitCommand implements BuiltinCommand {
  name = 'exit';
  description = 'Exit the shell';

  async execute(args: string[], env: ShellEnvironment, options: ShellOptions): Promise<number> {
    let exitCode = env.lastExitCode;

    // If an argument is provided, use it as the exit code
    if (args.length > 0) {
      const code = parseInt(args[0]);
      if (isNaN(code)) {
        console.error(`exit: ${args[0]}: numeric argument required`);
        return 2;
      }
      exitCode = code & 255; // Exit codes are 8-bit
    }

    // Check for stopped jobs in interactive mode
    if (options.interactiveMode && env.jobs) {
      const stoppedJobs = Array.from(env.jobs.values())
        .filter(job => job.status === 'stopped');
      
      if (stoppedJobs.length > 0) {
        console.error('exit: There are stopped jobs.');
        // In a real shell, this would prevent exit on first attempt
        // For now, we'll just warn
      }
    }

    // Exit the process
    process.exit(exitCode);
  }

  help(): string {
    return `exit [n]
Exit the shell with a status of N.
If N is omitted, the exit status is that of the last command executed.

The exit status is limited to the range 0-255.`;
  }
}