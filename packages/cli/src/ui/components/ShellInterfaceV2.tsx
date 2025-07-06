/**
 * Enhanced Shell interface component for POSIX mode with full Gemini streaming
 * Used when Gemini CLI is invoked as a shell
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { GeminiShell, Config, GeminiClient, ToolRegistry } from '@google/gemini-cli-core';
import { Colors } from '../colors.js';
import { CommandRouter } from '../../utils/commandRouter.js';
import { useReactToolScheduler } from '../hooks/useReactToolScheduler.js';
import { HistoryItem, MessageType, ToolCallStatus } from '../types.js';
import { HistoryItemDisplay } from './HistoryItemDisplay.js';
import { 
  ServerGeminiStreamEvent, 
  GeminiEventType, 
  Turn,
  ToolCallRequestInfo,
  ThoughtSummary,
  getErrorMessage
} from '@google/gemini-cli-core';
import { SimpleLoadingIndicator } from './SimpleLoadingIndicator.js';
import ansiEscapes from 'ansi-escapes';
import { StreamingContext } from '../contexts/StreamingContext.js';
import { StreamingState } from '../types.js';

interface ShellInterfaceV2Props {
  initialDirectory?: string;
  onExit?: (code: number) => void;
  config: Config;
  geminiClient: GeminiClient;
}

type ShellOutput = {
  id: string;
  type: 'command' | 'shell_output' | 'error' | 'gemini' | 'info' | 'tool_call';
  content: string;
  historyItem?: HistoryItem;
  timestamp: number;
};

export const ShellInterfaceV2: React.FC<ShellInterfaceV2Props> = ({
  initialDirectory,
  onExit,
  config,
  geminiClient
}) => {
  const { exit } = useApp();
  const [currentLine, setCurrentLine] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [outputs, setOutputs] = useState<ShellOutput[]>([]);
  const [cwd, setCwd] = useState(initialDirectory || process.cwd());
  const [isExecuting, setIsExecuting] = useState(false);
  const [isStreamingGemini, setIsStreamingGemini] = useState(false);
  const [currentGeminiBuffer, setCurrentGeminiBuffer] = useState('');
  const [currentThought, setCurrentThought] = useState<string | null>(null);

  const shellRef = useRef<GeminiShell | null>(null);
  const commandRouterRef = useRef<CommandRouter | null>(null);
  const outputIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingGeminiIdRef = useRef<string | null>(null);

  // Tool scheduling with proper response handling
  const [toolCalls, scheduleToolCalls, markToolsAsSubmitted] = useReactToolScheduler(
    async (completedToolCalls) => {
      // Handle completed tools and continue the stream
      if (completedToolCalls.length > 0) {
        // Filter for tools that need responses sent back to Gemini
        const toolsNeedingResponse = completedToolCalls.filter(
          tc => !tc.request.isClientInitiated && 
                (tc.status === 'success' || tc.status === 'error' || tc.status === 'cancelled')
        );

        if (toolsNeedingResponse.length > 0 && abortControllerRef.current && pendingGeminiIdRef.current) {
          // Collect all tool responses
          const responseParts = toolsNeedingResponse.flatMap(tc => {
            if ('response' in tc && tc.response?.responseParts) {
              return Array.isArray(tc.response.responseParts) 
                ? tc.response.responseParts 
                : [tc.response.responseParts];
            }
            return [];
          });

          // Continue the stream with tool responses
          if (responseParts.length > 0) {
            // The stream should automatically continue after processing tool responses
            // Mark tools as submitted
            markToolsAsSubmitted(toolsNeedingResponse.map(tc => tc.request.callId));
          }
        }
      }
    },
    config,
    () => {}, // setPendingHistoryItem - we'll handle this locally
    () => undefined // getPreferredEditor
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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Handle Gemini stream events
  const processGeminiStreamEvents = useCallback(async (
    stream: AsyncGenerator<ServerGeminiStreamEvent, Turn>,
    queryId: string
  ) => {
    try {
      for await (const event of stream) {
        switch (event.type) {
          case GeminiEventType.Content:
            if ('value' in event) {
              const newContent = event.value;
              setCurrentGeminiBuffer(prev => {
                const updated = prev + newContent;
                // Update outputs with the accumulated buffer
                setOutputs(outputs => {
                  const newOutputs = [...outputs];
                  const index = newOutputs.findIndex(o => o.id === queryId);
                  if (index >= 0) {
                    newOutputs[index] = {
                      ...newOutputs[index],
                      content: updated
                    };
                  }
                  return newOutputs;
                });
                return updated;
              });
            }
            break;

          case GeminiEventType.ToolCallRequest:
            if ('value' in event) {
              const toolCallRequest: ToolCallRequestInfo = {
                callId: event.value.callId,
                name: event.value.name,
                args: event.value.args,
                isClientInitiated: event.value.isClientInitiated
              };
              scheduleToolCalls([toolCallRequest], abortControllerRef.current?.signal || new AbortController().signal);
            }
            break;

          case GeminiEventType.Thought:
            if ('value' in event) {
              setCurrentThought(`${event.value.subject}: ${event.value.description}`);
            }
            break;

          case GeminiEventType.ChatCompressed:
            if ('value' in event && event.value) {
              const compressionInfo = event.value;
              setOutputs(prev => [...prev, {
                id: `info-${outputIdRef.current++}`,
                type: 'info',
                content: `Chat compressed: ${compressionInfo.originalTokenCount} → ${compressionInfo.newTokenCount} tokens`,
                timestamp: Date.now()
              }]);
            }
            break;

          case GeminiEventType.Error:
            if ('value' in event) {
              setOutputs(prev => [...prev, {
                id: `error-${outputIdRef.current++}`,
                type: 'error',
                content: `Error: ${event.value.error.message}`,
                timestamp: Date.now()
              }]);
            }
            break;

          case GeminiEventType.ToolCallResponse:
            // Tool response received - the stream will continue
            break;

          case GeminiEventType.UserCancelled:
            // User cancelled - no specific action needed
            break;
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setOutputs(prev => [...prev, {
          id: `error-${outputIdRef.current++}`,
          type: 'error',
          content: `Stream error: ${getErrorMessage(error)}`,
          timestamp: Date.now()
        }]);
      }
    }
  }, [scheduleToolCalls]);

  // Handle input
  useInput((input, key) => {
    if (isExecuting || isStreamingGemini) {
      if (key.escape) {
        // Cancel current operation
        abortControllerRef.current?.abort();
        setIsStreamingGemini(false);
        return;
      }
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
      // Clear screen
      process.stdout.write(ansiEscapes.clearTerminal);
      setOutputs([]);
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
    setCommandHistory(prev => [...prev, command]);

    const commandId = `cmd-${outputIdRef.current++}`;
    setOutputs(prev => [...prev, {
      id: commandId,
      type: 'command',
      content: `✦ ${command}`,
      timestamp: Date.now()
    }]);

    try {
      const route = await commandRouterRef.current!.route(command);

      if (route.type === 'gemini') {
        // Handle Gemini query with full streaming
        setIsStreamingGemini(true);
        const responseId = `gemini-${outputIdRef.current++}`;
        pendingGeminiIdRef.current = responseId;
        
        setOutputs(prev => [...prev, {
          id: responseId,
          type: 'gemini',
          content: '',
          timestamp: Date.now()
        }]);

        abortControllerRef.current = new AbortController();
        const stream = geminiClient.sendMessageStream(
          route.query || '',
          abortControllerRef.current.signal
        );

        await processGeminiStreamEvents(stream, responseId);
        setIsStreamingGemini(false);
        setCurrentGeminiBuffer('');
        setCurrentThought(null);
        
      } else {
        // Execute shell command
        const result = await shellRef.current!.execute(command, {
          cwd,
          onOutput: (chunk) => {
            setOutputs(prev => {
              const lastItem = prev[prev.length - 1];
              if (lastItem && lastItem.type === 'shell_output' && lastItem.id === commandId + '-out') {
                return [
                  ...prev.slice(0, -1),
                  { ...lastItem, content: lastItem.content + chunk }
                ];
              } else {
                return [...prev, {
                  id: commandId + '-out',
                  type: 'shell_output',
                  content: chunk,
                  timestamp: Date.now()
                }];
              }
            });
          },
          captureWorkingDirectory: true
        });

        if (result.finalWorkingDirectory && result.finalWorkingDirectory !== cwd) {
          setCwd(result.finalWorkingDirectory);
        }

        if (result.error) {
          setOutputs(prev => [...prev, {
            id: `error-${outputIdRef.current++}`,
            type: 'error',
            content: result.error!.message,
            timestamp: Date.now()
          }]);
        }

        if (command === 'exit' || command.startsWith('exit ')) {
          handleExit(result.exitCode);
        }
      }
    } catch (error) {
      setOutputs(prev => [...prev, {
        id: `error-${outputIdRef.current++}`,
        type: 'error',
        content: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      }]);
    } finally {
      setIsExecuting(false);
    }
  }, [currentLine, cwd, geminiClient, processGeminiStreamEvents]);

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

  // Convert outputs to history items for display
  const displayItems = useMemo(() => {
    return outputs.map(output => {
      if (output.historyItem) {
        return output.historyItem;
      }

      // Convert output types to history item types
      switch (output.type) {
        case 'command':
          return {
            id: Date.now(),
            type: MessageType.USER,
            text: output.content.substring(2) // Remove "✦ "
          } as HistoryItem;
        
        case 'shell_output':
          return {
            id: Date.now(),
            type: MessageType.INFO,
            text: output.content
          } as HistoryItem;
        
        case 'gemini':
          return {
            id: Date.now(),
            type: 'gemini_collapsible' as const,
            text: output.content || 'Processing...'
          } as HistoryItem;
        
        case 'error':
          return {
            id: Date.now(),
            type: MessageType.ERROR,
            text: output.content
          } as HistoryItem;
        
        case 'info':
          return {
            id: Date.now(),
            type: MessageType.INFO,
            text: output.content
          } as HistoryItem;
        
        default:
          return {
            id: Date.now(),
            type: MessageType.INFO,
            text: output.content
          } as HistoryItem;
      }
    });
  }, [outputs]);

  // Determine streaming state for context
  const streamingState = isStreamingGemini ? StreamingState.Responding : StreamingState.Idle;

  return (
    <StreamingContext.Provider value={streamingState}>
      <Box flexDirection="column">
      {/* Output history */}
      {displayItems.map((item, index) => (
        <Box key={index} marginBottom={0}>
          <HistoryItemDisplay
            item={item}
            isPending={false}
            config={config}
            terminalWidth={process.stdout.columns || 80}
            isActive={index === displayItems.length - 1 && isStreamingGemini}
            isFocused={true}
          />
        </Box>
      ))}


      {/* Tool execution display */}
      {toolCalls.length > 0 && (
        <Box marginBottom={1}>
          <HistoryItemDisplay
            item={{
              id: Date.now(),
              type: 'tool_group',
              tools: toolCalls.map(tc => ({
                callId: tc.request.callId,
                name: tc.request.name,
                description: `${tc.request.name} tool call`,
                resultDisplay: undefined,
                status: tc.status === 'scheduled' ? ToolCallStatus.Pending :
                        tc.status === 'executing' ? ToolCallStatus.Executing :
                        tc.status === 'success' ? ToolCallStatus.Success :
                        tc.status === 'error' ? ToolCallStatus.Error :
                        ToolCallStatus.Canceled,
                confirmationDetails: undefined
              }))
            }}
            isPending={true}
            config={config}
            terminalWidth={process.stdout.columns || 80}
            isActive={true}
            isFocused={true}
          />
        </Box>
      )}

      {/* Thought display when streaming */}
      {currentThought && isStreamingGemini && (
        <Box marginBottom={1}>
          <Text color={Colors.Gray} dimColor>
            💭 {currentThought}
          </Text>
        </Box>
      )}

      {/* Current prompt */}
      <Box>
        <Text color={Colors.Gray}>{getPrompt()}</Text>
        <Text>{currentLine}</Text>
        {(isExecuting || isStreamingGemini) && (
          <Box marginLeft={1}>
            <SimpleLoadingIndicator />
          </Box>
        )}
      </Box>
    </Box>
    </StreamingContext.Provider>
  );
};