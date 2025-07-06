/**
 * Hook to integrate the new POSIX shell with the Gemini CLI
 */

import { useCallback, useRef, useEffect } from 'react';
import { Config, GeminiClient } from '@google/gemini-cli-core';
import { GeminiShell } from '@google/gemini-cli-core';
import type { HistoryItemWithoutId } from '../types.js';
import { UseHistoryManagerReturn } from './useHistoryManager.js';
import { formatMemoryUsage } from '../utils/formatters.js';
import { isBinary } from '../utils/textUtils.js';
import type { PartListUnion } from '@google/genai';

const OUTPUT_UPDATE_INTERVAL_MS = 1000;
const MAX_OUTPUT_LENGTH = 10000;

/**
 * Hook to process shell commands using the new POSIX shell
 */
export const useGeminiShell = (
  addItemToHistory: UseHistoryManagerReturn['addItem'],
  setPendingHistoryItem: React.Dispatch<
    React.SetStateAction<HistoryItemWithoutId | null>
  >,
  onExec: (command: Promise<void>) => void,
  onDebugMessage: (message: string) => void,
  config: Config,
  geminiClient: GeminiClient,
) => {
  // Create a persistent shell instance
  const shellRef = useRef<GeminiShell | null>(null);

  // Initialize shell on first use
  useEffect(() => {
    if (!shellRef.current) {
      shellRef.current = new GeminiShell({
        interactiveMode: true,
        enableHistory: true,
        enableAliases: true,
        enableJobControl: true,
        historySize: 1000
      });
    }

    // Save state on unmount
    return () => {
      shellRef.current?.saveState();
    };
  }, []);

  const handleShellCommand = useCallback(
    (rawQuery: PartListUnion, abortSignal: AbortSignal): boolean => {
      if (typeof rawQuery !== 'string' || rawQuery.trim() === '') {
        return false;
      }

      const shell = shellRef.current;
      if (!shell) {
        return false;
      }

      const userMessageTimestamp = Date.now();
      addItemToHistory(
        { type: 'user_shell', text: rawQuery },
        userMessageTimestamp,
      );

      const targetDir = config.getTargetDir();
      let lastUpdateTime = 0;
      let outputBuffer = '';

      const execPromise = new Promise<void>(async (resolve) => {
        try {
          onDebugMessage(`Executing in ${targetDir}: ${rawQuery}`);

          let currentOutputBuffer = '';
          const result = await shell.execute(rawQuery, {
            cwd: targetDir,
            abortSignal,
            onOutput: (chunk: string) => {
              currentOutputBuffer += chunk;
              outputBuffer = currentOutputBuffer;
              
              // Throttle pending UI updates
              if (Date.now() - lastUpdateTime > OUTPUT_UPDATE_INTERVAL_MS) {
                setPendingHistoryItem({ type: 'info', text: outputBuffer });
                lastUpdateTime = Date.now();
              }
            },
            onDebug: onDebugMessage,
            captureWorkingDirectory: true
          });

          // Clear pending item
          setPendingHistoryItem(null);

          let historyItemType: HistoryItemWithoutId['type'] = 'info';
          let mainContent: string;

          // Check if output is binary
          const outputBinaryCheck = Buffer.from(result.stdout + result.stderr);
          if (isBinary(outputBinaryCheck)) {
            mainContent = '[Command produced binary output, which is not shown.]';
          } else {
            const output = result.stdout + (result.stderr ? '\n' + result.stderr : '');
            mainContent = output.trim() || '(Command produced no output)';
          }

          let finalOutput = mainContent;

          if (result.error) {
            historyItemType = 'error';
            finalOutput = `${result.error.message}\n${finalOutput}`;
          } else if (result.aborted) {
            finalOutput = `Command was cancelled.\n${finalOutput}`;
          } else if (result.signal) {
            historyItemType = 'error';
            finalOutput = `Command terminated by signal: ${result.signal}.\n${finalOutput}`;
          } else if (result.exitCode !== 0) {
            historyItemType = 'error';
            finalOutput = `Command exited with code ${result.exitCode}.\n${finalOutput}`;
          }

          // Check for directory change
          if (result.finalWorkingDirectory && result.finalWorkingDirectory !== targetDir) {
            // In shell mode, we maintain the directory within the shell instance
            const notice = `[Working directory changed to: ${result.finalWorkingDirectory}]`;
            finalOutput = `${notice}\n\n${finalOutput}`;
          }

          // Add to UI history
          addItemToHistory(
            { type: historyItemType, text: finalOutput },
            userMessageTimestamp,
          );

          // Add to LLM history
          addShellCommandToGeminiHistory(geminiClient, rawQuery, finalOutput);

          // Save shell state after each command
          await shell.saveState();

        } catch (err) {
          setPendingHistoryItem(null);
          const errorMessage = err instanceof Error ? err.message : String(err);
          addItemToHistory(
            {
              type: 'error',
              text: `An unexpected error occurred: ${errorMessage}`,
            },
            userMessageTimestamp,
          );
        } finally {
          resolve();
        }
      });

      onExec(execPromise);
      return true;
    },
    [
      config,
      onDebugMessage,
      addItemToHistory,
      setPendingHistoryItem,
      onExec,
      geminiClient,
    ],
  );

  return { handleShellCommand };
};

function addShellCommandToGeminiHistory(
  geminiClient: GeminiClient,
  rawQuery: string,
  resultText: string,
) {
  const modelContent =
    resultText.length > MAX_OUTPUT_LENGTH
      ? resultText.substring(0, MAX_OUTPUT_LENGTH) + '\n... (truncated)'
      : resultText;

  geminiClient.addHistory({
    role: 'user',
    parts: [
      {
        text: `I ran the following shell command:
\`\`\`sh
${rawQuery}
\`\`\`

This produced the following result:
\`\`\`
${modelContent}
\`\`\``,
      },
    ],
  });
}