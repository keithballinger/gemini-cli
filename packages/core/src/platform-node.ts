/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { spawn, ChildProcess as NodeChildProcess } from 'child_process';
import { 
  FileSystemAdapter, 
  PathAdapter, 
  ProcessAdapter, 
  OsAdapter, 
  CryptoAdapter,
  BufferAdapter,
  ChildProcessAdapter,
  PlatformAdapters,
  ChildProcess,
  SpawnOptions,
  FileStats,
  DirectoryEntry
} from './platform.js';

class NodeFileSystemAdapter implements FileSystemAdapter {
  async readFile(path: string): Promise<string> {
    return fsPromises.readFile(path, 'utf-8');
  }

  readFileSync(path: string, encoding?: string): string | Buffer {
    return fs.readFileSync(path, encoding as any);
  }

  async writeFile(path: string, content: string): Promise<void> {
    await fsPromises.writeFile(path, content, 'utf-8');
  }

  writeFileSync(path: string, content: string | Buffer, encoding?: string): void {
    fs.writeFileSync(path, content, encoding as any);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fsPromises.access(path);
      return true;
    } catch {
      return false;
    }
  }

  existsSync(path: string): boolean {
    return fs.existsSync(path);
  }

  async listDirectory(path: string): Promise<string[]> {
    return fsPromises.readdir(path);
  }

  listDirectorySync(path: string): string[] {
    return fs.readdirSync(path);
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await fsPromises.mkdir(path, options);
  }

  async stat(path: string): Promise<FileStats> {
    const stats = await fsPromises.stat(path);
    return {
      isDirectory: () => stats.isDirectory(),
      isFile: () => stats.isFile(),
      size: stats.size,
      mtime: stats.mtime
    };
  }

  async unlink(path: string): Promise<void> {
    await fsPromises.unlink(path);
  }

  async readdir(path: string): Promise<DirectoryEntry[]> {
    const entries = await fsPromises.readdir(path, { withFileTypes: true });
    return entries.map(entry => ({
      name: entry.name,
      isDirectory: () => entry.isDirectory(),
      isFile: () => entry.isFile()
    }));
  }

  // Add missing sync methods
  mkdirSync(path: string, options?: { recursive?: boolean }): void {
    fs.mkdirSync(path, options);
  }

  statSync(path: string): FileStats {
    return fs.statSync(path);
  }

  lstatSync(path: string): FileStats {
    return fs.lstatSync(path);
  }

  unlinkSync(path: string): void {
    fs.unlinkSync(path);
  }

  readdirSync(path: string): string[] {
    return fs.readdirSync(path);
  }

  openSync(path: string, flags: string): number {
    return fs.openSync(path, flags);
  }

  fstatSync(fd: number): FileStats {
    return fs.fstatSync(fd);
  }

  readSync(fd: number, buffer: Buffer, offset: number, length: number, position: number): number {
    return fs.readSync(fd, buffer, offset, length, position);
  }

  closeSync(fd: number): void {
    fs.closeSync(fd);
  }

  // Update promises object
  promises = {
    readFile: async (path: string, encoding?: string): Promise<string | Buffer> => {
      return fsPromises.readFile(path, encoding as any);
    },
    writeFile: async (path: string, content: string | Buffer): Promise<void> => {
      return fsPromises.writeFile(path, content);
    },
    stat: async (path: string): Promise<FileStats> => {
      return fsPromises.stat(path);
    },
    mkdir: async (path: string, options?: { recursive?: boolean }): Promise<void> => {
      await fsPromises.mkdir(path, options);
    },
    rename: async (oldPath: string, newPath: string): Promise<void> => {
      return fsPromises.rename(oldPath, newPath);
    },
    access: async (path: string): Promise<void> => {
      return fsPromises.access(path);
    }
  };
}

class NodePathAdapter implements PathAdapter {
  join(...paths: string[]): string {
    return path.join(...paths);
  }

  resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }

  relative(from: string, to: string): string {
    return path.relative(from, to);
  }

  dirname(p: string): string {
    return path.dirname(p);
  }

  basename(p: string, ext?: string): string {
    return path.basename(p, ext);
  }

  extname(p: string): string {
    return path.extname(p);
  }

  isAbsolute(p: string): boolean {
    return path.isAbsolute(p);
  }

  normalize(p: string): string {
    return path.normalize(p);
  }

  sep: string = path.sep;

  parse(p: string) {
    return path.parse(p);
  }
}

class NodeProcessAdapter implements ProcessAdapter {
  cwd(): string {
    return process.cwd();
  }

  env = process.env;
  platform = process.platform;

  homedir(): string {
    return os.homedir();
  }

  spawn(command: string, args: string[], options?: SpawnOptions): ChildProcess {
    const childProcess = spawn(command, args, {
      cwd: options?.cwd,
      env: options?.env as any,
      shell: options?.shell,
      signal: options?.signal
    });

    return {
      stdout: this.streamToAsyncIterable(childProcess.stdout),
      stderr: this.streamToAsyncIterable(childProcess.stderr),
      exitCode: new Promise((resolve) => {
        childProcess.on('exit', (code) => resolve(code));
      }),
      kill: () => childProcess.kill()
    };
  }

  private async *streamToAsyncIterable(stream: NodeJS.ReadableStream | null): AsyncIterable<string> {
    if (!stream) return;
    
    for await (const chunk of stream) {
      yield chunk.toString();
    }
  }
}

class NodeOsAdapter implements OsAdapter {
  homedir(): string {
    return os.homedir();
  }

  platform(): string {
    return os.platform();
  }

  tmpdir(): string {
    return os.tmpdir();
  }

  type(): string {
    return os.type();
  }

  arch(): string {
    return os.arch();
  }

  hostname(): string {
    return os.hostname();
  }

  EOL: string = os.EOL;
}

class NodeCryptoAdapter implements CryptoAdapter {
  randomUUID(): string {
    return crypto.randomUUID();
  }

  randomBytes(size: number): Buffer {
    return crypto.randomBytes(size);
  }

  createHash(algorithm: string) {
    return crypto.createHash(algorithm);
  }
}

class NodeBufferAdapter implements BufferAdapter {
  from(data: string | ArrayBuffer | Uint8Array, encoding?: string): Buffer {
    return Buffer.from(data as any, encoding as any);
  }

  concat(buffers: Buffer[]): Buffer {
    return Buffer.concat(buffers);
  }

  isBuffer(obj: any): boolean {
    return Buffer.isBuffer(obj);
  }
}

class NodeChildProcessAdapter implements ChildProcessAdapter {
  spawn(command: string, args: string[], options?: any): any {
    return spawn(command, args, options);
  }

  execSync(command: string, options?: any): Buffer | string {
    const { execSync } = require('child_process');
    return execSync(command, options);
  }
}

export function createNodePlatform(): PlatformAdapters {
  return {
    fs: new NodeFileSystemAdapter(),
    path: new NodePathAdapter(),
    process: new NodeProcessAdapter(),
    os: new NodeOsAdapter(),
    crypto: new NodeCryptoAdapter(),
    buffer: new NodeBufferAdapter(),
    childProcess: new NodeChildProcessAdapter()
  };
}