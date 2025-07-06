/**
 * unalias - remove aliases
 */

import { BuiltinCommand, ShellEnvironment, ShellOptions } from '../types.js';

export class UnaliasCommand implements BuiltinCommand {
  name = 'unalias';
  description = 'Remove aliases';

  async execute(args: string[], env: ShellEnvironment, options: ShellOptions): Promise<number> {
    if (!options.enableAliases) {
      console.error('unalias: aliases are disabled');
      return 1;
    }

    if (args.length === 0) {
      console.error('unalias: usage: unalias [-a] name [name ...]');
      return 2;
    }

    // Check for -a option (remove all aliases)
    if (args.includes('-a')) {
      env.aliases.clear();
      return 0;
    }

    let hasError = false;

    // Remove each specified alias
    for (const name of args) {
      if (name.startsWith('-') && name !== '-a') {
        console.error(`unalias: ${name}: invalid option`);
        hasError = true;
        continue;
      }

      if (!env.aliases.has(name)) {
        console.error(`unalias: ${name}: not found`);
        hasError = true;
      } else {
        env.aliases.delete(name);
      }
    }

    return hasError ? 1 : 0;
  }

  help(): string {
    return `unalias [-a] name [name ...]
Remove aliases.

Options:
  -a    Remove all alias definitions

For each name, remove the corresponding alias if it exists.
Returns an error if any of the names is not defined as an alias.`;
  }
}