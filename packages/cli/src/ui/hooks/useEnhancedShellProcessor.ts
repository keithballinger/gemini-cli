/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useRef, useEffect } from 'react';
import { Config, GeminiClient } from '@google/gemini-cli-core';
import { Extension } from '../../config/extension.js';
import { useShellCommandProcessor } from './shellCommandProcessor.js';
import { useHeadlessGemini } from './useHeadlessGemini.js';
import type { HistoryItemWithoutId } from '../types.js';
import { UseHistoryManagerReturn } from './useHistoryManager.js';
import type { PartListUnion } from '@google/genai';
import { CommandRouter } from '../../utils/commandRouter.js';

/**
 * Enhanced shell processor that combines shell command execution with 
 * headless Gemini integration for AI queries
 */
export const useEnhancedShellProcessor = (
  addItemToHistory: UseHistoryManagerReturn['addItem'],
  setPendingHistoryItem: React.Dispatch<
    React.SetStateAction<HistoryItemWithoutId | null>
  >,
  onExec: (command: Promise<void>) => void,
  onDebugMessage: (message: string) => void,
  config: Config,
  geminiClient: GeminiClient,
  extensions: Extension[],
  usePosixShell: boolean = false,
) => {
  const commandRouterRef = useRef<CommandRouter | null>(null);

  // Initialize command router
  useEffect(() => {
    if (!commandRouterRef.current) {
      commandRouterRef.current = new CommandRouter();
    }
  }, []);

  // Initialize the shell command processor for shell commands
  const { handleShellCommand } = useShellCommandProcessor(
    addItemToHistory,
    setPendingHistoryItem,
    onExec,
    onDebugMessage,
    config,
    geminiClient,
    usePosixShell
  );

  // Initialize the headless Gemini processor for AI queries
  const { executeHeadlessGemini } = useHeadlessGemini(
    addItemToHistory,
    setPendingHistoryItem,
    onExec,
    onDebugMessage,
    config,
    extensions
  );

  const processCommand = useCallback(
    (input: PartListUnion, abortSignal: AbortSignal): boolean => {
      if (typeof input !== 'string' || input.trim() === '') {
        return false;
      }

      const trimmedInput = input.trim();
      const router = commandRouterRef.current;
      
      if (!router) {
        return false;
      }

      try {
        // Route the command using the CommandRouter
        const routeResult = router.route(trimmedInput);
        
        onDebugMessage(`Command routed as: ${routeResult.type} (explicit: ${routeResult.isExplicit})`);

        switch (routeResult.type) {
          case 'shell':
            // Execute as shell command
            return handleShellCommand(trimmedInput, abortSignal);
            
          case 'gemini':
            // Execute as Gemini query using headless mode
            return executeHeadlessGemini(routeResult.query || trimmedInput, abortSignal);
            
          default:
            // Fallback to shell command if routing fails
            onDebugMessage(`Unknown route type: ${routeResult.type}, falling back to shell`);
            return handleShellCommand(trimmedInput, abortSignal);
        }
      } catch (error) {
        onDebugMessage(`Error in command routing: ${error}`);
        // Fallback to shell command on routing error
        return handleShellCommand(trimmedInput, abortSignal);
      }
    },
    [
      handleShellCommand,
      executeHeadlessGemini,
      onDebugMessage,
    ],
  );

  return { 
    processCommand,
    handleShellCommand,
    executeHeadlessGemini 
  };
};