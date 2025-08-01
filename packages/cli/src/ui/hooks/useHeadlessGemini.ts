/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useRef } from 'react';
import { useStateAndRef } from './useStateAndRef.js';
import { findLastSafeSplitPoint } from '../utils/markdownUtilities.js';
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
  const [pendingHistoryItemRef, setPendingHistoryItemState] = useStateAndRef<HistoryItemWithoutId | null>(null);

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
          
          // Don't show loading message to avoid render loops
          // The loading indicator in the prompt is sufficient

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
          
          // Initialize streaming pending item - only use the ref version
          setPendingHistoryItemState({
            type: 'info',
            text: ''
          });

          // Override stdout/stderr to capture output with smart splitting like main CLI
          let lastUpdateLength = 0;
          const MIN_UPDATE_INTERVAL = 100; // Minimum chars between updates
          
          process.stdout.write = function(chunk: any) {
            if (typeof chunk === 'string') {
              output += chunk;
              
              // Only update if we have enough new content (throttling like main CLI)
              if (output.length - lastUpdateLength >= MIN_UPDATE_INTERVAL) {
                const trimmedOutput = output.trim();
                const splitPoint = findLastSafeSplitPoint(trimmedOutput);
                
                if (splitPoint === trimmedOutput.length) {
                  // Safe to update entire content
                  setPendingHistoryItemState({
                    type: 'info',
                    text: trimmedOutput
                  });
                  lastUpdateLength = output.length;
                } else if (splitPoint > 0 && pendingHistoryItemRef.current) {
                  // Split content: add completed part to history, keep rest pending
                  const completedText = trimmedOutput.substring(0, splitPoint);
                  const remainingText = trimmedOutput.substring(splitPoint);
                  
                  addItemToHistory(
                    { type: 'info', text: completedText },
                    Date.now()
                  );
                  
                  setPendingHistoryItemState({
                    type: 'info',
                    text: remainingText
                  });
                  lastUpdateLength = output.length;
                }
              }
            }
            return true;
          } as any;

          process.stderr.write = function(chunk: any) {
            if (typeof chunk === 'string') {
              output += chunk;
              // Same throttling for stderr
              if (output.length - lastUpdateLength >= MIN_UPDATE_INTERVAL) {
                setPendingHistoryItemState({
                  type: 'info',
                  text: output.trim()
                });
                lastUpdateLength = output.length;
              }
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
            
            // Finalize the streaming - add to history if we have content
            if (pendingHistoryItemRef.current) {
              addItemToHistory(pendingHistoryItemRef.current, Date.now());
            } else if (output.trim()) {
              addItemToHistory(
                { type: 'info', text: output.trim() },
                Date.now(),
              );
            } else {
              // If no output captured, check if this is an auth issue
              addItemToHistory(
                { type: 'info', text: 'No response from Gemini. Please check:\n1. You are authenticated (run "gemini auth" if needed)\n2. You have network connectivity\n3. Your API key or authentication is valid' },
                Date.now(),
              );
            }
            
            // Clear pending items
            setPendingHistoryItemState(null);
            setPendingHistoryItem(null);

          } finally {
            // Restore original stdout/stderr
            process.stdout.write = originalWrite;
            process.stderr.write = originalError;
          }

        } catch (err) {
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
          // Clear pending items
          setPendingHistoryItemState(null);
          setPendingHistoryItem(null);
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