import { VirtualFileSystem } from '../core/VirtualFileSystem';

export interface BrowserFileWriterOptions {
  vfs: VirtualFileSystem;
}

export class BrowserFileWriter {
  private vfs: VirtualFileSystem;

  constructor(options: BrowserFileWriterOptions) {
    this.vfs = options.vfs;
  }

  writeFile(filename: string, content: string): void {
    this.vfs.writeFile(filename, content);
  }

  downloadFile(filename: string, content?: string): void {
    const fileContent = content || this.vfs.readFile(filename);
    if (!fileContent) {
      throw new Error(`File ${filename} not found`);
    }

    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
  }

  downloadAllFiles(): void {
    const files = this.vfs.listFiles();
    
    if (files.length === 0) {
      throw new Error('No files to download');
    }

    if (files.length === 1) {
      this.downloadFile(files[0].name);
      return;
    }

    // For multiple files, create a simple archive format
    let archive = '';
    files.forEach(file => {
      archive += `--- FILE: ${file.name} ---\n`;
      archive += file.content;
      archive += `\n--- END FILE: ${file.name} ---\n\n`;
    });

    const blob = new Blob([archive], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gemini-files-archive.txt';
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  deleteFile(filename: string): boolean {
    return this.vfs.deleteFile(filename);
  }

  clearAllFiles(): void {
    this.vfs.clear();
  }

  exportAsJSON(): void {
    const files = this.vfs.listFiles();
    const exportData = {
      timestamp: new Date().toISOString(),
      files: files.map(file => ({
        name: file.name,
        content: file.content,
        size: file.size
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gemini-workspace.json';
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }
}