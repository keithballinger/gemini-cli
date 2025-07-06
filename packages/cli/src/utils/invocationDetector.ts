import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

export enum InvocationMode {
  CLI = 'cli',
  SHELL = 'shell'
}

export interface InvocationInfo {
  mode: InvocationMode;
  isLoginShell: boolean;
  detectionMethod: string;
}

export class InvocationDetector {
  /**
   * Determines whether Gemini CLI is running as a login shell or regular CLI
   */
  static detect(args: { shell?: boolean }): InvocationInfo {
    // Priority 1: Explicit --shell flag
    if (args.shell) {
      return {
        mode: InvocationMode.SHELL,
        isLoginShell: true,
        detectionMethod: '--shell flag'
      };
    }

    // Priority 2: Check if we're the user's default shell
    if (process.env.SHELL === process.argv[0]) {
      return {
        mode: InvocationMode.SHELL,
        isLoginShell: true,
        detectionMethod: 'SHELL environment variable'
      };
    }

    // Priority 3: Check if argv[0] starts with dash (login shell convention)
    const programName = path.basename(process.argv[0]);
    if (programName.startsWith('-')) {
      return {
        mode: InvocationMode.SHELL,
        isLoginShell: true,
        detectionMethod: 'argv[0] starts with dash'
      };
    }

    // Priority 4: Check parent process
    if (this.isLaunchedAsLoginShell()) {
      return {
        mode: InvocationMode.SHELL,
        isLoginShell: true,
        detectionMethod: 'parent process detection'
      };
    }

    // Priority 5: Check if we're in /etc/shells
    if (this.isInEtcShells()) {
      // Only use this as a hint, not definitive
      // User might have added it but still want CLI mode sometimes
      const shellEnv = process.env.GEMINI_SHELL_MODE;
      if (shellEnv === 'true' || shellEnv === '1') {
        return {
          mode: InvocationMode.SHELL,
          isLoginShell: true,
          detectionMethod: '/etc/shells + GEMINI_SHELL_MODE env'
        };
      }
    }

    // Default: CLI mode
    return {
      mode: InvocationMode.CLI,
      isLoginShell: false,
      detectionMethod: 'default'
    };
  }

  /**
   * Check if launched as a login shell by examining parent process
   */
  private static isLaunchedAsLoginShell(): boolean {
    try {
      const ppid = process.ppid;
      
      // Check if parent is init (PID 1)
      if (ppid === 1) {
        return true;
      }

      // On macOS/Linux, check if parent is a login process
      if (os.platform() !== 'win32') {
        const parentName = this.getParentProcessName(ppid);
        const loginProcesses = ['login', 'sshd', 'Terminal', 'iTerm2', 'gnome-terminal'];
        
        if (parentName && loginProcesses.some(proc => parentName.includes(proc))) {
          return true;
        }
      }
    } catch (error) {
      // If we can't determine parent process, assume not login shell
      console.debug('Could not determine parent process:', error);
    }

    return false;
  }

  /**
   * Get the name of the parent process
   */
  private static getParentProcessName(ppid: number): string | null {
    try {
      if (os.platform() === 'darwin') {
        // macOS: Use ps command
        const { execSync } = require('child_process');
        const output = execSync(`ps -p ${ppid} -o comm=`, { encoding: 'utf8' });
        return output.trim();
      } else if (os.platform() === 'linux') {
        // Linux: Read from /proc
        const cmdline = fs.readFileSync(`/proc/${ppid}/cmdline`, 'utf8');
        return path.basename(cmdline.split('\0')[0]);
      }
    } catch (error) {
      console.debug('Could not get parent process name:', error);
    }
    
    return null;
  }

  /**
   * Check if Gemini CLI is listed in /etc/shells
   */
  private static isInEtcShells(): boolean {
    if (os.platform() === 'win32') {
      return false; // Windows doesn't have /etc/shells
    }

    try {
      const shells = fs.readFileSync('/etc/shells', 'utf8');
      const geminiPath = process.argv[0];
      
      // Check if our executable path is in the shells file
      return shells.split('\n').some(line => {
        const shellPath = line.trim();
        return shellPath && !shellPath.startsWith('#') && 
               (shellPath === geminiPath || shellPath.endsWith('/gemini'));
      });
    } catch (error) {
      // File might not exist or be readable
      return false;
    }
  }

  /**
   * Get a human-readable description of the current mode
   */
  static getModeDescription(info: InvocationInfo): string {
    switch (info.mode) {
      case InvocationMode.SHELL:
        return `Running as login shell (detected via: ${info.detectionMethod})`;
      case InvocationMode.CLI:
        return `Running in CLI mode (interactive AI assistant)`;
      default:
        return `Unknown mode`;
    }
  }
}