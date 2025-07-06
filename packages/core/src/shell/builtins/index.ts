/**
 * Registry of all built-in commands
 */

import { BuiltinCommand } from '../types.js';
import { CdCommand } from './cd.js';
import { PwdCommand } from './pwd.js';
import { ExportCommand } from './export.js';
import { UnsetCommand } from './unset.js';
import { ExitCommand } from './exit.js';
import { EchoCommand } from './echo.js';
import { EnvCommand } from './env.js';
import { AliasCommand } from './alias.js';
import { UnaliasCommand } from './unalias.js';
import { JobsCommand } from './jobs.js';
import { FgCommand } from './fg.js';
import { BgCommand } from './bg.js';
import { HistoryCommand } from './history.js';
import { SourceCommand } from './source.js';
import { GCommand } from './g.js';

export class BuiltinRegistry {
  private builtins: Map<string, BuiltinCommand> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    // Core built-ins
    this.register(new CdCommand());
    this.register(new PwdCommand());
    this.register(new ExportCommand());
    this.register(new UnsetCommand());
    this.register(new ExitCommand());
    this.register(new EchoCommand());
    this.register(new EnvCommand());
    
    // Alias management
    this.register(new AliasCommand());
    this.register(new UnaliasCommand());
    
    // Job control
    this.register(new JobsCommand());
    this.register(new FgCommand());
    this.register(new BgCommand());
    
    // Additional built-ins
    this.register(new HistoryCommand());
    this.register(new SourceCommand());
    
    // Gemini integration
    this.register(new GCommand());
  }

  register(builtin: BuiltinCommand): void {
    this.builtins.set(builtin.name, builtin);
  }

  get(name: string): BuiltinCommand | undefined {
    return this.builtins.get(name);
  }

  has(name: string): boolean {
    return this.builtins.has(name);
  }

  list(): string[] {
    return Array.from(this.builtins.keys());
  }
}

export const builtinRegistry = new BuiltinRegistry();

// Export convenience functions for compatibility
export function registerBuiltin(name: string, command: BuiltinCommand): void {
  builtinRegistry.register(command);
}

export function getBuiltin(name: string): BuiltinCommand | undefined {
  return builtinRegistry.get(name);
}

export function isBuiltin(name: string): boolean {
  return builtinRegistry.has(name);
}