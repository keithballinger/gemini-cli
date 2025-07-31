# Analysis and Fix Plan for Test Failures

This document outlines the root cause analysis and the proposed plan to fix the remaining test failures in the `shell` branch for `commandRouter.test.ts` and `invocationDetector.test.ts`.

## 1. `commandRouter.test.ts` Failure

### Analysis

- **Failing Test:** `CommandRouter > Custom prefixes > should allow updating gemini prefixes`
- **Error:** `AssertionError: expected 'gemini' to be 'shell'`
- **Root Cause:** The test correctly updates the Gemini prefixes, removing `g ` as a special prefix. However, when it routes the input `'g this should be shell now'`, the router's logic incorrectly classifies this string as a **natural language query** instead of a shell command. This happens because the `looksLikeNaturalLanguage` heuristic is too aggressive: it identifies any multi-word string that doesn't contain obvious shell syntax (like `|`, `>`, `$`) as a natural language query. The input string fits this description, so it gets routed to Gemini before it can fall back to the default `shell` classification.

### Proposed Plan

The fix is to make the natural language detection less aggressive so it doesn't misclassify valid, albeit simple, shell commands.

1.  **Modify `looksLikeNaturalLanguage` function:** Edit the file `packages/cli/src/utils/commandRouter.ts`.
2.  **Add a New Heuristic:** At the beginning of the `looksLikeNaturalLanguage` function, add a check. If the first word of the input string is only a single character long (e.g., `g`), the function should immediately return `false`. This prevents single-letter commands from being treated as the start of a natural language sentence, allowing them to be correctly classified as shell commands by the default fallback mechanism.

---

## 2. `invocationDetector.test.ts` Failure

### Analysis

- **Failing Test:** `InvocationDetector > parent process detection > should detect Terminal.app as login parent on macOS`
- **Error:** `ReferenceError: jest is not defined` (and subsequently, `AssertionError: expected 'cli' to be 'shell'`).
- **Root Cause:** The test fails for two primary reasons:
    1.  **Incorrect Test Syntax:** The test file uses `jest` functions (`jest.mock`, `jest.clearAllMocks`) within a `vitest` test environment, which causes a reference error.
    2.  **Improper Mocking:** The core issue is that the test fails to correctly mock the `child_process.execSync` function. The code under test calls `require('child_process')` at runtime, which bypasses the test's mock setup. As a result, the real `execSync` is called (or an incomplete mock is used), `getParentProcessName` returns `null`, and the `detect` function incorrectly falls back to `CLI` mode instead of the expected `SHELL` mode.

### Proposed Plan

The fix requires correcting the test setup to use proper `vitest` mocking syntax and ensuring the mock is applied correctly before the function under test is called.

1.  **Convert Test Syntax:** Edit `packages/cli/src/utils/__tests__/invocationDetector.test.ts` and replace all instances of `jest` with the `vitest` equivalent, `vi`. This includes `jest.mock` -> `vi.mock`, `jest.clearAllMocks` -> `vi.clearAllMocks`, and type casts like `(os.platform as jest.Mock)` -> `(os.platform as vi.Mock)`.
2.  **Properly Mock `child_process`:**
    - At the top of the test file, use `vi.mock('child_process', ...)` with a factory function.
    - This factory will return an object: `{ execSync: vi.fn() }`. This ensures that any time `child_process` is imported or required, the test will receive the mocked version.
3.  **Control Mock in Test Case:**
    - In the `should detect Terminal.app as login parent on macOS` test, import `execSync` from `child_process`.
    - Use `(execSync as vi.Mock).mockReturnValue('Terminal\n');` to control the output for this specific test case, ensuring the `detect` function receives the expected value and returns the correct invocation mode.

```