# Shell Issues Debug Report and Fixes

## Issue 1: Pasting text shows only "e" until return is pressed

### Root Cause
The issue is in `ShellWithGeminiStream.tsx` lines 103-124. When text is pasted:
1. Ink's `useInput` receives characters one by one, not as a complete paste
2. The bracketed paste detection logic tries to clean the sequences
3. Each character replaces the entire line instead of appending to it

### Current Problematic Code
```typescript
// If we cleaned something out, use the cleaned version
if (cleaned !== input && cleaned) {
  setCurrentLine(prev => prev.slice(0, cursorPosition) + cleaned + prev.slice(cursorPosition));
  setCursorPosition(prev => prev + cleaned.length);
  return;
}
```

### Fix
The component should use the `useKeypress` hook which properly handles bracketed paste mode. The hook already accumulates pasted text and sends it as a single event with `paste: true`.

## Issue 2: Environment variables set with export don't persist between sessions

### Root Cause Analysis
The persistence system is working correctly:
1. Variables ARE being saved to `~/.config/gemini-shell/state.json`
2. Variables ARE being loaded when a new shell starts
3. The issue is a circular reference causing "Maximum call stack size exceeded"

### The Real Issue
Looking at the test output, the echo and export commands are throwing "Maximum call stack size exceeded". This suggests there's a circular reference or infinite recursion when expanding variables.

### Fix for Stack Overflow
The issue appears to be in how the glob expansion returns results. In `executor.ts` line 249:
```typescript
return globExpanded.length > 0 ? globExpanded.join(' ') : varExpanded;
```

This joins glob results with spaces, but `expanded.args` expects an array of strings, not a single string. This might cause issues when the args are processed again.

## Recommended Fixes

### Fix 1: Paste Issue
Replace the current `useInput` in `ShellWithGeminiStream.tsx` with `useKeypress` hook that properly handles bracketed paste:

```typescript
import { useKeypress } from '../hooks/useKeypress.js';

// Replace useInput with:
useKeypress((key) => {
  if (key.paste) {
    // Handle complete paste at once
    setCurrentLine(prev => prev.slice(0, cursorPosition) + key.sequence + prev.slice(cursorPosition));
    setCursorPosition(prev => prev + key.sequence.length);
    return;
  }
  
  // Handle regular keypress...
}, { isActive: streamingState === StreamingState.Idle });
```

### Fix 2: Stack Overflow in Variable Expansion
In `executor.ts`, fix the glob expansion to properly handle arrays:

```typescript
// Line 243-253 should be:
expanded.args = (await Promise.all(
  expanded.args.map(async (arg) => {
    const varExpanded = expandVariables(arg, this.env);
    if (this.options.enableGlobbing) {
      const globExpanded = await expandGlobs(varExpanded, this.env.cwd);
      return globExpanded; // Return array, not joined string
    }
    return [varExpanded]; // Wrap in array for consistency
  })
)).flat(); // Flatten the results
```

### Fix 3: Ensure Proper Shell Cleanup
In `ShellWithGeminiStream.tsx`, ensure state is saved on cleanup:

```typescript
useEffect(() => {
  // ... initialization ...
  
  return () => {
    if (shellRef.current) {
      // Save state synchronously before cleanup
      shellRef.current.saveState().catch(console.error);
    }
  };
}, []);

// Also add cleanup on process exit
useEffect(() => {
  const cleanup = async () => {
    if (shellRef.current) {
      await shellRef.current.saveState();
    }
  };
  
  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  return () => {
    process.removeListener('exit', cleanup);
    process.removeListener('SIGINT', cleanup);
    process.removeListener('SIGTERM', cleanup);
  };
}, []);
```

## Testing

After implementing these fixes:
1. Test pasting multi-line and single-line text
2. Test `export VAR=value` followed by shell restart
3. Test `echo $VAR` to ensure no stack overflow
4. Check ~/.config/gemini-shell/state.json for saved variables