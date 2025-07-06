/**
 * Main entry point for the POSIX-compliant shell module
 */

export * from './types.js';
export * from './parser.js';
export * from './executor.js';
export * from './environment.js';
export * from './builtins/index.js';
export * from './jobControl.js';
export * from './pathResolver.js';
export * from './expansion.js';
export * from './persistence.js';
export * from './shellInterface.js';