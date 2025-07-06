/**
 * Shell environment management
 * Handles variables, aliases, working directory, and job tracking
 */

import * as os from 'os';
import * as path from 'path';
import { ShellEnvironment, Job, ShellOptions } from './types.js';

export class ShellEnvironmentManager implements ShellEnvironment {
  variables: Map<string, string>;
  aliases: Map<string, string>;
  functions: Map<string, string>;
  jobs: Map<number, Job>;
  lastExitCode: number;
  cwd: string;
  history: string[];
  
  private nextJobId: number = 1;
  options: ShellOptions; // Made public for persistence

  constructor(options: Partial<ShellOptions> = {}) {
    this.options = {
      interactiveMode: true,
      posixMode: true,
      debugMode: false,
      enableJobControl: true,
      enableHistory: true,
      enableAliases: true,
      enableGlobbing: true,
      historySize: 1000,
      maxJobs: 100,
      ...options
    };

    this.variables = new Map();
    this.aliases = new Map();
    this.functions = new Map();
    this.jobs = new Map();
    this.lastExitCode = 0;
    this.cwd = process.cwd();
    this.history = [];

    this.initializeEnvironment();
  }

  private initializeEnvironment(): void {
    // Copy environment variables
    Object.entries(process.env).forEach(([key, value]) => {
      if (value !== undefined) {
        this.variables.set(key, value);
      }
    });

    // Set shell-specific variables
    this.variables.set('PWD', this.cwd);
    this.variables.set('OLDPWD', this.cwd);
    this.variables.set('HOME', os.homedir());
    this.variables.set('USER', os.userInfo().username);
    this.variables.set('SHELL', process.argv[0]);
    this.variables.set('SHLVL', String((parseInt(process.env.SHLVL || '0') || 0) + 1));
    this.variables.set('PS1', '\\u@\\h:\\w\\$ '); // Default prompt
    this.variables.set('PS2', '> '); // Continuation prompt
    this.variables.set('IFS', ' \t\n'); // Internal Field Separator
    
    // Set shell options
    if (this.options.posixMode) {
      this.variables.set('POSIXLY_CORRECT', '1');
    }
  }

  /**
   * Get a variable value
   */
  getVariable(name: string): string | undefined {
    return this.variables.get(name);
  }

  /**
   * Set a variable
   */
  setVariable(name: string, value: string): void {
    this.variables.set(name, value);
    
    // Update process.env for child processes
    process.env[name] = value;
  }

  /**
   * Unset a variable
   */
  unsetVariable(name: string): void {
    this.variables.delete(name);
    delete process.env[name];
  }

  /**
   * Export variables for child processes
   */
  exportVariable(name: string, value?: string): void {
    if (value !== undefined) {
      this.setVariable(name, value);
    } else if (!this.variables.has(name)) {
      // Export with empty value if not set
      this.setVariable(name, '');
    }
  }

  /**
   * Get all exported variables
   */
  getExportedVariables(): Record<string, string> {
    const exported: Record<string, string> = {};
    this.variables.forEach((value, key) => {
      exported[key] = value;
    });
    return exported;
  }

  /**
   * Change working directory
   */
  changeDirectory(dir: string): void {
    const oldPwd = this.cwd;
    
    // Handle special cases
    if (dir === '-') {
      dir = this.getVariable('OLDPWD') || oldPwd;
    } else if (dir === '~' || dir.startsWith('~/')) {
      const home = this.getVariable('HOME') || os.homedir();
      dir = dir === '~' ? home : path.join(home, dir.slice(2));
    }
    
    // Resolve to absolute path
    const newPwd = path.resolve(this.cwd, dir);
    
    // Update environment
    this.setVariable('OLDPWD', oldPwd);
    this.setVariable('PWD', newPwd);
    this.cwd = newPwd;
    
    // Update process working directory
    process.chdir(newPwd);
  }

  /**
   * Add command to history
   */
  addToHistory(command: string): void {
    if (!this.options.enableHistory || !command.trim()) {
      return;
    }

    // Don't add duplicates of the last command
    if (this.history.length > 0 && this.history[this.history.length - 1] === command) {
      return;
    }

    this.history.push(command);

    // Trim history if it exceeds the limit
    if (this.history.length > this.options.historySize) {
      this.history = this.history.slice(-this.options.historySize);
    }
  }

  /**
   * Create a new job
   */
  createJob(command: string, pid: number, background: boolean = false): Job {
    const job: Job = {
      id: this.nextJobId++,
      pid,
      command,
      status: 'running',
      background
    };
    
    this.jobs.set(job.id, job);
    
    // Clean up old jobs if we exceed the limit
    if (this.jobs.size > this.options.maxJobs) {
      // Remove completed jobs first
      for (const [id, j] of this.jobs.entries()) {
        if (j.status === 'done') {
          this.jobs.delete(id);
          if (this.jobs.size <= this.options.maxJobs) {
            break;
          }
        }
      }
    }
    
    return job;
  }

  /**
   * Update job status
   */
  updateJobStatus(jobId: number, status: Job['status'], exitCode?: number): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      if (exitCode !== undefined) {
        job.exitCode = exitCode;
      }
    }
  }

  /**
   * Get job by ID
   */
  getJob(jobId: number): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Remove completed jobs
   */
  cleanupJobs(): void {
    for (const [id, job] of this.jobs.entries()) {
      if (job.status === 'done') {
        this.jobs.delete(id);
      }
    }
  }

  /**
   * Clone the environment for subshells
   */
  clone(): ShellEnvironmentManager {
    const cloned = new ShellEnvironmentManager(this.options);
    
    // Deep copy all properties
    cloned.variables = new Map(this.variables);
    cloned.aliases = new Map(this.aliases);
    cloned.functions = new Map(this.functions);
    cloned.jobs = new Map(this.jobs);
    cloned.lastExitCode = this.lastExitCode;
    cloned.cwd = this.cwd;
    cloned.history = [...this.history];
    cloned.nextJobId = this.nextJobId;
    
    return cloned;
  }
}