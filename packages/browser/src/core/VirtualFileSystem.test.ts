import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualFileSystem } from './VirtualFileSystem';

describe('VirtualFileSystem', () => {
  let vfs: VirtualFileSystem;

  beforeEach(() => {
    vfs = new VirtualFileSystem();
  });

  it('should write and read files', () => {
    const filename = 'test.txt';
    const content = 'Hello, world!';

    vfs.writeFile(filename, content);
    expect(vfs.readFile(filename)).toBe(content);
  });

  it('should return null for non-existent files', () => {
    expect(vfs.readFile('nonexistent.txt')).toBeNull();
  });

  it('should check file existence', () => {
    const filename = 'test.txt';
    expect(vfs.exists(filename)).toBe(false);
    
    vfs.writeFile(filename, 'content');
    expect(vfs.exists(filename)).toBe(true);
  });

  it('should delete files', () => {
    const filename = 'test.txt';
    vfs.writeFile(filename, 'content');
    
    expect(vfs.exists(filename)).toBe(true);
    expect(vfs.deleteFile(filename)).toBe(true);
    expect(vfs.exists(filename)).toBe(false);
    expect(vfs.deleteFile(filename)).toBe(false); // Already deleted
  });

  it('should list files with metadata', () => {
    vfs.writeFile('file1.txt', 'content1');
    vfs.writeFile('file2.txt', 'longer content here');
    
    const files = vfs.listFiles();
    expect(files).toHaveLength(2);
    
    const file1 = files.find(f => f.name === 'file1.txt');
    const file2 = files.find(f => f.name === 'file2.txt');
    
    expect(file1).toBeDefined();
    expect(file1?.content).toBe('content1');
    expect(file1?.size).toBe(8); // Length of 'content1' in bytes
    
    expect(file2).toBeDefined();
    expect(file2?.content).toBe('longer content here');
    expect(file2?.size).toBe(19); // Length of 'longer content here' in bytes
  });

  it('should clear all files', () => {
    vfs.writeFile('file1.txt', 'content1');
    vfs.writeFile('file2.txt', 'content2');
    
    expect(vfs.getFileCount()).toBe(2);
    vfs.clear();
    expect(vfs.getFileCount()).toBe(0);
    expect(vfs.listFiles()).toHaveLength(0);
  });

  it('should count files correctly', () => {
    expect(vfs.getFileCount()).toBe(0);
    
    vfs.writeFile('file1.txt', 'content');
    expect(vfs.getFileCount()).toBe(1);
    
    vfs.writeFile('file2.txt', 'content');
    expect(vfs.getFileCount()).toBe(2);
    
    vfs.deleteFile('file1.txt');
    expect(vfs.getFileCount()).toBe(1);
  });
});