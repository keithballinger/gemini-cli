/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Core shell functionality
export * from './types.js';
export * from './environment.js';
export * from './expansion.js';
export * from './parser.js';
export * from './pathResolver.js';
export * from './executor.js';
export * from './pipelineExecutor.js';
export * from './shellInterface.js';
export * from './persistence.js';
export * from './builtins/index.js';
export * from './jobControl.js';

// Main shell class
export { GeminiShell } from './shellInterface.js';