/**
 * g - Placeholder for Gemini query command
 * Actual implementation is handled by the shell UI layer
 */

import { BuiltinCommand, ShellEnvironment, ShellOptions } from '../types.js';

export class GCommand implements BuiltinCommand {
  name = 'g';
  description = 'Execute Gemini query (output can be piped)';
  aliases = ['gemini'];

  async execute(args: string[], env: ShellEnvironment, options: ShellOptions): Promise<number> {
    // This is a placeholder - the actual 'g' command is intercepted
    // by the shell UI layer which handles the Gemini integration
    console.error('g: This command should be handled by the shell UI layer');
    console.error('If you see this message, there may be a configuration issue');
    return 1;
  }

  help(): string {
    return `g - Execute Gemini query
Usage: g "query"

Executes a Gemini query and captures the output. The output can be piped
to other commands or accessed later using %% expansion.

Examples:
  g "list all functions in main.py"          Execute query
  g "explain this error" | grep null        Pipe output to grep
  echo %% | wc -l                           Count lines in last response
  echo %%-1 | head -10                      Show first 10 lines of previous response

Response History:
  %%     - Last Gemini response
  %%-1   - Previous response (one before last)
  %%-2   - Two responses ago
  ...    - Up to 50 responses are stored`;
  }
}