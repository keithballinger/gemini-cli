/**
 * pwd - print working directory builtin command
 */

import { BuiltinCommand, ShellEnvironment, ShellOptions } from '../types.js';

export class PwdCommand implements BuiltinCommand {
  name = 'pwd';
  description = 'Print the current working directory';

  async execute(args: string[], env: ShellEnvironment, options: ShellOptions): Promise<number> {
    // Handle -L (logical) and -P (physical) options
    const useLogical = !args.includes('-P');
    
    try {
      if (useLogical) {
        // Use the PWD environment variable (logical path)
        console.log(env.getVariable('PWD') || env.cwd);
      } else {
        // Use the actual physical path
        console.log(process.cwd());
      }
      
      return 0;
    } catch (error) {
      console.error(`pwd: ${error instanceof Error ? error.message : String(error)}`);
      return 1;
    }
  }

  help(): string {
    return `pwd [-L | -P]
Print the absolute pathname of the current working directory.

Options:
  -L    Print the logical current directory (default)
  -P    Print the physical current directory (all symbolic links resolved)`;
  }
}