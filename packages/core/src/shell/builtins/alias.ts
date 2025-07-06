/**
 * alias - define or display aliases
 */

import { BuiltinCommand, ShellEnvironment, ShellOptions } from '../types.js';

export class AliasCommand implements BuiltinCommand {
  name = 'alias';
  description = 'Define or display aliases';

  async execute(args: string[], env: ShellEnvironment, options: ShellOptions): Promise<number> {
    if (!options.enableAliases) {
      console.error('alias: aliases are disabled');
      return 1;
    }

    // No arguments - list all aliases
    if (args.length === 0) {
      const sorted = Array.from(env.aliases.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      
      for (const [name, value] of sorted) {
        // Quote the value if it contains special characters
        const quotedValue = this.needsQuoting(value) 
          ? `'${value.replace(/'/g, "'\"'\"'")}'` 
          : value;
        console.log(`alias ${name}=${quotedValue}`);
      }
      
      return 0;
    }

    // Process each argument
    for (const arg of args) {
      const equalIndex = arg.indexOf('=');
      
      if (equalIndex === -1) {
        // Display specific alias
        const value = env.aliases.get(arg);
        if (value !== undefined) {
          const quotedValue = this.needsQuoting(value) 
            ? `'${value.replace(/'/g, "'\"'\"'")}'` 
            : value;
          console.log(`alias ${arg}=${quotedValue}`);
        } else {
          console.error(`alias: ${arg}: not found`);
          return 1;
        }
      } else {
        // Define new alias
        const name = arg.substring(0, equalIndex);
        const value = arg.substring(equalIndex + 1);
        
        // Remove quotes if present
        const unquotedValue = this.unquote(value);
        
        env.aliases.set(name, unquotedValue);
      }
    }

    return 0;
  }

  private needsQuoting(value: string): boolean {
    return /[\s"'$`\\|&;<>(){}[\]*?~]/.test(value);
  }

  private unquote(str: string): string {
    // Remove surrounding quotes if they match
    if ((str.startsWith('"') && str.endsWith('"')) ||
        (str.startsWith("'") && str.endsWith("'"))) {
      return str.slice(1, -1);
    }
    return str;
  }

  help(): string {
    return `alias [name[=value] ...]
Define or display aliases.

When called without arguments, 'alias' prints the list of aliases.
When called with arguments, an alias is defined for each name whose
value is given. A trailing space in value causes the next word to be
checked for alias substitution.

Examples:
  alias                    List all aliases
  alias ll                 Show the 'll' alias
  alias ll='ls -la'       Define 'll' as an alias for 'ls -la'`;
  }
}