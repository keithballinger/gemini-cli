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
  ServerGeminiErrorEvent
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
      
      // Send the message and handle the complete conversation turn
      const turn = await geminiClient.sendMessageStream(message, signal);
      
      // Process all events from the turn
      let responseText = '';
      const toolCalls: any[] = [];
      
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
            // Notify about tool call
            const toolEvent = event as ServerGeminiToolCallRequestEvent;
            toolCalls.push({
              name: toolEvent.value.name,
              parameters: toolEvent.value.args || {},
              approved: false,
            });
            this.sendStreamEvent({
              type: 'tool.start',
              data: {
                name: toolEvent.value.name,
                parameters: toolEvent.value.args || {},
              },
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
          case GeminiEventType.ChatCompressed:
          case GeminiEventType.ToolCallConfirmation:
          case GeminiEventType.ToolCallResponse:
            // Tool was executed by the client
            const toolResponseEvent = event as ServerGeminiToolCallResponseEvent;
            console.error(`IPC: Tool response event: ${JSON.stringify(toolResponseEvent)}`);
            this.sendStreamEvent({
              type: 'tool.end',
              data: {
                name: toolResponseEvent.value.callId,
                success: true,
                output: 'Tool executed',
              },
            });
            break;
            
          case GeminiEventType.UserCancelled:
            // User cancelled the request
            break;
        }
      }

      // Send final response
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
    } catch (error: any) {
      this.sendError(request.id, -32000, `Chat error: ${error.message}`);
    }
  }

  private async handleToolExecute(request: IPCRequest) {
    const { toolName, parameters, approved } = request.params;
    
    // TODO: Implement tool execution
    this.sendResponse({
      id: request.id,
      result: {
        type: 'tool',
        data: {
          output: 'Tool execution not yet implemented',
          success: false,
        },
      },
    });
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
    
    // TODO: Set approval mode
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