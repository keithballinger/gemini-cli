import { VirtualFileSystem } from '../core/VirtualFileSystem';

export interface BrowserFileReaderOptions {
  vfs: VirtualFileSystem;
}

export class BrowserFileReader {
  private vfs: VirtualFileSystem;

  constructor(options: BrowserFileReaderOptions) {
    this.vfs = options.vfs;
  }

  async readFile(filename: string): Promise<string | null> {
    // First check virtual filesystem
    const content = this.vfs.readFile(filename);
    if (content !== null) {
      return content;
    }

    // If not in VFS, return null (browser can't read arbitrary files)
    return null;
  }

  async readUploadedFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          resolve(content);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  async readUploadedFiles(files: FileList): Promise<Array<{ name: string; content: string }>> {
    const results: Array<{ name: string; content: string }> = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const content = await this.readUploadedFile(file);
        results.push({ name: file.name, content });
        
        // Also store in VFS for later access
        this.vfs.writeFile(file.name, content);
      } catch (error) {
        console.error(`Failed to read file ${file.name}:`, error);
      }
    }
    
    return results;
  }

  listFiles(): Array<{ name: string; size: number }> {
    return this.vfs.listFiles().map(file => ({
      name: file.name,
      size: file.size
    }));
  }

  fileExists(filename: string): boolean {
    return this.vfs.exists(filename);
  }
}