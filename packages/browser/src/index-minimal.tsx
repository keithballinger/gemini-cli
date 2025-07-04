/**
 * Minimal browser entry point for Gemini CLI
 * Demonstrates core package working in browser without problematic dependencies
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { setPlatform } from '@google/gemini-cli-core';
import { createBrowserPlatform } from './platform/platform-browser';
import { VirtualFileSystem } from './core/VirtualFileSystem';

// Polyfills
import 'events-polyfill';
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;

// Simple test component
function GeminiCLIBrowser() {
  const [status, setStatus] = React.useState('Initializing...');
  const [messages, setMessages] = React.useState<string[]>([]);
  const [apiKey, setApiKey] = React.useState('');

  React.useEffect(() => {
    // Initialize platform
    const vfs = new VirtualFileSystem();
    setPlatform(createBrowserPlatform(vfs));
    
    setStatus('Platform initialized ✅');
    addMessage('Gemini CLI Browser initialized successfully!');
    addMessage('Core package platform abstraction is working.');
  }, []);

  const addMessage = (msg: string) => {
    setMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const testPlatform = async () => {
    try {
      addMessage('Testing platform APIs...');
      
      // Test path operations
      const { platform } = await import('@google/gemini-cli-core');
      const testPath = platform.path.join('/test', 'dir', 'file.txt');
      addMessage(`✅ Path join: ${testPath}`);
      
      // Test file operations
      await platform.fs.promises.writeFile('/test.txt', 'Hello from browser!');
      addMessage('✅ File written to virtual filesystem');
      
      const content = await platform.fs.promises.readFile('/test.txt', 'utf-8');
      addMessage(`✅ File read: ${content}`);
      
      // Test crypto
      const uuid = platform.crypto.randomUUID();
      addMessage(`✅ UUID generated: ${uuid}`);
      
      addMessage('🎉 All platform tests passed!');
    } catch (error) {
      addMessage(`❌ Error: ${error}`);
    }
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <h1 style={{ color: '#1a73e8' }}>🚀 Gemini CLI Browser</h1>
      
      <div style={{
        background: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>Status: {status}</h2>
        <p>Core package successfully integrated with platform abstraction!</p>
      </div>

      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h3>API Key Setup</h3>
        <input
          type="password"
          placeholder="Enter your Gemini API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginBottom: '10px'
          }}
        />
        <button
          onClick={testPlatform}
          style={{
            background: '#1a73e8',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Test Platform Abstraction
        </button>
      </div>

      <div style={{
        background: '#1e1e1e',
        color: '#d4d4d4',
        padding: '20px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '14px',
        maxHeight: '400px',
        overflow: 'auto'
      }}>
        <h3 style={{ color: '#4fc3f7', marginTop: 0 }}>Console Output</h3>
        {messages.map((msg, i) => (
          <div key={i} style={{ 
            marginBottom: '5px',
            color: msg.includes('✅') ? '#4ec9b0' : 
                  msg.includes('❌') ? '#f48771' :
                  msg.includes('🎉') ? '#4fc3f7' : '#d4d4d4'
          }}>
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<GeminiCLIBrowser />);
} else {
  console.error('Root element not found');
}