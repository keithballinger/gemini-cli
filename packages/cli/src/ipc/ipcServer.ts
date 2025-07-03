/**
 * IPC Server for Gemini CLI
 * Provides a JSON-RPC based IPC interface for external GUI applications
 */

import { 
  Config, 
  GeminiEventType,
  ServerGeminiStreamEvent,
  ServerGeminiContentEvent,
  ServerGeminiToolCallRequestEvent,
  ServerGeminiToolCallResponseEvent,
  ServerGeminiErrorEvent,
  ToolCallRequestInfo,
  executeToolCall,
  CoreToolScheduler,
  ApprovalMode,
  ToolCallResponseInfo
} from '@google/gemini-cli-core';
import * as readline from 'node:readline';
import { EventEmitter } from 'node:events';

interface IPCRequest {
  id: string;
  method: string;
  params: any;
}

interface IPCResponse {
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

interface IPCStreamEvent {
  type: 'message.chunk' | 'tool.approval' | 'tool.start' | 'tool.end' | 'error';
  data: any;
}

export class IPCServer extends EventEmitter {
  private config: Config;
  private rl: readline.Interface;
  private isRunning = false;
  private toolScheduler: CoreToolScheduler | null = null;
  private approvalMode: ApprovalMode = ApprovalMode.YOLO;
  private pendingApprovals = new Map<string, any>();

  constructor(config: Config) {
    super();
    this.config = config;
    
    // Set up readline interface for stdin/stdout
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });
  }

  async start() {
    this.isRunning = true;
    
    // Send initial status
    this.sendResponse({
      id: 'init',
      result: {
        type: 'status',
        data: {
          connected: true,
          model: this.config.getModel(),
          workingDirectory: process.cwd(),
        },
      },
    });

    // Listen for incoming requests
    this.rl.on('line', async (line) => {
      console.error(`IPC: Received line: ${line}`);
      try {
        const request = JSON.parse(line) as IPCRequest;
        console.error(`IPC: Parsed request: ${JSON.stringify(request)}`);
        await this.handleRequest(request);
      } catch (error) {
        console.error(`IPC: Parse error:`, error);
        this.sendError('parse-error', -32700, 'Parse error: Invalid JSON');
      }
    });

    // Handle process termination
    process.on('SIGTERM', () => this.stop());
    process.on('SIGINT', () => this.stop());
  }

  private async handleRequest(request: IPCRequest) {
    try {
      switch (request.method) {
        case 'chat.send':
          await this.handleChatSend(request);
          break;
        case 'tool.execute':
          await this.handleToolExecute(request);
          break;
        case 'status.get':
          await this.handleGetStatus(request);
          break;
        case 'history.get':
          await this.handleGetHistory(request);
          break;
        case 'conversation.clear':
          await this.handleClearConversation(request);
          break;
        case 'config.setApprovalMode':
          await this.handleSetApprovalMode(request);
          break;
        case 'tool.approve':
          await this.handleToolApprove(request);
          break;
        default:
          this.sendError(request.id, -32601, `Method not found: ${request.method}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.sendError(request.id, -32603, `Internal error: ${errorMessage}`);
    }
  }

  private async handleChatSend(request: IPCRequest) {
    const { message, context } = request.params;
    console.error(`IPC: handleChatSend called with message: "${message}"`);
    
    try {
      // Get the Gemini client from config
      const geminiClient = this.config.getGeminiClient();
      
      if (!geminiClient) {
        throw new Error('Gemini client not initialized');
      }

      // Create an abort controller for cancellation
      const abortController = new AbortController();
      const signal = abortController.signal;
      
      // Initialize response tracking
      let responseText = '';
      const toolCalls: any[] = [];
      const toolCallRequests: ToolCallRequestInfo[] = [];
      
      // Create a tool scheduler for this conversation turn
      const toolScheduler = new CoreToolScheduler({
        config: this.config,
        toolRegistry: this.config.getToolRegistry(),
        approvalMode: this.approvalMode,
        getPreferredEditor: () => undefined,
        outputUpdateHandler: (callId, output) => {
          console.error(`IPC: Tool ${callId} output: ${output}`);
          // Could stream this back to HUD if needed
        },
        onToolCallsUpdate: (toolCalls) => {
          // Handle tool status updates
          for (const toolCall of toolCalls) {
            if (toolCall.status === 'awaiting_approval') {
              // Store the tool call for later approval
              this.pendingApprovals.set(toolCall.request.callId, toolCall);
              
              // Send approval request to HUD
              this.sendStreamEvent({
                type: 'tool.approval',
                data: {
                  id: toolCall.request.callId,
                  name: toolCall.request.name,
                  parameters: toolCall.request.args || {},
                },
              });
            } else if (toolCall.status === 'executing') {
              this.sendStreamEvent({
                type: 'tool.start',
                data: {
                  name: toolCall.request.name,
                  parameters: toolCall.request.args || {},
                },
              });
            } else if (toolCall.status === 'success' || toolCall.status === 'error') {
              const success = toolCall.status === 'success';
              let output = '';
              
              if (toolCall.status === 'success' && toolCall.response.resultDisplay) {
                output = typeof toolCall.response.resultDisplay === 'string' 
                  ? toolCall.response.resultDisplay 
                  : JSON.stringify(toolCall.response.resultDisplay);
              } else if (toolCall.status === 'error' && toolCall.response.error) {
                output = toolCall.response.error.message;
              }
              
              this.sendStreamEvent({
                type: 'tool.end',
                data: {
                  name: toolCall.request.name,
                  success,
                  output: output || 'Tool executed',
                },
              });
            }
          }
        },
        onAllToolCallsComplete: async (completedCalls) => {
          console.error(`IPC: All tools complete. Count: ${completedCalls.length}`);
          
          // Send tool responses back to Gemini
          const responseParts = completedCalls.map(call => call.response.responseParts).flat();
          if (responseParts.length > 0) {
            console.error(`IPC: Sending ${responseParts.length} tool responses back to Gemini`);
            const continuationTurn = await geminiClient.sendMessageStream(responseParts, signal);
            
            // Process the continuation
            for await (const event of continuationTurn) {
              if (event.type === GeminiEventType.Content) {
                const contentEvent = event as ServerGeminiContentEvent;
                responseText += contentEvent.value;
                this.sendStreamEvent({
                  type: 'message.chunk',
                  data: contentEvent.value,
                });
              }
              // Handle other events as needed
            }
          }
          
          // Send final response after tools complete
          this.sendResponse({
            id: request.id,
            result: {
              type: 'message',
              data: {
                response: responseText,
                tools: toolCalls,
                tokenUsage: {
                  prompt: 0, // TODO: Get actual token counts from Turn object
                  completion: 0,
                  total: 0,
                },
              },
            },
          });
        },
      });
      
      // Send the message and handle the complete conversation turn
      const turn = await geminiClient.sendMessageStream(message, signal);
      
      for await (const event of turn) {
        switch (event.type) {
          case GeminiEventType.Content:
            // Accumulate content and send chunks
            const contentEvent = event as ServerGeminiContentEvent;
            responseText += contentEvent.value;
            this.sendStreamEvent({
              type: 'message.chunk',
              data: contentEvent.value,
            });
            break;
            
          case GeminiEventType.ToolCallRequest:
            // Collect tool call requests
            const toolEvent = event as ServerGeminiToolCallRequestEvent;
            console.error(`IPC: Tool call requested: ${toolEvent.value.name}`);
            toolCallRequests.push(toolEvent.value);
            
            // Track for response
            toolCalls.push({
              name: toolEvent.value.name,
              parameters: toolEvent.value.args || {},
              approved: true, // Will be auto-approved
            });
            break;
            
          case GeminiEventType.Error:
            // Handle errors in the stream
            const errorEvent = event as ServerGeminiErrorEvent;
            this.sendStreamEvent({
              type: 'error',
              data: errorEvent.value.error,
            });
            break;
            
          // Handle other event types as needed
          case GeminiEventType.Thought:
            // Just log thoughts for debugging
            console.error(`IPC: Thought event: ${JSON.stringify(event)}`);
            break;
            
          case GeminiEventType.ChatCompressed:
          case GeminiEventType.ToolCallConfirmation:
            // These are informational events
            break;
            
          case GeminiEventType.ToolCallResponse:
            // This event is sent after tool execution by the model
            const toolResponseEvent = event as ServerGeminiToolCallResponseEvent;
            console.error(`IPC: Tool response completed for callId: ${toolResponseEvent.value.callId}`);
            
            // Notify about tool completion
            this.sendStreamEvent({
              type: 'tool.end',
              data: {
                name: toolResponseEvent.value.callId,
                success: !toolResponseEvent.value.error,
                output: toolResponseEvent.value.resultDisplay || 'Tool executed',
              },
            });
            break;
            
          case GeminiEventType.UserCancelled:
            // User cancelled the request
            break;
        }
      }

      // Schedule any tool calls that were requested
      if (toolCallRequests.length > 0) {
        console.error(`IPC: Scheduling ${toolCallRequests.length} tool calls`);
        await toolScheduler.schedule(toolCallRequests, signal);
        
        // The onAllToolCallsComplete callback will handle sending responses back to Gemini
        // and updating responseText with any continuation
      } else {
        // No tools to execute, send response now
        this.sendResponse({
          id: request.id,
          result: {
            type: 'message',
            data: {
              response: responseText,
              tools: toolCalls,
              tokenUsage: {
                prompt: 0, // TODO: Get actual token counts from Turn object
                completion: 0,
                total: 0,
              },
            },
          },
        });
      }
    } catch (error: any) {
      this.sendError(request.id, -32000, `Chat error: ${error.message}`);
    }
  }

  private async handleToolExecute(request: IPCRequest) {
    const { toolName, parameters, approved } = request.params;
    
    try {
      console.error(`IPC: handleToolExecute called for tool: ${toolName}`);
      
      // Get the tool registry from config
      const toolRegistry = await this.config.getToolRegistry();
      
      // Create a tool call request
      const toolCallRequest: ToolCallRequestInfo = {
        name: toolName,
        args: parameters,
        callId: request.id,
        isClientInitiated: true,
      };
      
      // Execute the tool
      const toolResponse = await executeToolCall(
        this.config,
        toolCallRequest,
        toolRegistry
      );
      
      // Extract the result from the response
      let output = '';
      let success = true;
      
      if (toolResponse.error) {
        output = toolResponse.error.message;
        success = false;
      } else if (toolResponse.resultDisplay) {
        if (typeof toolResponse.resultDisplay === 'string') {
          output = toolResponse.resultDisplay;
        } else {
          // Handle complex display types
          output = JSON.stringify(toolResponse.resultDisplay);
        }
      } else if (toolResponse.responseParts) {
        // responseParts is PartListUnion which can be Part[] or Part
        const parts = Array.isArray(toolResponse.responseParts) 
          ? toolResponse.responseParts 
          : [toolResponse.responseParts];
        
        if (parts.length > 0) {
          const part = parts[0];
          if (typeof part === 'object' && part !== null && 'functionResponse' in part) {
            const functionResponse = (part as any).functionResponse;
            if (functionResponse && functionResponse.response) {
              output = JSON.stringify(functionResponse.response);
            }
          }
        }
      }
      
      console.error(`IPC: Tool execution completed. Success: ${success}`);
      
      this.sendResponse({
        id: request.id,
        result: {
          type: 'tool',
          data: {
            output: output || 'Tool executed',
            success,
          },
        },
      });
    } catch (error: any) {
      console.error(`IPC: Tool execution error:`, error);
      this.sendResponse({
        id: request.id,
        result: {
          type: 'tool',
          data: {
            output: error.message || 'Tool execution failed',
            success: false,
          },
        },
      });
    }
  }

  private async handleGetStatus(request: IPCRequest) {
    this.sendResponse({
      id: request.id,
      result: {
        type: 'status',
        data: {
          connected: true,
          model: this.config.getModel(),
          workingDirectory: process.cwd(),
        },
      },
    });
  }

  private async handleGetHistory(request: IPCRequest) {
    // TODO: Implement history retrieval
    this.sendResponse({
      id: request.id,
      result: {
        type: 'history',
        data: {
          messages: [],
          hasMore: false,
        },
      },
    });
  }

  private async handleClearConversation(request: IPCRequest) {
    // TODO: Clear conversation history
    this.sendResponse({
      id: request.id,
      result: {
        type: 'success',
      },
    });
  }

  private async handleSetApprovalMode(request: IPCRequest) {
    const { mode } = request.params;
    
    // Map string mode to ApprovalMode enum
    switch (mode) {
      case 'yolo':
        this.approvalMode = ApprovalMode.YOLO;
        break;
      case 'ask':
        // Use DEFAULT mode for manual approval
        this.approvalMode = ApprovalMode.DEFAULT;
        break;
      default:
        this.sendError(request.id, -32602, `Invalid approval mode: ${mode}`);
        return;
    }
    
    console.error(`IPC: Approval mode set to: ${mode}`);
    
    this.sendResponse({
      id: request.id,
      result: {
        type: 'success',
      },
    });
  }
  
  private async handleToolApprove(request: IPCRequest) {
    const { toolId, approved } = request.params;
    
    const pendingToolCall = this.pendingApprovals.get(toolId);
    if (!pendingToolCall) {
      this.sendError(request.id, -32602, `No pending approval for tool: ${toolId}`);
      return;
    }
    
    // Call the onConfirm handler from the tool's confirmation details
    if (pendingToolCall.confirmationDetails && pendingToolCall.confirmationDetails.onConfirm) {
      // Use the correct ToolConfirmationOutcome enum values
      const outcome = approved ? 'proceed_once' : 'cancel';
      pendingToolCall.confirmationDetails.onConfirm(outcome);
    }
    
    this.pendingApprovals.delete(toolId);
    
    console.error(`IPC: Tool ${toolId} approval: ${approved}`);
    
    this.sendResponse({
      id: request.id,
      result: {
        type: 'success',
      },
    });
  }

  private sendResponse(response: IPCResponse) {
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  private sendStreamEvent(event: IPCStreamEvent) {
    process.stdout.write(JSON.stringify(event) + '\n');
  }

  private sendError(id: string, code: number, message: string) {
    this.sendResponse({
      id,
      error: {
        code,
        message,
      },
    });
  }

  stop() {
    this.isRunning = false;
    this.rl.close();
    process.exit(0);
  }
}

export async function startIPCServer(config: Config) {
  const server = new IPCServer(config);
  await server.start();
  
  // Keep the process alive
  process.stdin.resume();
}