/**
 * Enhanced Shell interface component for POSIX mode with full Gemini streaming
 * Used when Gemini CLI is invoked as a shell
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Box, Text, useInput, useApp, Static } from 'ink';
import { GeminiShell, Config, GeminiClient } from '@google/gemini-cli-core';
import { Extension } from '../../config/extension.js';
import { Colors } from '../colors.js';
import { CommandRouter } from '../../utils/commandRouter.js';
import { useEnhancedShellProcessor } from '../hooks/useEnhancedShellProcessor.js';
import { useGeminiStream } from '../hooks/useGeminiStream.js';
import { useHistory } from '../hooks/useHistoryManager.js';
import { HistoryItem, HistoryItemWithoutId } from '../types.js';
import { HistoryItemDisplay } from './HistoryItemDisplay.js';
import { SimpleLoadingIndicator } from './SimpleLoadingIndicator.js';
import Spinner from 'ink-spinner';
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
  // Remove isExecuting state - we'll use streaming state instead
  const [showWelcome, setShowWelcome] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);
  
  // History management
  const { history, addItem } = useHistory();
  const [pendingHistoryItem, setPendingHistoryItem] = useState<HistoryItemWithoutId | null>(null);
  
  // Use the real Gemini streaming system, not headless mode
  const getPreferredEditor = useCallback(() => {
    // Simple fallback for shell mode
    return 'vim' as const;
  }, []);

  const onAuthError = useCallback(() => {
    console.error('Authentication error in shell mode');
  }, []);

  const {
    streamingState,
    submitQuery,
    initError,
    pendingHistoryItems: pendingGeminiHistoryItems,
  } = useGeminiStream(
    geminiClient,
    history,
    addItem,
    () => {}, // setShowHelp
    config,
    () => {}, // setDebugMessage
    async () => false, // handleSlashCommand
    false, // shellModeActive - don't use shell mode for streaming
    getPreferredEditor,
    onAuthError,
    async () => {}, // performMemoryRefresh
    'shell' // invocationMode
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

    // Route the command: shell commands vs AI queries
    const router = new CommandRouter();
    const routeResult = router.route(command);
    
    if (routeResult.type === 'gemini') {
      // Use real Gemini streaming for AI queries
      submitQuery(routeResult.query || command);
    } else {
      // Handle shell commands normally (without streaming issues)
      // For now, just add them to history - we can enhance this later
      addItem({
        type: 'info',
        text: `Shell command: ${command}\n(Shell execution will be implemented)`
      }, Date.now());
    }
    
    // Handle exit commands
    if (command === 'exit' || command.startsWith('exit ')) {
      const exitCode = command.startsWith('exit ') ? 
        parseInt(command.split(' ')[1]) || 0 : 0;
      handleExit(exitCode);
    }
  }, [currentLine, showWelcome, submitQuery, addItem]);

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

  // Use the history from the enhanced processor - avoid re-renders during streaming
  const displayItems = useMemo(() => {
    const allItems = [...history];
    // Don't add pendingHistoryItem to avoid re-renders during streaming
    return allItems;
  }, [history]);

  // Use actual streaming state from useGeminiStream
  const isExecuting = streamingState !== StreamingState.Idle;

  return (
    <StreamingContext.Provider value={streamingState}>
      <Box flexDirection="column">
      {/* Welcome Message */}
      {showWelcome && (
        <ShellWelcomeMessage terminalWidth={process.stdout.columns || 80} />
      )}
      
      {/* Output history using Static to prevent re-renders - filter out user messages in shell mode */}
      <Static items={displayItems.filter(item => item.type !== 'user')}>
        {(item, index) => (
          <Box key={item.id} marginBottom={0}>
            <HistoryItemDisplay
              item={item}
              isPending={false}
              config={config}
              terminalWidth={process.stdout.columns || 80}
              isActive={false}
              isFocused={true}
            />
          </Box>
        )}
      </Static>

      {/* Show only the latest pending item to avoid duplication */}
      {pendingGeminiHistoryItems.length > 0 && (
        <Box marginBottom={0}>
          <HistoryItemDisplay
            item={{
              id: 0, // Use stable ID to prevent re-renders
              ...pendingGeminiHistoryItems[pendingGeminiHistoryItems.length - 1]
            }}
            isPending={true}
            config={config}
            terminalWidth={process.stdout.columns || 80}
            isActive={isExecuting}
            isFocused={true}
          />
        </Box>
      )}


      {/* Enhanced processor handles tool display through history */}

      {/* Current prompt - spinner integrated into single Text component */}
      <Box>
        {isExecuting ? (
          <Text>
            <Text color={Colors.Gray}>{getPrompt()}{currentLine} </Text>
            <Text color={Colors.AccentPurple}><Spinner type="dots" /></Text>
          </Text>
        ) : (
          <Text color={Colors.Gray}>
            {getPrompt()}{currentLine}
          </Text>
        )}
      </Box>
    </Box>
    </StreamingContext.Provider>
  );
};