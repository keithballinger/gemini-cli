#!/usr/bin/env node

/**
 * Test script to verify shell works without bash
 */

import { GeminiShell } from './packages/core/dist/src/shell/shellInterface.js';

async function testNoBash() {
  console.log('Testing shell without bash dependency...\n');
  
  const shell = new GeminiShell({
    interactiveMode: false,
    enableHistory: false,
    debugMode: true
  });
  
  const tests = [
    {
      name: 'Built-in command (echo)',
      command: 'echo "Hello from our shell!"'
    },
    {
      name: 'Built-in command (pwd)',
      command: 'pwd'
    },
    {
      name: 'External command (ls)',
      command: 'ls -la | head -5'
    },
    {
      name: 'Pipeline with grep',
      command: 'ls | grep -i readme'
    },
    {
      name: 'Compound command',
      command: 'echo "Testing" && echo "Success"'
    },
    {
      name: 'Environment variable',
      command: 'echo $HOME'
    }
  ];
  
  for (const test of tests) {
    console.log(`\n=== ${test.name} ===`);
    console.log(`Command: ${test.command}`);
    
    try {
      const result = await shell.execute(test.command, {
        cwd: process.cwd(),
        onOutput: (chunk) => process.stdout.write(chunk),
        onDebug: (msg) => console.log(`[DEBUG] ${msg}`)
      });
      
      console.log(`Exit code: ${result.exitCode}`);
      if (result.error) {
        console.log(`Error: ${result.error.message}`);
      }
    } catch (error) {
      console.error(`Failed: ${error.message}`);
    }
  }
  
  console.log('\n✅ All tests completed without using bash!');
}

testNoBash().catch(console.error);