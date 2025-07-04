export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

export class BrowserShell {
  private allowedCommands: Set<string>;

  constructor() {
    // Very limited set of "safe" commands that can be simulated
    this.allowedCommands = new Set([
      'echo',
      'date',
      'pwd',
      'whoami',
      'help'
    ]);
  }

  async runCommand(command: string): Promise<ShellResult> {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (!this.allowedCommands.has(cmd)) {
      return {
        stdout: '',
        stderr: `Command '${cmd}' is not supported in browser environment. Supported commands: ${Array.from(this.allowedCommands).join(', ')}`,
        exitCode: 1,
        error: 'Command not supported'
      };
    }

    try {
      switch (cmd) {
        case 'echo':
          return {
            stdout: args.join(' ') + '\n',
            stderr: '',
            exitCode: 0
          };

        case 'date':
          return {
            stdout: new Date().toString() + '\n',
            stderr: '',
            exitCode: 0
          };

        case 'pwd':
          return {
            stdout: '/virtual-workspace\n',
            stderr: '',
            exitCode: 0
          };

        case 'whoami':
          return {
            stdout: 'browser-user\n',
            stderr: '',
            exitCode: 0
          };

        case 'help':
          return {
            stdout: `Browser Shell - Limited Command Support
Available commands:
  echo [text]  - Display text
  date         - Show current date/time
  pwd          - Show current directory (virtual)
  whoami       - Show current user
  help         - Show this help message

Note: This is a limited shell environment running in the browser.
Most system commands are not available for security reasons.
`,
            stderr: '',
            exitCode: 0
          };

        default:
          return {
            stdout: '',
            stderr: `Internal error: Command '${cmd}' is allowed but not implemented`,
            exitCode: 1,
            error: 'Implementation error'
          };
      }
    } catch (error) {
      return {
        stdout: '',
        stderr: `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        exitCode: 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getAvailableCommands(): string[] {
    return Array.from(this.allowedCommands);
  }

  isCommandSupported(command: string): boolean {
    return this.allowedCommands.has(command.toLowerCase());
  }
}