import { Platform } from '@google/gemini-cli-core';
import { VirtualFileSystem } from '../core/VirtualFileSystem';

export function createBrowserPlatform(vfs: VirtualFileSystem): Platform {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return {
    fs: {
      readFileSync: (path: string, encoding?: string) => {
        const content = vfs.readFileSync(path);
        return encoding ? content : Buffer.from(content);
      },
      writeFileSync: (path: string, data: string | Buffer) => {
        const content = typeof data === 'string' ? data : decoder.decode(data as Buffer);
        vfs.writeFileSync(path, content);
      },
      existsSync: (path: string) => vfs.existsSync(path),
      mkdirSync: (path: string, options?: any) => vfs.mkdirSync(path),
      readdirSync: (path: string) => vfs.readdirSync(path),
      statSync: (path: string) => vfs.statSync(path),
      lstatSync: (path: string) => vfs.statSync(path),
      unlinkSync: (path: string) => vfs.deleteFile(path),
      openSync: () => 0, // Dummy file descriptor
      fstatSync: () => ({ size: 0 }),
      readSync: () => 0,
      closeSync: () => {},
      promises: {
        readFile: async (path: string, encoding?: string) => {
          const content = vfs.readFileSync(path);
          return encoding ? content : Buffer.from(content);
        },
        writeFile: async (path: string, data: string | Buffer) => {
          const content = typeof data === 'string' ? data : decoder.decode(data as Buffer);
          vfs.writeFileSync(path, content);
        },
        stat: async (path: string) => vfs.statSync(path),
        mkdir: async (path: string) => vfs.mkdirSync(path),
      }
    },
    path: {
      join: (...paths: string[]) => {
        return paths.join('/').replace(/\/+/g, '/');
      },
      resolve: (...paths: string[]) => {
        const joined = paths.join('/').replace(/\/+/g, '/');
        return joined.startsWith('/') ? joined : '/' + joined;
      },
      dirname: (path: string) => {
        const parts = path.split('/');
        parts.pop();
        return parts.join('/') || '/';
      },
      basename: (path: string, ext?: string) => {
        const parts = path.split('/');
        const base = parts[parts.length - 1] || '';
        if (ext && base.endsWith(ext)) {
          return base.slice(0, -ext.length);
        }
        return base;
      },
      extname: (path: string) => {
        const base = path.split('/').pop() || '';
        const lastDot = base.lastIndexOf('.');
        return lastDot > 0 ? base.slice(lastDot) : '';
      },
      relative: (from: string, to: string) => {
        // Simple relative path implementation
        const fromParts = from.split('/').filter(Boolean);
        const toParts = to.split('/').filter(Boolean);
        
        let i = 0;
        while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
          i++;
        }
        
        const upCount = fromParts.length - i;
        const upParts = Array(upCount).fill('..');
        const remainingParts = toParts.slice(i);
        
        return [...upParts, ...remainingParts].join('/') || '.';
      },
      normalize: (path: string) => {
        const parts = path.split('/').filter(p => p && p !== '.');
        const result: string[] = [];
        
        for (const part of parts) {
          if (part === '..') {
            result.pop();
          } else {
            result.push(part);
          }
        }
        
        return (path.startsWith('/') ? '/' : '') + result.join('/');
      },
      isAbsolute: (path: string) => path.startsWith('/'),
      sep: '/',
      parse: (path: string) => {
        const dir = path.substring(0, path.lastIndexOf('/')) || '/';
        const base = path.substring(path.lastIndexOf('/') + 1);
        const ext = base.includes('.') ? base.substring(base.lastIndexOf('.')) : '';
        const name = base.substring(0, base.length - ext.length);
        return { root: '/', dir, base, ext, name };
      }
    },
    os: {
      homedir: () => '/home/user',
      tmpdir: () => '/tmp',
      platform: () => 'browser' as any,
      EOL: '\n'
    },
    process: {
      cwd: () => '/',
      env: {},
      platform: 'browser' as any
    },
    crypto: {
      randomUUID: () => globalThis.crypto.randomUUID(),
      createHash: (algorithm: string) => {
        let data = '';
        return {
          update: (input: string) => {
            data += input;
            return this;
          },
          digest: (encoding: string) => {
            // Simple hash for browser (not cryptographically secure)
            let hash = 0;
            for (let i = 0; i < data.length; i++) {
              const char = data.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash;
            }
            return Math.abs(hash).toString(16);
          }
        };
      }
    },
    buffer: {
      from: (data: string | ArrayBuffer, encoding?: string) => {
        if (typeof data === 'string') {
          return encoder.encode(data) as any;
        }
        return new Uint8Array(data) as any;
      },
      isBuffer: (obj: any) => obj instanceof Uint8Array
    },
    childProcess: {
      spawn: () => {
        throw new Error('Child processes not supported in browser');
      },
      execSync: () => {
        throw new Error('Child processes not supported in browser');
      }
    }
  };
}