/**
 * Shell interface component for POSIX mode
 * Used when Gemini CLI is invoked as a shell
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { GeminiShell } from '@google/gemini-cli-core';
import { Colors } from '../colors.js';
import { CommandRouter } from '../../utils/commandRouter.js';
import { CollapsibleGeminiResponse } from './messages/CollapsibleGeminiResponse.js';

interface ShellInterfaceProps {
  initialDirectory?: string;
  onExit?: (code: number) => void;
}

export const ShellInterface: React.FC<ShellInterfaceProps> = ({
  initialDirectory,
  onExit
}) => {
  const { exit } = useApp();
  const [currentLine, setCurrentLine] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [output, setOutput] = useState<Array<{ id: string; type: 'command' | 'output' | 'error' | 'gemini'; content: string; collapsed?: boolean }>>([]);
  const [cwd, setCwd] = useState(initialDirectory || process.cwd());
  const [isExecuting, setIsExecuting] = useState(false);

  const shellRef = useRef<GeminiShell | null>(null);
  const commandRouterRef = useRef<CommandRouter | null>(null);
  const outputIdRef = useRef(0);

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
    if (isExecuting) return;

    if (key.return) {
      handleExecute();
    } else if (key.backspace || key.delete) {
      setCurrentLine(prev => prev.slice(0, -1));
    } else if (key.upArrow) {
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentLine(history[history.length - 1 - newIndex]);
      }
    } else if (key.downArrow) {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentLine(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentLine('');
      }
    } else if (key.ctrl && input === 'c') {
      // Clear current line
      setCurrentLine('');
    } else if (key.ctrl && input === 'd') {
      // Exit on Ctrl+D if line is empty
      if (currentLine === '') {
        handleExit(0);
      }
    } else if (key.ctrl && input === 'o') {
      // Toggle last Gemini response
      setOutput(prev => {
        let lastGeminiIndex = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].type === 'gemini') {
            lastGeminiIndex = i;
            break;
          }
        }
        if (lastGeminiIndex >= 0) {
          const newOutput = [...prev];
          newOutput[lastGeminiIndex].collapsed = !newOutput[lastGeminiIndex].collapsed;
          return newOutput;
        }
        return prev;
      });
    } else if (input && !key.ctrl && !key.meta) {
      setCurrentLine(prev => prev + input);
    }
  });

  const handleExecute = useCallback(async () => {
    const command = currentLine.trim();
    if (!command) return;

    setIsExecuting(true);
    setCurrentLine('');
    setHistoryIndex(-1);

    // Add to history
    setHistory(prev => [...prev, command]);

    // Add command to output
    const commandId = `cmd-${outputIdRef.current++}`;
    setOutput(prev => [...prev, { id: commandId, type: 'command', content: `✦ ${command}` }]);

    try {
      // Route the command
      const route = await commandRouterRef.current!.route(command);

      if (route.type === 'gemini') {
        // Handle Gemini query
        const responseId = `gemini-${outputIdRef.current++}`;
        setOutput(prev => [...prev, { 
          id: responseId, 
          type: 'gemini', 
          content: `[Gemini processing: ${route.query}]`,
          collapsed: false
        }]);
        // TODO: Actually process Gemini query
      } else {
        // Execute shell command
        const result = await shellRef.current!.execute(command, {
          cwd,
          onOutput: (chunk) => {
            // Stream output as it comes
            setOutput(prev => {
              const lastItem = prev[prev.length - 1];
              if (lastItem && lastItem.type === 'output' && lastItem.id === commandId + '-out') {
                // Append to existing output
                return [
                  ...prev.slice(0, -1),
                  { ...lastItem, content: lastItem.content + chunk }
                ];
              } else {
                // Create new output item
                return [...prev, { id: commandId + '-out', type: 'output', content: chunk }];
              }
            });
          },
          captureWorkingDirectory: true
        });

        // Update working directory if changed
        if (result.finalWorkingDirectory && result.finalWorkingDirectory !== cwd) {
          setCwd(result.finalWorkingDirectory);
        }

        // Handle errors
        if (result.error) {
          setOutput(prev => [...prev, { 
            id: `error-${outputIdRef.current++}`, 
            type: 'error', 
            content: result.error!.message 
          }]);
        }

        // Handle exit command
        if (command === 'exit' || command.startsWith('exit ')) {
          handleExit(result.exitCode);
        }
      }
    } catch (error) {
      setOutput(prev => [...prev, { 
        id: `error-${outputIdRef.current++}`, 
        type: 'error', 
        content: error instanceof Error ? error.message : String(error) 
      }]);
    } finally {
      setIsExecuting(false);
    }
  }, [currentLine, cwd]);

  const handleExit = useCallback((code: number) => {
    if (onExit) {
      onExit(code);
    } else {
      exit();
    }
  }, [onExit, exit]);

  // Get the prompt
  const getPrompt = () => {
    const home = process.env.HOME || '';
    const displayPath = cwd.startsWith(home) ? '~' + cwd.slice(home.length) : cwd;
    return `${displayPath} ✦ `;
  };

  return (
    <Box flexDirection="column">
      {/* Output history */}
      {output.map(item => (
        <Box key={item.id} marginBottom={item.type === 'gemini' ? 0 : 0}>
          {item.type === 'command' && (
            <Text color={Colors.AccentPurple}>{item.content}</Text>
          )}
          {item.type === 'output' && (
            <Text>{item.content}</Text>
          )}
          {item.type === 'error' && (
            <Text color={Colors.AccentRed}>{item.content}</Text>
          )}
          {item.type === 'gemini' && (
            <CollapsibleGeminiResponse
              response={item.content}
              isInitiallyCollapsed={item.collapsed || false}
              responseId={item.id}
              terminalWidth={process.stdout.columns || 80}
              isActive={true}
              showControls={true}
            />
          )}
        </Box>
      ))}

      {/* Current prompt */}
      <Box>
        <Text color={Colors.Gray}>{getPrompt()}</Text>
        <Text>{currentLine}</Text>
        {isExecuting && <Text color={Colors.AccentYellow}> ...</Text>}
      </Box>
    </Box>
  );
};