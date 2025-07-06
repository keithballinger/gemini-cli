/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Readable, Writable } from 'stream';

/**
 * Core types for the POSIX-compliant shell implementation
 */

export interface Command {
  type: 'simple' | 'pipeline' | 'compound' | 'builtin';
  executable?: string;
  args: string[];
  redirections: Redirection[];
  background: boolean;
}

export interface ParsedCommand extends Command {
  raw: string;
  tokens: Token[];
}

export interface Token {
  type: 'word' | 'operator' | 'redirect' | 'pipe' | 'separator';
  value: string;
  position: {
    start: number;
    end: number;
  };
}

export interface Redirection {
  type: 'input' | 'output' | 'append' | 'error';
  fd?: number;
  target: string;
}

export interface Pipeline {
  commands: Command[];
}

export interface CompoundCommand {
  type: 'sequence' | 'and' | 'or';
  left: Command | Pipeline | CompoundCommand;
  right: Command | Pipeline | CompoundCommand;
}

export interface Job {
  id: number;
  pid: number;
  command: string;
  status: 'running' | 'stopped' | 'done';
  background: boolean;
  processGroup?: number;
  exitCode?: number;
}

/**
 * Shell environment for managing variables and state
 */
export interface ShellEnvironment {
  variables: Map<string, string>;
  aliases: Map<string, string>;
  functions: Map<string, string>;
  jobs: Map<number, Job>;
  lastExitCode: number;
  cwd: string;
  history: string[];
  geminiResponses: string[];
  
  // Methods
  getVariable(name: string): string | undefined;
  setVariable(name: string, value: string): void;
  unsetVariable(name: string): void;
  exportVariable(name: string, value?: string): void;
  getExportedVariables(): Record<string, string>;
  changeDirectory(dir: string): void;
  addToHistory(command: string): void;
  addGeminiResponse(response: string): void;
  getGeminiResponse(index?: number): string | undefined;
  createJob(command: string, pid: number, background: boolean): Job;
  updateJobStatus(jobId: number, status: Job['status'], exitCode?: number): void;
  getJob(jobId: number): Job | undefined;
  getAllJobs(): Job[];
  getAliases(): Map<string, string>;
  setAlias(name: string, value: string): void;
  getAllVariables(): Record<string, string>;
  getCwd(): string;
  setCwd(path: string): void;
  getHistory(): string[];
}

/**
 * Options for shell execution
 */
export interface ShellOptions {
  // Shell behavior options
  interactiveMode: boolean;
  posixMode: boolean;
  debugMode: boolean;
  
  // Feature toggles
  enableJobControl: boolean;
  enableHistory: boolean;
  enableAliases: boolean;
  enableGlobbing: boolean;
  
  // Limits
  historySize: number;
  maxJobs: number;
}

/**
 * Shell execution result
 */
export interface ShellExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  signal?: string;
  error?: Error;
  aborted: boolean;
  finalWorkingDirectory?: string;
}

export interface ExecutionResult extends ShellExecutionResult {}

/**
 * Options for command execution
 */
export interface ExecutionOptions {
  cwd?: string;
  env?: Record<string, string>;
  onOutput?: (chunk: string) => void;
  onError?: (chunk: string) => void;
  onDebug?: (message: string) => void;
  abortSignal?: AbortSignal;
  captureWorkingDirectory?: boolean;
}

/**
 * Built-in command interface
 */
export interface BuiltinCommand {
  name: string;
  description: string;
  aliases?: string[];
  execute: (
    args: string[], 
    env: ShellEnvironment, 
    options: ShellOptions & ExecutionOptions
  ) => Promise<number>;
  help(): string;
}

export class ShellError extends Error {
  constructor(
    message: string,
    public code: string,
    public exitCode: number = 1
  ) {
    super(message);
    this.name = 'ShellError';
  }
}

export class ParseError extends ShellError {
  constructor(message: string, public position?: { start: number; end: number }) {
    super(message, 'PARSE_ERROR', 2);
    this.name = 'ParseError';
  }
}

export class CommandNotFoundError extends ShellError {
  constructor(command: string) {
    super(`Command not found: ${command}`, 'COMMAND_NOT_FOUND', 127);
    this.name = 'CommandNotFoundError';
  }
}