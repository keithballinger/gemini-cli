export class VirtualFileSystem {
  private files: Map<string, string | Buffer> = new Map();
  private directories: Set<string> = new Set(['/']);

  writeFile(filename: string, content: string | Buffer): void {
    this.ensureParentDirectory(filename);
    this.files.set(filename, content);
  }

  writeFileSync(filename: string, content: string | Buffer): void {
    this.writeFile(filename, content);
  }

  readFile(filename: string): string | Buffer | null {
    return this.files.get(filename) || null;
  }

  readFileSync(filename: string): string | Buffer | null {
    return this.readFile(filename);
  }

  deleteFile(filename: string): boolean {
    return this.files.delete(filename);
  }

  unlinkSync(filename: string): void {
    this.deleteFile(filename);
  }

  listFiles(): Array<{ name: string; content: string | Buffer; size: number }> {
    return Array.from(this.files.entries()).map(([name, content]) => ({
      name,
      content,
      size: typeof content === 'string' 
        ? new TextEncoder().encode(content).length 
        : content.length
    }));
  }

  exists(filename: string): boolean {
    return this.files.has(filename) || this.directories.has(filename);
  }

  existsSync(filename: string): boolean {
    return this.exists(filename);
  }

  mkdirSync(dirPath: string, options?: { recursive?: boolean }): void {
    if (options?.recursive) {
      const parts = dirPath.split('/').filter(p => p);
      let currentPath = '';
      for (const part of parts) {
        currentPath += '/' + part;
        this.directories.add(currentPath);
      }
    } else {
      this.directories.add(dirPath);
    }
  }

  statSync(path: string): any {
    const isDir = this.directories.has(path);
    const isFile = this.files.has(path);
    
    if (!isDir && !isFile) {
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    }

    return {
      isDirectory: () => isDir,
      isFile: () => isFile,
      size: isFile ? this.getFileSize(path) : 0,
      mtime: new Date(),
      ctime: new Date(),
      atime: new Date()
    };
  }

  readdirSync(dirPath: string): string[] {
    const entries: string[] = [];
    const dirPrefix = dirPath.endsWith('/') ? dirPath : dirPath + '/';
    
    // Add files in this directory
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(dirPrefix)) {
        const relativePath = filePath.slice(dirPrefix.length);
        const firstSlash = relativePath.indexOf('/');
        if (firstSlash === -1) {
          entries.push(relativePath);
        }
      }
    }
    
    // Add subdirectories
    for (const dir of this.directories) {
      if (dir !== dirPath && dir.startsWith(dirPrefix)) {
        const relativePath = dir.slice(dirPrefix.length);
        const firstSlash = relativePath.indexOf('/');
        if (firstSlash === -1 && relativePath) {
          entries.push(relativePath);
        }
      }
    }
    
    return [...new Set(entries)];
  }

  private ensureParentDirectory(filePath: string): void {
    const parts = filePath.split('/').filter(p => p);
    parts.pop(); // Remove filename
    
    let currentPath = '';
    for (const part of parts) {
      currentPath += '/' + part;
      this.directories.add(currentPath);
    }
  }

  private getFileSize(filename: string): number {
    const content = this.files.get(filename);
    if (!content) return 0;
    
    if (typeof content === 'string') {
      return new TextEncoder().encode(content).length;
    } else {
      return content.length;
    }
  }

  clear(): void {
    this.files.clear();
    this.directories.clear();
    this.directories.add('/');
  }

  getFileCount(): number {
    return this.files.size;
  }
}