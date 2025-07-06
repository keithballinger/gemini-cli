/**
 * cd - change directory builtin command
 */

import * as fs from 'fs';
import * as path from 'path';
import { BuiltinCommand, ShellEnvironment, ShellOptions } from '../types.js';

export class CdCommand implements BuiltinCommand {
  name = 'cd';
  description = 'Change the current directory';

  async execute(args: string[], env: ShellEnvironment, options: ShellOptions): Promise<number> {
    // No args means go to HOME
    if (args.length === 0) {
      const home = env.getVariable('HOME');
      if (!home) {
        console.error('cd: HOME not set');
        return 1;
      }
      args = [home];
    }

    const targetDir = args[0];

    try {
      // Let the environment handle the actual directory change
      env.changeDirectory(targetDir);
      
      // POSIX cd prints the directory when using - 
      if (targetDir === '-') {
        console.log(env.cwd);
      }
      
      return 0;
    } catch (error) {
      console.error(`cd: ${error instanceof Error ? error.message : String(error)}`);
      return 1;
    }
  }

  help(): string {
    return `cd [directory]
Change the current directory to DIRECTORY.
If no argument is given, the value of the HOME shell variable is used.
The variable OLDPWD is set to the previous directory.

Special arguments:
  -    Change to previous directory (OLDPWD)
  ~    Change to home directory
  ..   Change to parent directory`;
  }
}