/**
 * Enhanced Shell interface component for POSIX mode with full Gemini streaming
 * Used when Gemini CLI is invoked as a shell
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { GeminiShell, Config, GeminiClient } from '@google/gemini-cli-core';
import { Extension } from '../../config/extension.js';
import { Colors } from '../colors.js';
import { CommandRouter } from '../../utils/commandRouter.js';
import { useEnhancedShellProcessor } from '../hooks/useEnhancedShellProcessor.js';
import { useHistory } from '../hooks/useHistoryManager.js';
import { HistoryItem, HistoryItemWithoutId } from '../types.js';
import { HistoryItemDisplay } from './HistoryItemDisplay.js';
import { SimpleLoadingIndicator } from './SimpleLoadingIndicator.js';
import { ShellWelcomeMessage } from './ShellWelcomeMessage.js';
import ansiEscapes from 'ansi-escapes';
import { StreamingContext } from '../contexts/StreamingContext.js';
import { StreamingState } from '../types.js';

interface ShellInterfaceV2Props {
  initialDirectory?: string;
  onExit?: (code: number) => void;
  config: Config;
  geminiClient: GeminiClient;
  extensions?: Extension[];
}

// Enhanced shell interface using headless mode integration

export const ShellInterfaceV2: React.FC<ShellInterfaceV2Props> = ({
  initialDirectory,
  onExit,
  config,
  geminiClient,
  extensions = []
}) => {
  const { exit } = useApp();
  const [currentLine, setCurrentLine] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cwd, setCwd] = useState(initialDirectory || process.cwd());
  const [isExecuting, setIsExecuting] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);
  
  // History management
  const { history, addItem } = useHistory();
  const [pendingHistoryItem, setPendingHistoryItem] = useState<HistoryItemWithoutId | null>(null);
  
  // Enhanced shell processor with headless Gemini integration
  const { processCommand } = useEnhancedShellProcessor(
    addItem,
    setPendingHistoryItem,
    (execPromise) => {
      setIsExecuting(true);
      execPromise.finally(() => setIsExecuting(false));
    },
    (message) => {
      console.error(`[DEBUG] ${message}`); // Use console.error to ensure it's visible
    }, // Debug messages
    config,
    geminiClient,
    extensions,
    true // Use POSIX shell
  );

  // Simple tool handling - the enhanced processor manages tool execution

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Enhanced processor handles all streaming and tool execution

  // Handle input
  useInput((input, key) => {
    if (isExecuting) {
      if (key.escape) {
        // Cancel current operation
        abortControllerRef.current?.abort();
        return;
      }
      return;
    }

    if (key.return) {
      handleExecute();
    } else if (key.backspace || key.delete) {
      setCurrentLine(prev => prev.slice(0, -1));
    } else if (key.upArrow) {
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentLine(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (key.downArrow) {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentLine(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentLine('');
      }
    } else if (key.ctrl && input === 'c') {
      setCurrentLine('');
    } else if (key.ctrl && input === 'd') {
      if (currentLine === '') {
        handleExit(0);
      }
    } else if (key.ctrl && input === 'l') {
      // Disabled screen clearing in shell mode
      // process.stdout.write(ansiEscapes.clearTerminal);
      setShowWelcome(false);
    } else if (input && !key.ctrl && !key.meta) {
      setCurrentLine(prev => prev + input);
    }
  });

  const handleExecute = useCallback(async () => {
    const command = currentLine.trim();
    if (!command) return;

    // Hide welcome message once user starts using the shell
    if (showWelcome) {
      setShowWelcome(false);
    }

    setCurrentLine('');
    setHistoryIndex(-1);
    setCommandHistory(prev => [...prev, command]);

    // Use the enhanced shell processor with headless mode integration
    abortControllerRef.current = new AbortController();
    processCommand(command, abortControllerRef.current.signal);
    
    // Handle exit commands
    if (command === 'exit' || command.startsWith('exit ')) {
      const exitCode = command.startsWith('exit ') ? 
        parseInt(command.split(' ')[1]) || 0 : 0;
      handleExit(exitCode);
    }
  }, [currentLine, processCommand, showWelcome]);

  const handleExit = useCallback((code: number) => {
    if (onExit) {
      onExit(code);
    } else {
      exit();
    }
  }, [onExit, exit]);

  const getPrompt = () => {
    const home = process.env.HOME || '';
    const displayPath = cwd.startsWith(home) ? '~' + cwd.slice(home.length) : cwd;
    return `${displayPath} ✦ `;
  };

  // Use the history from the enhanced processor
  const displayItems = useMemo(() => {
    const allItems = [...history];
    if (pendingHistoryItem) {
      allItems.push({
        id: Date.now(),
        ...pendingHistoryItem
      });
    }
    return allItems;
  }, [history, pendingHistoryItem]);

  // Determine streaming state for context  
  const streamingState = isExecuting ? StreamingState.Responding : StreamingState.Idle;

  return (
    <StreamingContext.Provider value={streamingState}>
      <Box flexDirection="column">
      {/* Welcome Message */}
      {showWelcome && (
        <ShellWelcomeMessage terminalWidth={process.stdout.columns || 80} />
      )}
      
      {/* Output history - filter out user messages in shell mode */}
      {displayItems
        .filter(item => item.type !== 'user') // Don't show user query boxes in shell mode
        .map((item, index) => (
          <Box key={`${item.id}-${index}`} marginBottom={0}>
            <HistoryItemDisplay
              item={item}
              isPending={false}
              config={config}
              terminalWidth={process.stdout.columns || 80}
              isActive={index === displayItems.length - 1 && isExecuting}
              isFocused={true}
            />
          </Box>
        ))}


      {/* Enhanced processor handles tool display through history */}

      {/* Current prompt */}
      <Box>
        <Text color={Colors.Gray}>{getPrompt()}</Text>
        <Text>{currentLine}</Text>
        {isExecuting && (
          <Box marginLeft={1}>
            <SimpleLoadingIndicator />
          </Box>
        )}
      </Box>
    </Box>
    </StreamingContext.Provider>
  );
};