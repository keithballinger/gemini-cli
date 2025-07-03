#!/usr/bin/env node

// Test IPC communication with Gemini CLI

import { spawn } from 'child_process';
import readline from 'readline';

console.log('Starting Gemini CLI in IPC mode...');
const cli = spawn('node', ['bundle/gemini.js', '--ipc'], {
  cwd: '/Users/keithballinger/Desktop/projects/gemini-cli'
});

const rl = readline.createInterface({
  input: cli.stdout,
  output: process.stdout,
  terminal: false
});

cli.stderr.on('data', (data) => {
  console.error('CLI Error:', data.toString());
});

rl.on('line', (line) => {
  console.log('CLI Response:', line);
  try {
    const json = JSON.parse(line);
    console.log('Parsed:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.log('(not JSON)');
  }
});

// Send a test message after connection
setTimeout(() => {
  const request = {
    id: 'test-1',
    method: 'chat.send',
    params: {
      message: 'Hello from IPC test!',
      context: null
    }
  };
  
  console.log('\nSending request:', JSON.stringify(request));
  cli.stdin.write(JSON.stringify(request) + '\n');
}, 2000);

// Keep process alive
setTimeout(() => {
  console.log('\nTest complete, exiting...');
  cli.kill();
  process.exit(0);
}, 10000);