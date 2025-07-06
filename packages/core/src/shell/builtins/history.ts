/**
 * history - display command history
 */

import { BuiltinCommand, ShellEnvironment, ShellOptions } from '../types.js';

export class HistoryCommand implements BuiltinCommand {
  name = 'history';
  description = 'Display command history';

  async execute(args: string[], env: ShellEnvironment, options: ShellOptions): Promise<number> {
    if (!options.enableHistory) {
      console.error('history: history is disabled');
      return 1;
    }

    let count: number | undefined;
    let clearHistory = false;
    
    // Parse options
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '-c') {
        clearHistory = true;
      } else if (!arg.startsWith('-')) {
        // Try to parse as count
        const n = parseInt(arg);
        if (!isNaN(n) && n > 0) {
          count = n;
        } else {
          console.error(`history: ${arg}: numeric argument required`);
          return 1;
        }
      } else {
        console.error(`history: ${arg}: invalid option`);
        return 1;
      }
    }

    // Clear history if requested
    if (clearHistory) {
      env.history.length = 0;
      return 0;
    }

    // Display history
    const historyToShow = count 
      ? env.history.slice(-count)
      : env.history;

    const startIndex = env.history.length - historyToShow.length + 1;

    historyToShow.forEach((cmd, index) => {
      console.log(`  ${startIndex + index}  ${cmd}`);
    });

    return 0;
  }

  help(): string {
    return `history [-c] [n]
Display the command history list with line numbers.

Options:
  -c    Clear the history list

Arguments:
  n     Show only the last n entries

The history list shows commands with their history numbers, which can
be used with history expansion (e.g., !n to execute command n).`;
  }
}