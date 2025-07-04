import React, { useState, useRef } from 'react';
import { VirtualFileSystem } from '../core/VirtualFileSystem';

interface FileManagerProps {
  vfs: VirtualFileSystem;
}

export function FileManager({ vfs }: FileManagerProps) {
  const [files, setFiles] = useState<Array<{ name: string; content: string; size: number }>>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshFiles = () => {
    const fileList = vfs.listFiles();
    setFiles(fileList);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (const file of files) {
      const content = await file.text();
      vfs.writeFile(file.name, content);
    }
    
    refreshFiles();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    
    for (const file of files) {
      const content = await file.text();
      vfs.writeFile(file.name, content);
    }
    
    refreshFiles();
  };

  const downloadFile = (filename: string) => {
    const content = vfs.readFile(filename);
    if (content) {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const deleteFile = (filename: string) => {
    vfs.deleteFile(filename);
    refreshFiles();
    if (selectedFile === filename) {
      setSelectedFile(null);
    }
  };

  React.useEffect(() => {
    refreshFiles();
  }, []);

  const selectedFileContent = selectedFile ? vfs.readFile(selectedFile) : null;

  return (
    <div className="file-manager">
      <div className="file-actions">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="file-input"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="upload-button">
          Upload Files
        </label>
      </div>

      <div 
        className="drop-zone"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="file-list">
          <h3>Files ({files.length})</h3>
          {files.length === 0 ? (
            <p className="no-files">No files uploaded. Drag and drop files here or use the upload button.</p>
          ) : (
            files.map((file) => (
              <div
                key={file.name}
                className={`file-item ${selectedFile === file.name ? 'selected' : ''}`}
                onClick={() => setSelectedFile(file.name)}
              >
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{file.size} bytes</span>
                </div>
                <div className="file-actions">
                  <button onClick={(e) => { e.stopPropagation(); downloadFile(file.name); }}>
                    Download
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteFile(file.name); }}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedFile && selectedFileContent && (
          <div className="file-preview">
            <h3>Preview: {selectedFile}</h3>
            <pre className="file-content">{selectedFileContent}</pre>
          </div>
        )}
      </div>
    </div>
  );
}