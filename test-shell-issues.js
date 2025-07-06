#!/usr/bin/env node

/**
 * Test script to investigate shell issues:
 * 1. Pasting text shows only "e" until return is pressed
 * 2. Environment variables set with export don't persist
 */

import { GeminiShell } from './packages/core/dist/src/shell/shellInterface.js';
import { ShellPersistence } from './packages/core/dist/src/shell/persistence.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

async function testPersistence() {
  console.log('=== Testing Shell Persistence ===\n');
  
  // Create a test shell
  const shell = new GeminiShell({
    interactiveMode: true,
    enableHistory: true,
    enableAliases: true,
    debugMode: true
  });
  
  // Wait for initialization
  await shell.waitForInitialization();
  
  console.log('1. Testing export command...');
  const result1 = await shell.execute('export TEST_VAR=hello', {
    cwd: process.cwd(),
    onOutput: (chunk) => console.log('Output:', chunk)
  });
  console.log('Exit code:', result1.exitCode);
  
  console.log('\n2. Checking if variable was set...');
  const result2 = await shell.execute('echo $TEST_VAR', {
    cwd: process.cwd(),
    onOutput: (chunk) => console.log('Output:', chunk)
  });
  
  console.log('\n3. Listing all exported variables...');
  const result3 = await shell.execute('export', {
    cwd: process.cwd(),
    onOutput: (chunk) => console.log('Output:', chunk)
  });
  
  console.log('\n4. Saving state...');
  await shell.saveState();
  
  console.log('\n5. Checking persistence files...');
  const configDir = path.join(os.homedir(), '.config/gemini-shell');
  const stateFile = path.join(configDir, 'state.json');
  
  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    console.log('State file exists!');
    console.log('Variables in state:', Object.keys(state.variables || {}).filter(k => k.includes('TEST')));
    console.log('TEST_VAR value:', state.variables?.TEST_VAR);
  } else {
    console.log('State file does not exist!');
  }
  
  console.log('\n6. Creating new shell instance to test persistence...');
  const shell2 = new GeminiShell({
    interactiveMode: true,
    enableHistory: true,
    enableAliases: true,
    debugMode: true
  });
  
  await shell2.waitForInitialization();
  
  console.log('\n7. Checking if variable persisted...');
  const result4 = await shell2.execute('echo $TEST_VAR', {
    cwd: process.cwd(),
    onOutput: (chunk) => console.log('Output:', chunk)
  });
  
  console.log('\n8. Getting environment directly...');
  const env = shell2.getEnvironment();
  console.log('TEST_VAR from environment:', env.getVariable('TEST_VAR'));
  console.log('All variables containing TEST:', 
    Array.from(env.variables.entries())
      .filter(([k]) => k.includes('TEST'))
      .map(([k, v]) => `${k}=${v}`)
  );
}

async function testInputHandling() {
  console.log('\n\n=== Testing Input Handling ===\n');
  
  console.log('The paste issue appears to be in ShellWithGeminiStream.tsx');
  console.log('In the useInput handler (line 103-124), it processes bracketed paste sequences');
  console.log('but the logic might be stripping too much or not handling the sequences properly.\n');
  
  console.log('Current behavior:');
  console.log('- Line 107-111: Removes bracketed paste markers');
  console.log('- Line 114-118: If cleaned !== input, it updates the line');
  console.log('- Line 121-123: Filters out standalone escape sequences');
  console.log('\nThe issue might be that only the first character is being processed');
  console.log('before the bracketed paste end marker is received.');
}

// Run tests
testPersistence()
  .then(() => testInputHandling())
  .then(() => {
    console.log('\n=== Tests Complete ===');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });