/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useRef } from 'react';
import { Config } from '@google/gemini-cli-core';
import { Extension } from '../../config/extension.js';
import { runNonInteractive } from '../../nonInteractiveCli.js';
import { loadCliConfig } from '../../config/config.js';
import { ApprovalMode, AuthType } from '@google/gemini-cli-core';
import type { HistoryItemWithoutId } from '../types.js';
import { UseHistoryManagerReturn } from './useHistoryManager.js';

const MAX_OUTPUT_LENGTH = Number.MAX_SAFE_INTEGER; // No truncation

/**
 * Bridge to use the main gemini-cli headless mode functionality from the shell app
 */
export const useHeadlessGemini = (
  addItemToHistory: UseHistoryManagerReturn['addItem'],
  setPendingHistoryItem: React.Dispatch<
    React.SetStateAction<HistoryItemWithoutId | null>
  >,
  onExec: (command: Promise<void>) => void,
  onDebugMessage: (message: string) => void,
  config: Config,
  extensions: Extension[],
) => {
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeHeadlessGemini = useCallback(
    (query: string, abortSignal: AbortSignal): boolean => {
      if (!query || query.trim() === '') {
        return false;
      }

      const userMessageTimestamp = Date.now();
      addItemToHistory(
        { type: 'user', text: query },
        userMessageTimestamp,
      );

      const execPromise = new Promise<void>(async (resolve) => {
        try {
          onDebugMessage(`Executing headless Gemini query: ${query}`);
          
          // Don't set pending item here - it causes re-renders
          // setPendingHistoryItem({ type: 'info', text: 'Processing query with Gemini...' });

          // Create a headless-compatible configuration
          const headlessConfig = await createHeadlessConfig(config, extensions);
          
          // Check if Gemini client is available
          try {
            const client = headlessConfig.getGeminiClient();
            if (!client) {
              throw new Error('Gemini client not available');
            }
          } catch (clientError) {
            throw new Error(`Gemini client initialization failed: ${clientError}`);
          }
          
          // Capture output from headless mode
          let output = '';
          const originalWrite = process.stdout.write;
          const originalError = process.stderr.write;
          
          // Override stdout/stderr to capture output
          process.stdout.write = function(chunk: any) {
            if (typeof chunk === 'string') {
              output += chunk;
              // Don't update pending item during streaming to avoid infinite re-renders
              // We'll add the complete output to history at the end
            }
            return true;
          } as any;

          process.stderr.write = function(chunk: any) {
            if (typeof chunk === 'string') {
              output += chunk;
              // Don't update during streaming to avoid re-render issues
            }
            return true;
          } as any;

          try {
            // Debug: Check if the config is valid
            if (!headlessConfig || !headlessConfig.getGeminiClient) {
              throw new Error('Invalid headless config - missing getGeminiClient method');
            }
            
            // Try to get the Gemini client to verify it's available
            const client = headlessConfig.getGeminiClient();
            if (!client) {
              throw new Error('Gemini client is null - authentication may be required');
            }
            
            // Execute using the headless mode
            await runNonInteractive(headlessConfig, query);
            
            const finalOutput = output.trim();
            if (finalOutput) {
              // Never truncate output
              addItemToHistory(
                { type: 'info', text: finalOutput },
                Date.now(),
              );
            } else {
              // If no output captured, check if this is an auth issue
              addItemToHistory(
                { type: 'info', text: 'No response from Gemini. Please check:\n1. You are authenticated (run "gemini auth" if needed)\n2. You have network connectivity\n3. Your API key or authentication is valid' },
                Date.now(),
              );
            }
            
            // Clear pending item after adding to history
            setPendingHistoryItem(null);

          } finally {
            // Restore original stdout/stderr
            process.stdout.write = originalWrite;
            process.stderr.write = originalError;
          }

        } catch (err) {
          setPendingHistoryItem(null);
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error('Headless Gemini error:', err);
          onDebugMessage(`Headless Gemini error: ${errorMessage}`);
          addItemToHistory(
            {
              type: 'error',
              text: `Gemini error: ${errorMessage}`,
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
      extensions,
      onDebugMessage,
      addItemToHistory,
      setPendingHistoryItem,
      onExec,
    ],
  );

  const cancelExecution = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return { 
    executeHeadlessGemini,
    cancelExecution 
  };
};

/**
 * Create a configuration suitable for headless mode execution
 */
async function createHeadlessConfig(
  config: Config, 
  extensions: Extension[]
): Promise<Config> {
  // Return the existing config - it should already have the Gemini client configured
  return config;
}