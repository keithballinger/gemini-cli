/**
 * export - export variables to the environment
 */

import { BuiltinCommand, ShellEnvironment, ShellOptions } from '../types.js';

export class ExportCommand implements BuiltinCommand {
  name = 'export';
  description = 'Export variables to the environment';

  async execute(args: string[], env: ShellEnvironment, options: ShellOptions): Promise<number> {
    // No args - list all exported variables
    if (args.length === 0) {
      const vars = env.getExportedVariables();
      const sorted = Object.keys(vars).sort();
      
      for (const name of sorted) {
        const value = vars[name];
        // Quote the value if it contains special characters
        const quotedValue = this.needsQuoting(value) 
          ? `"${value.replace(/"/g, '\\"')}"` 
          : value;
        console.log(`export ${name}=${quotedValue}`);
      }
      
      return 0;
    }

    // Process each argument
    for (const arg of args) {
      // Check for NAME=VALUE format
      const equalIndex = arg.indexOf('=');
      
      if (equalIndex === -1) {
        // Just export existing variable
        const value = env.getVariable(arg);
        if (value !== undefined) {
          env.exportVariable(arg);
        } else {
          // Export with empty value
          env.exportVariable(arg, '');
        }
      } else {
        // Export with new value
        const name = arg.substring(0, equalIndex);
        const value = arg.substring(equalIndex + 1);
        
        // Validate variable name
        if (!this.isValidVariableName(name)) {
          console.error(`export: '${name}': not a valid identifier`);
          return 1;
        }
        
        env.exportVariable(name, value);
      }
    }

    return 0;
  }

  private isValidVariableName(name: string): boolean {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
  }

  private needsQuoting(value: string): boolean {
    return /[\s"'$`\\]/.test(value);
  }

  help(): string {
    return `export [name[=value] ...]
Export variables to the environment of subsequently executed commands.

If no arguments are given, a list of exported variables is displayed.

Examples:
  export PATH              Export existing PATH variable
  export FOO=bar          Set and export FOO with value 'bar'
  export FOO="bar baz"    Export with spaces (requires quotes)`;
  }
}