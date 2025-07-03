#!/usr/bin/env node

// Diagnostic test for IPC communication with better logging

import { spawn } from 'child_process';
import readline from 'readline';

console.log('=== IPC Diagnostic Test ===');
console.log('Starting Gemini CLI in IPC mode...\n');

const cli = spawn('node', ['bundle/gemini.js', '--ipc'], {
  cwd: '/Users/keithballinger/Desktop/projects/gemini-cli'
});

const rl = readline.createInterface({
  input: cli.stdout,
  output: process.stdout,
  terminal: false
});

let messagesSent = 0;
let responsesReceived = 0;

cli.stderr.on('data', (data) => {
  const stderr = data.toString();
  // Only show non-deprecation warnings
  if (!stderr.includes('DeprecationWarning')) {
    console.error('[CLI STDERR]:', stderr.trim());
  }
});

rl.on('line', (line) => {
  console.log('\n[CLI RESPONSE]:', line);
  responsesReceived++;
  
  try {
    const json = JSON.parse(line);
    console.log('[PARSED]:', JSON.stringify(json, null, 2));
    
    // Track message IDs
    if (json.id) {
      console.log(`[RESPONSE ID]: ${json.id}`);
    }
  } catch (e) {
    console.log('[NOT JSON]');
  }
});

// Function to send a message
function sendMessage(message, id) {
  const request = {
    id: id,
    method: 'chat.send',
    params: {
      message: message,
      context: null
    }
  };
  
  console.log(`\n[SENDING REQUEST ${id}]:`, JSON.stringify(request));
  cli.stdin.write(JSON.stringify(request) + '\n');
  messagesSent++;
}

// Wait for initialization
setTimeout(() => {
  console.log('\n=== Sending Test Messages ===');
  
  // Send first message
  sendMessage('Hello from diagnostic test', 'test-1');
  
  // Send second message after a delay
  setTimeout(() => {
    sendMessage('What is 2+2?', 'test-2');
  }, 2000);
  
  // Send third message
  setTimeout(() => {
    sendMessage('List the files in the current directory', 'test-3');
  }, 4000);
  
}, 2000);

// Summary after 10 seconds
setTimeout(() => {
  console.log('\n=== Test Summary ===');
  console.log(`Messages sent: ${messagesSent}`);
  console.log(`Responses received: ${responsesReceived}`);
  console.log('\nExiting...');
  cli.kill();
  process.exit(0);
}, 10000);

// Handle CLI exit
cli.on('exit', (code) => {
  console.log(`\n[CLI EXITED] with code: ${code}`);
});