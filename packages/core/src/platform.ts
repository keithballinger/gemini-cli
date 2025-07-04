/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Platform abstraction layer to enable core functionality to work
 * in both Node.js and browser environments
 */

export interface FileSystemAdapter {
  readFileSync(path: string, encoding?: string): string | Buffer;
  writeFileSync(path: string, content: string | Buffer, encoding?: string): void;
  existsSync(path: string): boolean;
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  statSync(path: string): FileStats;
  lstatSync(path: string): FileStats;
  unlinkSync(path: string): void;
  readdirSync(path: string): string[];
  openSync(path: string, flags: string): number;
  fstatSync(fd: number): FileStats;
  readSync(fd: number, buffer: Buffer, offset: number, length: number, position: number): number;
  closeSync(fd: number): void;
  readdir(path: string): Promise<DirectoryEntry[]>;
  promises: {
    readFile(path: string, encoding?: string): Promise<string | Buffer>;
    writeFile(path: string, content: string | Buffer): Promise<void>;
    stat(path: string): Promise<FileStats>;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    rename(oldPath: string, newPath: string): Promise<void>;
    access(path: string): Promise<void>;
  };
}

export interface FileStats {
  isDirectory(): boolean;
  isFile(): boolean;
  size: number;
  mtime: Date;
}

export interface DirectoryEntry {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
}

export interface PathAdapter {
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
  relative(from: string, to: string): string;
  dirname(path: string): string;
  basename(path: string, ext?: string): string;
  extname(path: string): string;
  isAbsolute(path: string): boolean;
  normalize(path: string): string;
  sep: string;
  parse(path: string): {
    root: string;
    dir: string;
    base: string;
    ext: string;
    name: string;
  };
}

export interface ProcessAdapter {
  cwd(): string;
  env: Record<string, string | undefined>;
  platform: string;
}

export interface SpawnOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  shell?: boolean;
  signal?: AbortSignal;
}

export interface ChildProcess {
  stdout: AsyncIterable<string>;
  stderr: AsyncIterable<string>;
  exitCode: Promise<number | null>;
  kill(): void;
}

export interface OsAdapter {
  homedir(): string;
  platform(): string;
  tmpdir(): string;
  type(): string;
  arch(): string;
  hostname(): string;
  EOL: string;
}

export interface CryptoAdapter {
  randomUUID(): string;
  randomBytes(size: number): Buffer;
  createHash(algorithm: string): {
    update(data: string | Buffer): any;
    digest(encoding: string): string;
  };
}

export interface BufferAdapter {
  from(data: string | ArrayBuffer | Uint8Array, encoding?: string): Buffer;
  concat(buffers: Buffer[]): Buffer;
  isBuffer(obj: any): boolean;
}

export interface ChildProcessAdapter {
  spawn(command: string, args: string[], options?: any): any;
  execSync(command: string, options?: any): Buffer | string;
}

export interface PlatformAdapters {
  fs: FileSystemAdapter;
  path: PathAdapter;
  process: ProcessAdapter;
  os: OsAdapter;
  crypto: CryptoAdapter;
  buffer: BufferAdapter;
  childProcess: ChildProcessAdapter;
}

// Global platform instance
let platformInstance: PlatformAdapters | null = null;

export function setPlatform(platform: PlatformAdapters): void {
  platformInstance = platform;
}

export function getPlatform(): PlatformAdapters {
  if (!platformInstance) {
    // In Node.js environment, load the Node platform
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      const { createNodePlatform } = require('./platform-node.js');
      platformInstance = createNodePlatform();
    } else {
      throw new Error('Platform not initialized. Call setPlatform() first.');
    }
  }
  return platformInstance!;
}

// Export a platform constant that will be available for imports
export const platform: PlatformAdapters = new Proxy({} as PlatformAdapters, {
  get(target, prop) {
    return getPlatform()[prop as keyof PlatformAdapters];
  }
});

// Re-export types
export type Platform = PlatformAdapters;