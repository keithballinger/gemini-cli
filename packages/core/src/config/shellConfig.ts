/**
 * Shell configuration settings
 */

export interface ShellConfig {
  /**
   * Use POSIX-compliant shell instead of pass-through mode
   */
  usePosixShell: boolean;

  /**
   * Maintain working directory between commands
   * When true, cd commands will persist for subsequent commands
   */
  maintainWorkingDirectory: boolean;

  /**
   * Enable shell history persistence
   */
  enableHistory: boolean;

  /**
   * Maximum number of history entries to keep
   */
  historySize: number;

  /**
   * Enable job control (background processes, fg/bg commands)
   */
  enableJobControl: boolean;

  /**
   * Enable command aliases
   */
  enableAliases: boolean;

  /**
   * Enable glob expansion (*, ?, etc.)
   */
  enableGlobbing: boolean;

  /**
   * RC file to source on shell startup
   */
  rcFile?: string;
}

export const defaultShellConfig: ShellConfig = {
  usePosixShell: true,
  maintainWorkingDirectory: true,
  enableHistory: true,
  historySize: 1000,
  enableJobControl: true,
  enableAliases: true,
  enableGlobbing: true,
};