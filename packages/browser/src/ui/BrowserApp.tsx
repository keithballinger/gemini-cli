import React, { useState } from 'react';
import { ChatInterface } from './ChatInterface';
import { FileManager } from './FileManager';
import { VirtualFileSystem } from '../core/VirtualFileSystem';

export const BrowserApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'files'>('chat');
  const [vfs] = useState(() => new VirtualFileSystem());

  return (
    <div className="browser-app">
      <h1>Gemini CLI Browser</h1>
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          className={`tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          Files
        </button>
      </div>
      <div className="tab-content">
        {activeTab === 'chat' ? (
          <ChatInterface vfs={vfs} />
        ) : (
          <FileManager vfs={vfs} />
        )}
      </div>
    </div>
  );
};