#!/usr/bin/env node

/**
 * Test script to demonstrate the POSIX shell functionality
 */

import { GeminiShell } from './packages/core/dist/shell/index.js';
import { InvocationDetector } from './packages/cli/dist/utils/invocationDetector.js';
import readline from 'readline';

console.log('🚀 Gemini Shell Test Mode\n');

// Check invocation mode
const invocation = InvocationDetector.detect({ shell: true });
console.log(`Invocation mode: ${invocation.mode}`);
console.log(`Detection method: ${invocation.detectionMethod}\n`);

// Create shell instance
const shell = new GeminiShell({
  interactiveMode: true,
  enableHistory: true,
  enableAliases: true,
  enableJobControl: true,
  enableGlobbing: true
});

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '✦ ',
  historySize: 100
});

console.log('Welcome to Gemini POSIX Shell!');
console.log('Type "help" for available commands, or "exit" to quit.\n');

// Helper to show built-in commands
const showHelp = () => {
  console.log('\nBuilt-in Commands:');
  const builtins = shell.getBuiltins();
  builtins.forEach(cmd => console.log(`  ${cmd}`));
  console.log('\nSpecial Features:');
  console.log('  - Persistent working directory (cd works!)');
  console.log('  - Command history (use up/down arrows)');
  console.log('  - Variable expansion ($VAR, ${VAR})');
  console.log('  - Pipelines (cmd1 | cmd2)');
  console.log('  - I/O redirection (>, >>, <, 2>)');
  console.log('  - Background jobs (cmd &)');
  console.log('\nAI Integration:');
  console.log('  g <query>  - Ask Gemini AI');
  console.log('  _ <query>  - Ask Gemini AI (alt)');
  console.log('  ?          - Natural language questions\n');
};

// Command execution
const executeCommand = async (command) => {
  if (command.trim() === 'help') {
    showHelp();
    return;
  }

  try {
    const result = await shell.execute(command, {
      cwd: process.cwd(),
      onOutput: (chunk) => {
        process.stdout.write(chunk);
      },
      onDebug: (msg) => {
        if (process.env.DEBUG) {
          console.error(`[DEBUG] ${msg}`);
        }
      },
      captureWorkingDirectory: true
    });

    if (result.error) {
      console.error(`Error: ${result.error.message}`);
    }

    if (result.finalWorkingDirectory && result.finalWorkingDirectory !== process.cwd()) {
      process.chdir(result.finalWorkingDirectory);
      console.log(`[Working directory changed to: ${result.finalWorkingDirectory}]`);
    }

    if (command.trim() === 'exit' || command.trim().startsWith('exit ')) {
      console.log('\nGoodbye!');
      await shell.saveState();
      process.exit(result.exitCode);
    }

  } catch (error) {
    console.error(`Shell error: ${error.message}`);
  }
};

// Handle line input
rl.on('line', async (line) => {
  await executeCommand(line);
  rl.prompt();
});

// Handle Ctrl+C
rl.on('SIGINT', () => {
  console.log('\nUse "exit" to quit.');
  rl.prompt();
});

// Start the prompt
rl.prompt();