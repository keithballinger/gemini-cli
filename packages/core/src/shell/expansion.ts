/**
 * Variable and glob expansion utilities for the shell
 * Handles $VAR, ${VAR}, command substitution, and glob patterns
 */

import * as glob from 'glob';
import * as path from 'path';
import { ShellEnvironment } from './types.js';

/**
 * Expand variables in a string
 * Handles $VAR, ${VAR}, and special variables like $?, $$, $#
 */
export function expandVariables(input: string, env: ShellEnvironment): string {
  // Handle special variables first
  let expanded = input
    .replace(/\$\?/g, String(env.lastExitCode))
    .replace(/\$\$/g, String(process.pid))
    .replace(/\$#/g, '0') // Will be updated when we have proper arg handling
    .replace(/\$@/g, '') // Will be updated for scripts
    .replace(/\$\*/g, ''); // Will be updated for scripts

  // Handle ${VAR} format
  expanded = expanded.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, varName) => {
    return env.getVariable(varName) || '';
  });

  // Handle $VAR format
  expanded = expanded.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, varName) => {
    return env.getVariable(varName) || '';
  });

  return expanded;
}

/**
 * Expand tilde (~) in paths
 */
export function expandTilde(input: string, env: ShellEnvironment): string {
  if (input === '~' || input.startsWith('~/')) {
    const home = env.getVariable('HOME') || process.env.HOME || '';
    return input === '~' ? home : path.join(home, input.slice(2));
  }
  
  // Handle ~username format
  if (input.startsWith('~') && !input.startsWith('~/')) {
    const slashIndex = input.indexOf('/');
    const username = slashIndex > 0 ? input.slice(1, slashIndex) : input.slice(1);
    const rest = slashIndex > 0 ? input.slice(slashIndex) : '';
    
    // Try to get user's home directory
    try {
      // On Unix-like systems, we could use getpwnam, but in Node.js we'll use a simpler approach
      if (username === process.env.USER || username === process.env.USERNAME) {
        // Current user
        const home = env.getVariable('HOME') || process.env.HOME || '';
        return home + rest;
      } else {
        // For other users, try common patterns
        const possibleHome = path.join('/home', username);
        if (require('fs').existsSync(possibleHome)) {
          return possibleHome + rest;
        }
        // On macOS
        const macHome = path.join('/Users', username);
        if (require('fs').existsSync(macHome)) {
          return macHome + rest;
        }
      }
    } catch {
      // If we can't determine the home directory, return as-is
    }
    
    return input;
  }
  
  return input;
}

/**
 * Expand glob patterns
 * Returns array of matching files or original pattern if no matches
 */
export async function expandGlobs(pattern: string, cwd: string): Promise<string[]> {
  // Don't expand if pattern is quoted or doesn't contain glob chars
  if (!containsGlobChars(pattern)) {
    return [pattern];
  }

  try {
    const matches = await glob.glob(pattern, {
      cwd,
      dot: false, // Don't match hidden files by default
      nodir: false, // Include directories
      mark: false, // Don't append / to directories
      absolute: false // Return relative paths
    });

    // If no matches, return the original pattern (POSIX behavior)
    return matches.length > 0 ? matches.sort() : [pattern];
  } catch (error) {
    // On error, return original pattern
    return [pattern];
  }
}

/**
 * Check if a string contains glob characters
 */
function containsGlobChars(str: string): boolean {
  return /[*?[\]{}]/.test(str);
}

/**
 * Expand a command substitution $(command) or `command`
 */
export async function expandCommandSubstitution(
  input: string,
  env: ShellEnvironment,
  executor?: (cmd: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>
): Promise<string> {
  if (!executor) {
    // Without an executor, return as-is
    return input;
  }

  let result = input;

  // Handle $(command) syntax
  const dollarPattern = /\$\(([^)]+)\)/g;
  let match;
  const replacements: Array<{ start: number; end: number; replacement: string }> = [];

  while ((match = dollarPattern.exec(input)) !== null) {
    const command = match[1];
    try {
      const { stdout } = await executor(command);
      // Remove trailing newline from command substitution
      const output = stdout.trimEnd();
      replacements.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement: output
      });
    } catch (error) {
      // On error, substitute empty string
      replacements.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement: ''
      });
    }
  }

  // Handle `command` syntax (backticks)
  const backtickPattern = /`([^`]+)`/g;
  while ((match = backtickPattern.exec(input)) !== null) {
    const command = match[1];
    try {
      const { stdout } = await executor(command);
      const output = stdout.trimEnd();
      replacements.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement: output
      });
    } catch (error) {
      replacements.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement: ''
      });
    }
  }

  // Apply replacements in reverse order to maintain positions
  replacements.sort((a, b) => b.start - a.start);
  for (const { start, end, replacement } of replacements) {
    result = result.substring(0, start) + replacement + result.substring(end);
  }

  return result;
}

/**
 * Perform brace expansion {a,b,c} or {1..10}
 */
export function expandBraces(input: string): string[] {
  // Simple comma-separated brace expansion
  const braceMatch = input.match(/\{([^}]+)\}/);
  if (!braceMatch) {
    return [input];
  }

  const [fullMatch, content] = braceMatch;
  const prefix = input.substring(0, braceMatch.index!);
  const suffix = input.substring(braceMatch.index! + fullMatch.length);

  // Handle sequence expansion {1..10}
  const sequenceMatch = content.match(/^(\d+)\.\.(\d+)$/);
  if (sequenceMatch) {
    const start = parseInt(sequenceMatch[1]);
    const end = parseInt(sequenceMatch[2]);
    const results: string[] = [];
    
    if (start <= end) {
      for (let i = start; i <= end; i++) {
        results.push(prefix + i + suffix);
      }
    } else {
      for (let i = start; i >= end; i--) {
        results.push(prefix + i + suffix);
      }
    }
    
    return results;
  }

  // Handle comma-separated expansion {a,b,c}
  const items = content.split(',');
  return items.map(item => prefix + item.trim() + suffix);
}

/**
 * Perform all expansions on a string in the correct order
 * Order: brace expansion -> tilde expansion -> variable expansion -> glob expansion
 */
export async function expandAll(
  input: string,
  env: ShellEnvironment,
  options: { enableGlobs?: boolean } = {}
): Promise<string[]> {
  // Step 1: Brace expansion
  let results = expandBraces(input);

  // Step 2: Tilde and variable expansion on each result
  results = results.map(str => {
    str = expandTilde(str, env);
    str = expandVariables(str, env);
    return str;
  });

  // Step 3: Glob expansion if enabled
  if (options.enableGlobs !== false) {
    const globResults: string[] = [];
    for (const pattern of results) {
      const matches = await expandGlobs(pattern, env.cwd);
      globResults.push(...matches);
    }
    results = globResults;
  }

  return results;
}

/**
 * Quote a string for safe shell usage
 */
export function quote(str: string): string {
  // If string contains no special characters, return as-is
  if (!/[^A-Za-z0-9_\-./]/.test(str)) {
    return str;
  }

  // Use single quotes and escape any single quotes in the string
  return "'" + str.replace(/'/g, "'\"'\"'") + "'";
}

/**
 * Remove quotes from a string
 */
export function unquote(str: string): string {
  // Remove surrounding quotes if they match
  if ((str.startsWith('"') && str.endsWith('"')) ||
      (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  
  return str;
}

/**
 * Process ANSI-C quoting $'...'
 */
export function processAnsiCQuoting(str: string): string {
  if (!str.startsWith("$'") || !str.endsWith("'")) {
    return str;
  }

  // Extract content between $' and '
  const content = str.slice(2, -1);
  
  // Process escape sequences
  return content
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\v/g, '\v')
    .replace(/\\a/g, '\x07')
    .replace(/\\e/g, '\x1b')
    .replace(/\\\\/g, '\\')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\([0-7]{1,3})/g, (match, octal) => {
      return String.fromCharCode(parseInt(octal, 8));
    })
    .replace(/\\x([0-9a-fA-F]{1,2})/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    })
    .replace(/\\u([0-9a-fA-F]{4})/g, (match, unicode) => {
      return String.fromCharCode(parseInt(unicode, 16));
    })
    .replace(/\\U([0-9a-fA-F]{8})/g, (match, unicode) => {
      const codePoint = parseInt(unicode, 16);
      return String.fromCodePoint(codePoint);
    });
}