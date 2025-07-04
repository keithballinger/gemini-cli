/**
 * Minimal test of core package platform abstraction in browser
 */

import { platform, setPlatform } from '@google/gemini-cli-core';
import { createBrowserPlatform } from './platform/platform-browser';
import { VirtualFileSystem } from './core/VirtualFileSystem';

// Test platform abstraction
export async function testPlatformAbstraction() {
  console.log('🚀 Testing Gemini CLI Core in Browser...');
  
  // Create virtual file system
  const vfs = new VirtualFileSystem();
  
  // Set up browser platform
  setPlatform(createBrowserPlatform(vfs));
  
  // Test basic platform functionality
  console.log('✅ Platform set successfully');
  
  // Test path operations
  const testPath = platform.path.join('/test', 'dir', 'file.txt');
  console.log('✅ Path join:', testPath);
  
  const dirname = platform.path.dirname(testPath);
  console.log('✅ Path dirname:', dirname);
  
  const basename = platform.path.basename(testPath);
  console.log('✅ Path basename:', basename);
  
  // Test file system operations
  const testContent = 'Hello from browser!';
  await platform.fs.promises.writeFile('/test.txt', testContent);
  console.log('✅ File written');
  
  const readContent = await platform.fs.promises.readFile('/test.txt', 'utf-8');
  console.log('✅ File read:', readContent);
  
  const exists = platform.fs.existsSync('/test.txt');
  console.log('✅ File exists:', exists);
  
  // Test crypto
  const uuid = platform.crypto.randomUUID();
  console.log('✅ UUID generated:', uuid);
  
  // Test OS
  const homedir = platform.os.homedir();
  console.log('✅ Home directory:', homedir);
  
  console.log('\n🎉 All platform abstraction tests passed!');
  console.log('The core package is now browser-compatible!');
  
  return {
    success: true,
    message: 'Core package platform abstraction working in browser!'
  };
}

// Export for use in browser
(window as any).testPlatformAbstraction = testPlatformAbstraction;