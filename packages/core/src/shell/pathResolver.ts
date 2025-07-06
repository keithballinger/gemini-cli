/**
 * Path resolution utilities for shell commands
 * Resolves command names to executable paths
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const access = promisify(fs.access);
const stat = promisify(fs.stat);

/**
 * Resolve a command to its full path
 */
export async function resolveCommand(command: string, pathEnv: string): Promise<string | null> {
  // If command contains a slash, treat it as a path
  if (command.includes('/')) {
    const fullPath = path.resolve(command);
    if (await isExecutable(fullPath)) {
      return fullPath;
    }
    return null;
  }

  // Search in PATH
  const pathDirs = pathEnv.split(':').filter(dir => dir.length > 0);
  
  for (const dir of pathDirs) {
    const fullPath = path.join(dir, command);
    if (await isExecutable(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

/**
 * Check if a file is executable
 */
export async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fs.constants.X_OK);
    const stats = await stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Resolve a path relative to the current working directory
 */
export function resolvePath(relativePath: string, cwd: string): string {
  // Handle ~ expansion
  if (relativePath === '~' || relativePath.startsWith('~/')) {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    return relativePath === '~' 
      ? home 
      : path.join(home, relativePath.slice(2));
  }

  // Handle absolute paths
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }

  // Resolve relative to cwd
  return path.resolve(cwd, relativePath);
}

/**
 * Find all executables matching a pattern in PATH
 */
export async function findExecutables(pattern: string, pathEnv: string): Promise<string[]> {
  const executables: string[] = [];
  const pathDirs = pathEnv.split(':').filter(dir => dir.length > 0);
  const seen = new Set<string>();

  for (const dir of pathDirs) {
    try {
      const entries = await fs.promises.readdir(dir);
      
      for (const entry of entries) {
        if (entry.includes(pattern) && !seen.has(entry)) {
          const fullPath = path.join(dir, entry);
          if (await isExecutable(fullPath)) {
            executables.push(entry);
            seen.add(entry);
          }
        }
      }
    } catch {
      // Skip directories we can't read
      continue;
    }
  }

  return executables.sort();
}

/**
 * Check if a command exists in PATH
 */
export async function commandExists(command: string, pathEnv: string): Promise<boolean> {
  const resolved = await resolveCommand(command, pathEnv);
  return resolved !== null;
}

/**
 * Get the directory containing the command
 */
export async function getCommandDir(command: string, pathEnv: string): Promise<string | null> {
  const resolved = await resolveCommand(command, pathEnv);
  return resolved ? path.dirname(resolved) : null;
}