/**
 * unset - unset variables and functions
 */

import { BuiltinCommand, ShellEnvironment, ShellOptions } from '../types.js';

export class UnsetCommand implements BuiltinCommand {
  name = 'unset';
  description = 'Unset variables and functions';

  async execute(args: string[], env: ShellEnvironment, options: ShellOptions): Promise<number> {
    if (args.length === 0) {
      // No arguments - do nothing (POSIX behavior)
      return 0;
    }

    let unsetFunctions = false;
    let unsetVariables = true;
    const names: string[] = [];

    // Parse options
    for (const arg of args) {
      if (arg === '-f') {
        unsetFunctions = true;
        unsetVariables = false;
      } else if (arg === '-v') {
        unsetFunctions = false;
        unsetVariables = true;
      } else if (arg.startsWith('-')) {
        console.error(`unset: ${arg}: invalid option`);
        return 1;
      } else {
        names.push(arg);
      }
    }

    // Unset each name
    for (const name of names) {
      if (unsetVariables) {
        // Check for readonly variables (simplified - just check a few)
        if (this.isReadonly(name)) {
          console.error(`unset: ${name}: cannot unset: readonly variable`);
          return 1;
        }
        env.unsetVariable(name);
      }
      
      if (unsetFunctions && env.functions) {
        env.functions.delete(name);
      }
    }

    return 0;
  }

  private isReadonly(name: string): boolean {
    // List of variables that should not be unset
    const readonly = ['UID', 'EUID', 'PPID'];
    return readonly.includes(name);
  }

  help(): string {
    return `unset [-fv] [name ...]
Unset variables and functions.

Options:
  -f    Treat each name as a function
  -v    Treat each name as a variable (default)

For each name, remove the corresponding variable or function.
If no options are given, each name refers to a variable.`;
  }
}