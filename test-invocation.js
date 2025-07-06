#!/usr/bin/env node

// Test script to verify InvocationDetector functionality
import { InvocationDetector } from './packages/cli/dist/utils/invocationDetector.js';

console.log('Testing InvocationDetector...');
console.log('Process info:');
console.log('  argv[0]:', process.argv[0]);
console.log('  argv[1]:', process.argv[1]);
console.log('  SHELL env:', process.env.SHELL);
console.log('  ppid:', process.ppid);

// Test with --shell flag
console.log('\nTest 1: --shell flag');
let result = InvocationDetector.detect({ shell: true });
console.log('  Mode:', result.mode);
console.log('  Method:', result.detectionMethod);

// Test without flag
console.log('\nTest 2: No flags');
result = InvocationDetector.detect({ shell: false });
console.log('  Mode:', result.mode);
console.log('  Method:', result.detectionMethod);
console.log('  Description:', InvocationDetector.getModeDescription(result));

// Test with GEMINI_SHELL_MODE env
console.log('\nTest 3: With GEMINI_SHELL_MODE env');
process.env.GEMINI_SHELL_MODE = 'true';
result = InvocationDetector.detect({ shell: false });
console.log('  Mode:', result.mode);
console.log('  Method:', result.detectionMethod);