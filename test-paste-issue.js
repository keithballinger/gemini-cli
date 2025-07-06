#!/usr/bin/env node

/**
 * Test the paste issue where only "e" shows until return is pressed
 */

console.log('=== Testing Paste Issue ===\n');

console.log('The issue is in ShellWithGeminiStream.tsx, lines 103-124:');
console.log('');
console.log('Current behavior:');
console.log('1. When text is pasted, Ink\'s useInput receives it character by character');
console.log('2. The code tries to detect and strip bracketed paste sequences');
console.log('3. However, the logic at line 114-118 might be causing issues:');
console.log('   - If cleaned !== input, it sets the entire line to the cleaned value');
console.log('   - This might be happening on every character, causing only the last character to show');
console.log('');
console.log('The fix should be to accumulate the pasted text properly.');
console.log('');
console.log('Problematic code:');
console.log(`
      // If we cleaned something out, use the cleaned version
      if (cleaned !== input && cleaned) {
        setCurrentLine(prev => prev.slice(0, cursorPosition) + cleaned + prev.slice(cursorPosition));
        setCursorPosition(prev => prev + cleaned.length);
        return;
      }
`);
console.log('');
console.log('The issue is that when pasting "hello", each character comes in separately:');
console.log('- First "h" comes with bracketed paste start');
console.log('- Then "e", "l", "l", "o" come individually');
console.log('- Finally bracketed paste end comes');
console.log('');
console.log('But the current logic replaces the entire line each time, so only the last character "e" is visible.');