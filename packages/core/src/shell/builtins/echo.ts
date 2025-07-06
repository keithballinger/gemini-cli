/**
 * echo - display a line of text
 */

import { BuiltinCommand, ShellEnvironment, ShellOptions } from '../types.js';

export class EchoCommand implements BuiltinCommand {
  name = 'echo';
  description = 'Display a line of text';

  async execute(args: string[], env: ShellEnvironment, options: ShellOptions): Promise<number> {
    let noNewline = false;
    let interpretEscapes = false;
    let startIndex = 0;

    // Parse options
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '-n') {
        noNewline = true;
        startIndex = i + 1;
      } else if (arg === '-e') {
        interpretEscapes = true;
        startIndex = i + 1;
      } else if (arg === '-E') {
        interpretEscapes = false;
        startIndex = i + 1;
      } else if (arg.startsWith('-')) {
        // Unknown option, treat as text
        break;
      } else {
        break;
      }
    }

    // Join remaining arguments with spaces
    const text = args.slice(startIndex).join(' ');
    
    // Process escape sequences if -e is set
    const output = interpretEscapes ? this.processEscapes(text) : text;

    // Output the text
    if (noNewline) {
      process.stdout.write(output);
    } else {
      console.log(output);
    }

    return 0;
  }

  private processEscapes(text: string): string {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\b/g, '\b')
      .replace(/\\f/g, '\f')
      .replace(/\\v/g, '\v')
      .replace(/\\a/g, '\x07')
      .replace(/\\e/g, '\x1b')
      .replace(/\\\\/g, '\\')
      .replace(/\\0([0-7]{1,3})/g, (match, octal) => {
        return String.fromCharCode(parseInt(octal, 8));
      })
      .replace(/\\x([0-9a-fA-F]{1,2})/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
  }

  help(): string {
    return `echo [-neE] [arg ...]
Display the args, separated by spaces, followed by a newline.

Options:
  -n    Do not append a newline
  -e    Enable interpretation of backslash escapes
  -E    Disable interpretation of backslash escapes (default)

Escape sequences (with -e):
  \\n    newline
  \\t    horizontal tab
  \\r    carriage return
  \\\\    backslash
  \\0nnn character with octal value nnn
  \\xhh  character with hex value hh`;
  }
}