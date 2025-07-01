/**
 * IPC Server for Gemini CLI
 * Provides a JSON-RPC based IPC interface for external GUI applications
 */

import { Config } from '@google/gemini-cli-core';
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
      try {
        const request = JSON.parse(line) as IPCRequest;
        await this.handleRequest(request);
      } catch (error) {
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
      this.sendError(request.id, -32603, `Internal error: ${error.message}`);
    }
  }

  private async handleChatSend(request: IPCRequest) {
    const { message, context } = request.params;
    
    try {
      // Get the Gemini client from config
      const geminiClient = this.config.getGeminiClient();
      
      if (!geminiClient) {
        throw new Error('Gemini client not initialized');
      }

      // Set up streaming chunks collection
      const chunks: string[] = [];
      
      // Send the message with streaming
      const streamingResponse = await geminiClient.sendMessageStream(message, (chunk) => {
        chunks.push(chunk);
        this.sendStreamEvent({
          type: 'message.chunk',
          data: chunk,
        });
      });

      // Wait for the complete response
      const response = await streamingResponse.response;
      const text = response.text();

      // Extract function calls if any
      const functionCalls = response.functionCalls();
      const tools = functionCalls ? functionCalls.map(fc => ({
        name: fc.name,
        parameters: fc.args || {},
        approved: false,
      })) : [];

      // Send complete response
      this.sendResponse({
        id: request.id,
        result: {
          type: 'message',
          data: {
            response: text,
            tools,
            tokenUsage: {
              prompt: 0, // TODO: Get actual token counts from response.usageMetadata
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