/**
 * Persistence layer for shell state
 * Handles saving and loading shell environment, history, and aliases
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ShellEnvironmentManager } from './environment.js';

export interface PersistentShellState {
  version: string;
  lastUpdated: string;
  cwd: string;
  history: string[];
  aliases: Record<string, string>;
  variables: Record<string, string>;
}

export class ShellPersistence {
  private readonly configDir: string;
  private readonly historyFile: string;
  private readonly aliasFile: string;
  private readonly envFile: string;
  private readonly stateFile: string;

  constructor(appName: string = 'gemini-shell') {
    // Use XDG config directory or fallback to home
    this.configDir = process.env.XDG_CONFIG_HOME 
      ? path.join(process.env.XDG_CONFIG_HOME, appName)
      : path.join(os.homedir(), `.config/${appName}`);

    // Ensure config directory exists
    fs.mkdirSync(this.configDir, { recursive: true });

    // Define file paths
    this.historyFile = path.join(this.configDir, 'history');
    this.aliasFile = path.join(this.configDir, 'aliases');
    this.envFile = path.join(this.configDir, 'environment');
    this.stateFile = path.join(this.configDir, 'state.json');
  }

  /**
   * Save the current shell state
   */
  async saveState(environment: ShellEnvironmentManager): Promise<void> {
    const state: PersistentShellState = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      cwd: environment.cwd,
      history: environment.history,
      aliases: Object.fromEntries(environment.aliases),
      variables: this.filterPersistentVariables(environment.variables)
    };

    try {
      // Save main state file
      await fs.promises.writeFile(
        this.stateFile,
        JSON.stringify(state, null, 2),
        'utf8'
      );

      // Save history file (one command per line for compatibility)
      await fs.promises.writeFile(
        this.historyFile,
        environment.history.join('\n'),
        'utf8'
      );

      // Save aliases file (bash-compatible format)
      const aliasLines = Array.from(environment.aliases.entries())
        .map(([name, value]) => `alias ${name}='${value.replace(/'/g, "'\"'\"'")}'`);
      await fs.promises.writeFile(
        this.aliasFile,
        aliasLines.join('\n'),
        'utf8'
      );

    } catch (error) {
      console.error('Failed to save shell state:', error);
    }
  }

  /**
   * Load shell state from disk
   */
  async loadState(environment: ShellEnvironmentManager): Promise<void> {
    try {
      // Load main state file
      if (fs.existsSync(this.stateFile)) {
        const stateData = await fs.promises.readFile(this.stateFile, 'utf8');
        const state: PersistentShellState = JSON.parse(stateData);

        // Restore working directory if it still exists
        if (state.cwd && fs.existsSync(state.cwd)) {
          try {
            environment.changeDirectory(state.cwd);
          } catch {
            // Directory might not be accessible anymore
          }
        }

        // Restore history
        if (state.history && Array.isArray(state.history)) {
          environment.history = state.history.slice(-environment.options.historySize);
        }

        // Restore aliases
        if (state.aliases) {
          environment.aliases.clear();
          Object.entries(state.aliases).forEach(([name, value]) => {
            environment.aliases.set(name, value);
          });
        }

        // Restore persistent variables
        if (state.variables) {
          Object.entries(state.variables).forEach(([name, value]) => {
            environment.setVariable(name, value);
          });
        }
      }

      // Load history file if state file doesn't exist (backward compatibility)
      else if (fs.existsSync(this.historyFile)) {
        const historyData = await fs.promises.readFile(this.historyFile, 'utf8');
        const history = historyData.split('\n').filter(line => line.trim());
        environment.history = history.slice(-environment.options.historySize);
      }

    } catch (error) {
      console.error('Failed to load shell state:', error);
    }
  }

  /**
   * Append a command to history file
   */
  async appendToHistory(command: string): Promise<void> {
    try {
      await fs.promises.appendFile(this.historyFile, command + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to append to history:', error);
    }
  }

  /**
   * Load shell RC file (like .bashrc)
   */
  async loadRCFile(environment: ShellEnvironmentManager): Promise<void> {
    const rcFiles = [
      path.join(os.homedir(), '.geminirc'),
      path.join(this.configDir, 'rc')
    ];

    for (const rcFile of rcFiles) {
      if (fs.existsSync(rcFile)) {
        try {
          const content = await fs.promises.readFile(rcFile, 'utf8');
          // TODO: Execute RC file commands
          console.log(`Loading RC file: ${rcFile}`);
        } catch (error) {
          console.error(`Failed to load RC file ${rcFile}:`, error);
        }
      }
    }
  }

  /**
   * Filter variables that should be persisted
   */
  private filterPersistentVariables(variables: Map<string, string>): Record<string, string> {
    const persistent: Record<string, string> = {};
    const transientVars = new Set([
      'PWD', 'OLDPWD', 'SHLVL', 'PS1', 'PS2', 'IFS',
      'HOME', 'USER', 'SHELL', 'PATH', 'TERM'
    ]);

    variables.forEach((value, key) => {
      // Don't persist system/transient variables
      if (!transientVars.has(key) && !key.startsWith('_')) {
        persistent[key] = value;
      }
    });

    return persistent;
  }

  /**
   * Get the config directory path
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * Clear all persisted data
   */
  async clear(): Promise<void> {
    const files = [this.stateFile, this.historyFile, this.aliasFile, this.envFile];
    
    for (const file of files) {
      if (fs.existsSync(file)) {
        await fs.promises.unlink(file);
      }
    }
  }
}