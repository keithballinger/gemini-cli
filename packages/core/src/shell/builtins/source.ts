/**
 * source (.) - execute commands from file in current shell
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { BuiltinCommand, ShellEnvironment, ShellOptions } from '../types.js';

const readFile = promisify(fs.readFile);

export class SourceCommand implements BuiltinCommand {
  name = 'source';
  description = 'Execute commands from file in current shell';
  aliases = ['.'];  // The . command is an alias for source

  async execute(args: string[], env: ShellEnvironment, options: ShellOptions): Promise<number> {
    if (args.length === 0) {
      console.error(`${this.name}: filename argument required`);
      return 2;
    }

    const filename = args[0];
    let filePath = filename;

    // Resolve the file path
    if (!path.isAbsolute(filePath)) {
      // First check current directory
      filePath = path.join(env.cwd, filename);
      
      // If not found and doesn't contain /, search in PATH
      if (!fs.existsSync(filePath) && !filename.includes('/')) {
        const pathDirs = (env.getVariable('PATH') || '').split(':');
        for (const dir of pathDirs) {
          const candidate = path.join(dir, filename);
          if (fs.existsSync(candidate)) {
            filePath = candidate;
            break;
          }
        }
      }
    }

    try {
      // Read the file
      const content = await readFile(filePath, 'utf8');
      
      // TODO: Execute each line through the shell parser and executor
      // For now, we'll just print a message
      console.error(`source: executing commands from ${filePath} not yet implemented`);
      
      // Split into lines and process each
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }
        
        // TODO: Parse and execute the line
        // This requires access to the shell's parser and executor
      }
      
      return 0;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error(`${this.name}: ${filename}: No such file or directory`);
      } else if (error.code === 'EACCES') {
        console.error(`${this.name}: ${filename}: Permission denied`);
      } else {
        console.error(`${this.name}: ${filename}: ${error.message || String(error)}`);
      }
      return 1;
    }
  }

  help(): string {
    return `source filename [arguments]
. filename [arguments]

Read and execute commands from FILENAME in the current shell environment.

If FILENAME does not contain a slash, file names in PATH are used to find
the directory containing FILENAME.

The return status is the status of the last command executed in FILENAME;
fails if FILENAME cannot be read.`;
  }
}