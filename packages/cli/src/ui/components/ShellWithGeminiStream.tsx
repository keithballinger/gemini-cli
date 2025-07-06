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
import { HistoryItemWithoutId, MessageType, StreamingState } from '../types.js';
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
  const [cursorPosition, setCursorPosition] = useState(0);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cwd, setCwd] = useState(initialDirectory || process.cwd());
  const [isExecutingShell, setIsExecutingShell] = useState(false);
  const [debugMessage, setDebugMessage] = useState('');
  const [allGeminiCollapsed, setAllGeminiCollapsed] = useState(false);

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
      
      // Load existing history from the shell (with a small delay to ensure it's loaded from disk)
      setTimeout(() => {
        if (shellRef.current) {
          const shellHistory = shellRef.current.getEnvironment().history || [];
          setCommandHistory(shellHistory);
        }
      }, 100);
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
      if (key.meta) {
        // Option + Delete - delete word before cursor
        const beforeCursor = currentLine.slice(0, cursorPosition);
        const words = beforeCursor.split(/\s+/);
        if (words.length > 0 && cursorPosition > 0) {
          // Find the start of the current word
          let newPos = cursorPosition;
          // Skip trailing spaces
          while (newPos > 0 && currentLine[newPos - 1] === ' ') newPos--;
          // Skip word characters
          while (newPos > 0 && currentLine[newPos - 1] !== ' ') newPos--;
          
          setCurrentLine(currentLine.slice(0, newPos) + currentLine.slice(cursorPosition));
          setCursorPosition(newPos);
        }
      } else if (cursorPosition > 0) {
        // Regular delete
        setCurrentLine(prev => prev.slice(0, cursorPosition - 1) + prev.slice(cursorPosition));
        setCursorPosition(prev => prev - 1);
      }
    } else if (key.upArrow) {
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        const historyCommand = commandHistory[commandHistory.length - 1 - newIndex];
        setCurrentLine(historyCommand);
        setCursorPosition(historyCommand.length);
      }
    } else if (key.downArrow) {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const historyCommand = commandHistory[commandHistory.length - 1 - newIndex];
        setCurrentLine(historyCommand);
        setCursorPosition(historyCommand.length);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentLine('');
        setCursorPosition(0);
      }
    } else if (key.leftArrow) {
      if (key.meta) {
        // Option + Left Arrow - move to previous word
        const beforeCursor = currentLine.slice(0, cursorPosition);
        const words = beforeCursor.split(/\s+/);
        if (words.length > 1) {
          words.pop(); // Remove last word
          const newPos = words.join(' ').length;
          setCursorPosition(newPos > 0 ? newPos + 1 : 0);
        } else {
          setCursorPosition(0);
        }
      } else {
        // Regular left arrow
        setCursorPosition(prev => Math.max(0, prev - 1));
      }
    } else if (key.rightArrow) {
      if (key.meta) {
        // Option + Right Arrow - move to next word
        const remainingLine = currentLine.slice(cursorPosition);
        const wordMatch = remainingLine.match(/^\s*\S+/);
        if (wordMatch) {
          setCursorPosition(cursorPosition + wordMatch[0].length);
        } else {
          setCursorPosition(currentLine.length);
        }
      } else {
        // Regular right arrow
        setCursorPosition(prev => Math.min(currentLine.length, prev + 1));
      }
    } else if (key.ctrl && input === 'a') {
      // Ctrl+A - move to beginning of line
      setCursorPosition(0);
    } else if (key.ctrl && input === 'e') {
      // Ctrl+E - move to end of line
      setCursorPosition(currentLine.length);
    } else if (key.ctrl && input === 'u') {
      // Ctrl+U - delete from cursor to beginning of line
      setCurrentLine(prev => prev.slice(cursorPosition));
      setCursorPosition(0);
    } else if (key.ctrl && input === 'k') {
      // Ctrl+K - delete from cursor to end of line
      setCurrentLine(prev => prev.slice(0, cursorPosition));
    } else if (key.ctrl && input === 'w') {
      // Ctrl+W - delete word before cursor (this works reliably)
      const beforeCursor = currentLine.slice(0, cursorPosition);
      const words = beforeCursor.split(/\s+/);
      if (words.length > 1) {
        const newBeforeCursor = words.slice(0, -1).join(' ');
        const newPos = newBeforeCursor.length > 0 ? newBeforeCursor.length + 1 : 0;
        setCurrentLine(newBeforeCursor + (newBeforeCursor.length > 0 ? ' ' : '') + currentLine.slice(cursorPosition));
        setCursorPosition(newPos);
      } else {
        setCurrentLine(currentLine.slice(cursorPosition));
        setCursorPosition(0);
      }
    } else if (key.ctrl && input === 'f') {
      // Ctrl+F - move forward one word (alternative to Option+Right)
      const remainingLine = currentLine.slice(cursorPosition);
      const match = remainingLine.match(/\S+/);
      if (match) {
        const wordEnd = cursorPosition + match.index! + match[0].length;
        setCursorPosition(Math.min(currentLine.length, wordEnd));
      } else {
        setCursorPosition(currentLine.length);
      }
    } else if (key.ctrl && input === 'b') {
      // Ctrl+B - move backward one word (alternative to Option+Left)
      const words = currentLine.slice(0, cursorPosition).split(/\s+/);
      if (words.length > 1) {
        const newPos = currentLine.lastIndexOf(words[words.length - 2], cursorPosition - 1);
        setCursorPosition(Math.max(0, newPos));
      } else {
        setCursorPosition(0);
      }
    } else if (key.ctrl && input === 'c') {
      setCurrentLine('');
      setCursorPosition(0);
    } else if (key.ctrl && input === 'd') {
      if (currentLine === '') {
        handleExit(0);
      }
    } else if (key.ctrl && input === 'l') {
      // Clear screen
      process.stdout.write(ansiEscapes.clearTerminal);
      clearItems();
    } else if (key.ctrl && input === 'o') {
      // Toggle all Gemini responses
      setAllGeminiCollapsed(prev => !prev);
    } else if (key.meta && input === 'b') {
      // Option+b (ESC+b) - move backward one word
      if (cursorPosition > 0) {
        let newPos = cursorPosition - 1;
        // Skip any spaces
        while (newPos > 0 && currentLine[newPos] === ' ') {
          newPos--;
        }
        // Skip the word
        while (newPos > 0 && currentLine[newPos - 1] !== ' ') {
          newPos--;
        }
        setCursorPosition(newPos);
      }
    } else if (key.meta && input === 'f') {
      // Option+f (ESC+f) - move forward one word
      if (cursorPosition < currentLine.length) {
        let newPos = cursorPosition;
        // Skip current word
        while (newPos < currentLine.length && currentLine[newPos] !== ' ') {
          newPos++;
        }
        // Skip spaces
        while (newPos < currentLine.length && currentLine[newPos] === ' ') {
          newPos++;
        }
        setCursorPosition(newPos);
      }
    } else if (input && !key.ctrl && !key.meta) {
      // Insert character at cursor position
      setCurrentLine(prev => prev.slice(0, cursorPosition) + input + prev.slice(cursorPosition));
      setCursorPosition(prev => prev + 1);
    }
  });

  const handleExecute = useCallback(async () => {
    const command = currentLine.trim();
    if (!command) return;

    setCurrentLine('');
    setCursorPosition(0);
    setHistoryIndex(-1);
    
    // Add to shell's persistent history
    if (shellRef.current) {
      shellRef.current.getEnvironment().addToHistory(command);
      // Update local history state to match
      setCommandHistory(shellRef.current.getEnvironment().history.slice());
    } else {
      // Fallback to local history
      setCommandHistory(prev => [...prev, command]);
    }

    try {
      const route = await commandRouterRef.current!.route(command);

      if (route.type === 'gemini') {
        // Use the Gemini stream infrastructure
        submitQuery(route.query || command);
      } else {
        // Execute shell command
        setIsExecutingShell(true);
        
        // Add shell command as a user_shell type so it's visible in history but not confused with Gemini queries
        const shellHistoryItem: HistoryItemWithoutId = { type: 'user_shell', text: command, cwd };
        addItem(shellHistoryItem, Date.now());

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
                config={config}
                isFocused={true}
                isCollapsed={allGeminiCollapsed}
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
            <Text>
              {currentLine.slice(0, cursorPosition)}
              <Text backgroundColor="white" color="black">
                {cursorPosition < currentLine.length ? currentLine[cursorPosition] : ' '}
              </Text>
              {currentLine.slice(cursorPosition + 1)}
            </Text>
          </Box>
        )}
      </Box>
    </StreamingContext.Provider>
  );
};