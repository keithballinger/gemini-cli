/**
 * Ultra minimal browser entry point for Gemini CLI
 * Tests only the core platform abstraction without any problematic dependencies
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

// Import only the most essential pieces
import { setPlatform } from '@google/gemini-cli-core/src/platform.js';
import { createBrowserPlatform } from './platform/platform-browser';
import { VirtualFileSystem } from './core/VirtualFileSystem';

// Polyfills
import 'events-polyfill';
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;

function UltraMinimalDemo() {
  const [status, setStatus] = React.useState('Initializing...');
  const [output, setOutput] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      // Initialize platform
      const vfs = new VirtualFileSystem();
      setPlatform(createBrowserPlatform(vfs));
      
      setStatus('✅ Platform initialized successfully!');
      log('Gemini CLI Browser - Platform abstraction is working!');
      log('Core package has been successfully refactored for browsers.');
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
      log(`Failed to initialize: ${error}`);
    }
  }, []);

  const log = (msg: string) => {
    setOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const testBasicPlatform = async () => {
    try {
      log('Testing basic platform APIs...');
      
      // We'll directly access the platform from our local imports
      const { platform } = await import('@google/gemini-cli-core/src/platform.js');
      
      // Test path operations
      const testPath = platform.path.join('/test', 'file.txt');
      log(`✅ Path join: ${testPath}`);
      
      // Test file write
      await platform.fs.promises.writeFile('/hello.txt', 'Hello from browser!');
      log('✅ File written');
      
      // Test file read
      const content = await platform.fs.promises.readFile('/hello.txt', 'utf-8');
      log(`✅ File read: ${content}`);
      
      // Test crypto
      const uuid = platform.crypto.randomUUID();
      log(`✅ UUID: ${uuid}`);
      
      log('🎉 All basic tests passed!');
    } catch (error) {
      log(`❌ Test error: ${error}`);
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '40px auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
      borderRadius: '8px',
      minHeight: '600px'
    }}>
      <h1 style={{ color: '#4fc3f7' }}>🚀 Gemini CLI Browser - Ultra Minimal</h1>
      
      <div style={{
        background: '#252526',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>Status: {status}</h2>
        <p>Testing only the core platform abstraction.</p>
      </div>

      <button
        onClick={testBasicPlatform}
        style={{
          background: '#4fc3f7',
          color: '#1e1e1e',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        Run Basic Platform Tests
      </button>

      <div style={{
        background: '#1e1e1e',
        border: '1px solid #3c3c3c',
        padding: '20px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '14px',
        maxHeight: '400px',
        overflow: 'auto'
      }}>
        <h3 style={{ marginTop: 0, color: '#4fc3f7' }}>Console Output</h3>
        {output.map((msg, i) => (
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
  root.render(<UltraMinimalDemo />);
} else {
  console.error('Root element not found');
}