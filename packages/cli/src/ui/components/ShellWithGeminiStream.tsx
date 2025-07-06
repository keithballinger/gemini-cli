/**
 * Shell interface that properly uses the core package's streaming infrastructure
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { GeminiShell, Config } from '@google/gemini-cli-core';
import { Colors } from '../colors.js';
import { CommandRouter } from '../../utils/commandRouter.js';
import { useGeminiStream } from '../hooks/useGeminiStream.js';
import { useHistory } from '../hooks/useHistoryManager.js';
import { HistoryItemDisplay } from './HistoryItemDisplay.js';
import { GeminiShellResponse } from './GeminiShellResponse.js';
import { StreamingContext } from '../contexts/StreamingContext.js';
import { MessageType, StreamingState } from '../types.js';
import ansiEscapes from 'ansi-escapes';
import process from 'node:process';

interface ShellWithGeminiStreamProps {
  initialDirectory?: string;
  onExit?: (code: number) => void;
  config: Config;
}

export const ShellWithGeminiStream: React.FC<ShellWithGeminiStreamProps> = ({
  initialDirectory,
  onExit,
  config
}) => {
  const { exit } = useApp();
  const [currentLine, setCurrentLine] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cwd, setCwd] = useState(initialDirectory || process.cwd());
  const [isExecutingShell, setIsExecutingShell] = useState(false);
  const [debugMessage, setDebugMessage] = useState('');

  const shellRef = useRef<GeminiShell | null>(null);
  const commandRouterRef = useRef<CommandRouter | null>(null);

  // Use the history manager
  const { history, addItem, clearItems } = useHistory();

  // Use the Gemini stream hook - this handles all the complexity
  const {
    streamingState,
    submitQuery,
    initError,
    pendingHistoryItems,
    thought
  } = useGeminiStream(
    config.getGeminiClient(),
    history,
    addItem,
    () => {}, // setShowHelp
    config,
    setDebugMessage,
    async () => false, // handleSlashCommand - we'll handle our own commands
    false, // shellModeActive - we handle shell commands differently
    () => undefined, // getPreferredEditor
    () => {}, // onAuthError
    async () => {}, // performMemoryRefresh
    'shell' // invocationMode
  );

  // Initialize shell
  useEffect(() => {
    if (!shellRef.current) {
      shellRef.current = new GeminiShell({
        interactiveMode: true,
        enableHistory: true,
        enableAliases: true,
        enableJobControl: true,
        enableGlobbing: true
      });
    }

    if (!commandRouterRef.current) {
      commandRouterRef.current = new CommandRouter();
    }

    return () => {
      if (shellRef.current) {
        shellRef.current.saveState();
      }
    };
  }, []);

  // Handle input
  useInput((input, key) => {
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
      // Clear screen
      process.stdout.write(ansiEscapes.clearTerminal);
      clearItems();
    } else if (input && !key.ctrl && !key.meta) {
      setCurrentLine(prev => prev + input);
    }
  });

  const handleExecute = useCallback(async () => {
    const command = currentLine.trim();
    if (!command) return;

    setCurrentLine('');
    setHistoryIndex(-1);
    setCommandHistory(prev => [...prev, command]);

    try {
      const route = await commandRouterRef.current!.route(command);

      if (route.type === 'gemini') {
        // Use the Gemini stream infrastructure
        submitQuery(route.query || command);
      } else {
        // Execute shell command
        setIsExecutingShell(true);
        
        // Add shell command as a user_shell type so it's visible in history but not confused with Gemini queries
        addItem({ type: 'user_shell' as const, text: command }, Date.now());

        // Collect output to add to Gemini history
        let shellOutput = '';

        const result = await shellRef.current!.execute(command, {
          cwd,
          onOutput: (chunk) => {
            // For shell output, we'll add it as info messages
            if (chunk.trim()) {
              shellOutput += chunk;
              addItem({ type: MessageType.INFO, text: chunk }, Date.now());
            }
          },
          captureWorkingDirectory: true
        });

        if (result.finalWorkingDirectory && result.finalWorkingDirectory !== cwd) {
          setCwd(result.finalWorkingDirectory);
        }

        if (result.error) {
          addItem({ type: MessageType.ERROR, text: result.error.message }, Date.now());
        } else if (shellOutput) {
          // Add shell command and output to Gemini's history for context
          const geminiClient = config.getGeminiClient();
          if (geminiClient) {
            geminiClient.addHistory({
              role: 'user',
              parts: [{
                text: `I ran the following shell command:\n\`\`\`sh\n${command}\n\`\`\`\n\nThis produced the following result:\n\`\`\`\n${shellOutput}\n\`\`\``
              }]
            });
          }
        }

        if (command === 'exit' || command.startsWith('exit ')) {
          handleExit(result.exitCode);
        }
        
        setIsExecutingShell(false);
      }
    } catch (error) {
      addItem({ 
        type: MessageType.ERROR, 
        text: error instanceof Error ? error.message : String(error) 
      }, Date.now());
      setIsExecutingShell(false);
    }
  }, [currentLine, cwd, submitQuery, addItem]);

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

  // Group items for display
  const displayGroups = React.useMemo(() => {
    const allItemsWithIds = [
      ...history,
      ...pendingHistoryItems.map((item, index) => ({ ...item, id: Date.now() + index }))
    ];

    const groups: Array<{ type: 'shell' | 'gemini'; items: typeof allItemsWithIds }> = [];
    let currentGeminiGroup: typeof allItemsWithIds = [];
    let inGeminiSequence = false;

    allItemsWithIds.forEach((item, index) => {
      const isGeminiQuery = item.type === MessageType.USER; // User queries that trigger Gemini
      const isGeminiResponse = 
        item.type === 'gemini' ||
        item.type === 'gemini_content' ||
        item.type === 'gemini_collapsible' ||
        item.type === 'tool_group' ||
        item.type === MessageType.COMPRESSION;

      if (isGeminiQuery) {
        // Always start a new Gemini group for each query
        if (currentGeminiGroup.length > 0) {
          groups.push({ type: 'gemini', items: currentGeminiGroup });
          currentGeminiGroup = [];
        }
        currentGeminiGroup.push(item);
        inGeminiSequence = true;
      } else if (isGeminiResponse && inGeminiSequence) {
        // Add to current Gemini group if we're in a sequence
        currentGeminiGroup.push(item);
      } else {
        // Non-Gemini item or Gemini response without a query
        if (currentGeminiGroup.length > 0) {
          groups.push({ type: 'gemini', items: currentGeminiGroup });
          currentGeminiGroup = [];
          inGeminiSequence = false;
        }
        
        // Add as shell item
        groups.push({ type: 'shell', items: [item] });
      }
    });

    // Don't forget the last group
    if (currentGeminiGroup.length > 0) {
      groups.push({ type: 'gemini', items: currentGeminiGroup });
    }

    return groups;
  }, [history, pendingHistoryItems]);

  return (
    <StreamingContext.Provider value={streamingState}>
      <Box flexDirection="column">
        {/* Display grouped items */}
        {displayGroups.map((group, groupIndex) => {
          if (group.type === 'gemini') {
            return (
              <GeminiShellResponse
                key={`gemini-${groupIndex}`}
                items={group.items}
                isActive={groupIndex === displayGroups.length - 1 && streamingState !== StreamingState.Idle}
                terminalWidth={process.stdout.columns || 80}
              />
            );
          } else {
            // Shell items
            return group.items.map((item) => (
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
            ));
          }
        })}


        {/* Current prompt - only show when not responding */}
        {streamingState === StreamingState.Idle && (
          <Box>
            <Text color={Colors.Gray}>{getPrompt()}</Text>
            <Text>{currentLine}</Text>
          </Box>
        )}
      </Box>
    </StreamingContext.Provider>
  );
};