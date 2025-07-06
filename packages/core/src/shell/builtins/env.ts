/**
 * env - display or modify environment variables
 */

import { BuiltinCommand, ShellEnvironment, ShellOptions } from '../types.js';

export class EnvCommand implements BuiltinCommand {
  name = 'env';
  description = 'Display or run a program in a modified environment';

  async execute(args: string[], env: ShellEnvironment, options: ShellOptions): Promise<number> {
    // Parse options and variable assignments
    let clearEnv = false;
    let unsetVars: string[] = [];
    let setVars: Map<string, string> = new Map();
    let command: string | null = null;
    let commandArgs: string[] = [];
    
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      
      if (arg === '-i' || arg === '--ignore-environment') {
        clearEnv = true;
        i++;
      } else if (arg === '-u' || arg === '--unset') {
        if (i + 1 < args.length) {
          unsetVars.push(args[++i]);
        } else {
          console.error('env: option requires an argument -- u');
          return 1;
        }
        i++;
      } else if (arg === '-') {
        // Treat as -i
        clearEnv = true;
        i++;
      } else if (arg.includes('=')) {
        // Variable assignment
        const equalIndex = arg.indexOf('=');
        const name = arg.substring(0, equalIndex);
        const value = arg.substring(equalIndex + 1);
        setVars.set(name, value);
        i++;
      } else if (arg === '--') {
        // End of options
        i++;
        if (i < args.length) {
          command = args[i++];
          commandArgs = args.slice(i);
        }
        break;
      } else if (arg.startsWith('-')) {
        console.error(`env: invalid option -- '${arg.substring(1)}'`);
        return 1;
      } else {
        // First non-option argument is the command
        command = arg;
        commandArgs = args.slice(i + 1);
        break;
      }
    }

    // If no command specified, just print environment
    if (!command) {
      const vars = this.getEffectiveEnvironment(env, clearEnv, unsetVars, setVars);
      const sorted = Object.keys(vars).sort();
      
      for (const name of sorted) {
        console.log(`${name}=${vars[name]}`);
      }
      
      return 0;
    }

    // TODO: Execute command with modified environment
    // For now, we'll just print what would be executed
    console.error('env: command execution not yet implemented');
    console.error(`Would execute: ${command} ${commandArgs.join(' ')}`);
    
    return 1;
  }

  /**
   * Get the effective environment after applying modifications
   */
  private getEffectiveEnvironment(
    env: ShellEnvironment,
    clearEnv: boolean,
    unsetVars: string[],
    setVars: Map<string, string>
  ): Record<string, string> {
    let vars: Record<string, string>;
    
    if (clearEnv) {
      // Start with empty environment
      vars = {};
    } else {
      // Start with current environment
      vars = env.getExportedVariables();
    }
    
    // Remove unset variables
    for (const name of unsetVars) {
      delete vars[name];
    }
    
    // Add/override set variables
    setVars.forEach((value, name) => {
      vars[name] = value;
    });
    
    return vars;
  }

  help(): string {
    return `env [OPTION]... [-] [NAME=VALUE]... [COMMAND [ARG]...]
Print environment or run COMMAND in a modified environment.

Options:
  -i, --ignore-environment   Start with empty environment
  -u, --unset=NAME          Remove NAME from environment
  -                         Same as -i
  --                        End of options

If no COMMAND, print the resulting environment.

Examples:
  env                       Print all environment variables
  env FOO=bar cmd          Run 'cmd' with FOO set to 'bar'
  env -i PATH=/bin cmd     Run 'cmd' with only PATH set`;
  }
}