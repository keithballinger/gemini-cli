import {
  GoogleGenAI,
  GenerateContentParameters,
  GenerateContentResponse,
  Content,
  Part,
  Tool,
} from '@google/genai';
import { VirtualFileSystem } from './VirtualFileSystem';
import { BrowserFileReader } from '../tools/BrowserFileReader';
import { BrowserFileWriter } from '../tools/BrowserFileWriter';
import { BrowserShell } from '../tools/BrowserShell';
import { BrowserWebFetch } from '../tools/BrowserWebFetch';

export interface BrowserGeminiClientOptions {
  apiKey: string;
  model?: string;
  vfs: VirtualFileSystem;
}

export class BrowserGeminiClient {
  private genAI: GoogleGenAI;
  private model: string;
  private vfs: VirtualFileSystem;
  private fileReader: BrowserFileReader;
  private fileWriter: BrowserFileWriter;
  private shell: BrowserShell;
  private webFetch: BrowserWebFetch;
  private history: Content[] = [];

  constructor(options: BrowserGeminiClientOptions) {
    console.log('BrowserGeminiClient constructor called with apiKey:', options.apiKey?.substring(0, 10) + '...');
    if (!options.apiKey || options.apiKey.trim() === '') {
      throw new Error('API key is required');
    }
    this.genAI = new GoogleGenAI(options.apiKey);
    this.model = options.model || 'gemini-1.5-flash';
    this.vfs = options.vfs;
    
    // Initialize browser tools
    this.fileReader = new BrowserFileReader({ vfs: this.vfs });
    this.fileWriter = new BrowserFileWriter({ vfs: this.vfs });
    this.shell = new BrowserShell();
    this.webFetch = new BrowserWebFetch();
  }

  async sendMessage(message: string): Promise<string> {
    try {
      // Add user message to history
      this.history.push({
        role: 'user',
        parts: [{ text: message }],
      });

      // Get the Gemini model
      const model = this.genAI.getGenerativeModel({ 
        model: this.model,
        tools: this.getBrowserTools(),
      });

      // Generate content with the full conversation history
      const result = await model.generateContent({
        contents: this.history,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      } as GenerateContentParameters);

      const response = result.response;
      const text = response.text();

      // Add assistant response to history
      this.history.push({
        role: 'model',
        parts: [{ text }],
      });

      // Check if the model wants to use tools
      const functionCalls = this.extractFunctionCalls(response);
      if (functionCalls.length > 0) {
        const toolResults = await this.executeFunctionCalls(functionCalls);
        
        // Add function call results to history
        this.history.push({
          role: 'function',
          parts: toolResults,
        });

        // Get a new response incorporating the tool results
        const followUpResult = await model.generateContent({
          contents: this.history,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        } as GenerateContentParameters);

        const followUpText = followUpResult.response.text();
        
        // Update the last model response in history
        this.history[this.history.length - 2] = {
          role: 'model',
          parts: [{ text: followUpText }],
        };

        return followUpText;
      }

      return text;
    } catch (error) {
      console.error('Error sending message to Gemini:', error);
      throw error;
    }
  }

  private getBrowserTools(): Tool[] {
    return [
      {
        name: 'read_file',
        description: 'Read the contents of a file from the virtual filesystem',
        parameters: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: 'The name of the file to read',
            },
          },
          required: ['filename'],
        },
      },
      {
        name: 'write_file',
        description: 'Write content to a file in the virtual filesystem',
        parameters: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: 'The name of the file to write',
            },
            content: {
              type: 'string',
              description: 'The content to write to the file',
            },
          },
          required: ['filename', 'content'],
        },
      },
      {
        name: 'list_files',
        description: 'List all files in the virtual filesystem',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'run_command',
        description: 'Run a limited shell command (echo, date, pwd, whoami, help)',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The command to run',
            },
          },
          required: ['command'],
        },
      },
      {
        name: 'fetch_url',
        description: 'Fetch content from a URL',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to fetch',
            },
          },
          required: ['url'],
        },
      },
    ];
  }

  private extractFunctionCalls(response: GenerateContentResponse): any[] {
    const functionCalls: any[] = [];
    
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if ('functionCall' in part && part.functionCall) {
            functionCalls.push(part.functionCall);
          }
        }
      }
    }
    
    return functionCalls;
  }

  private async executeFunctionCalls(functionCalls: any[]): Promise<Part[]> {
    const results: Part[] = [];
    
    for (const call of functionCalls) {
      try {
        let result: any;
        
        switch (call.name) {
          case 'read_file':
            const content = await this.fileReader.readFile(call.args.filename);
            result = content || `File ${call.args.filename} not found`;
            break;
            
          case 'write_file':
            this.fileWriter.writeFile(call.args.filename, call.args.content);
            result = `File ${call.args.filename} written successfully`;
            break;
            
          case 'list_files':
            const files = this.fileReader.listFiles();
            result = files.length > 0 
              ? files.map(f => `${f.name} (${f.size} bytes)`).join('\n')
              : 'No files in virtual filesystem';
            break;
            
          case 'run_command':
            const shellResult = await this.shell.runCommand(call.args.command);
            result = shellResult.stdout || shellResult.stderr;
            break;
            
          case 'fetch_url':
            const fetchResult = await this.webFetch.fetch(call.args.url);
            result = fetchResult.success 
              ? fetchResult.text.substring(0, 1000) + '...' // Limit response size
              : `Failed to fetch: ${fetchResult.error}`;
            break;
            
          default:
            result = `Unknown function: ${call.name}`;
        }
        
        results.push({
          functionResponse: {
            name: call.name,
            response: { result },
          },
        });
      } catch (error) {
        results.push({
          functionResponse: {
            name: call.name,
            response: { 
              error: error instanceof Error ? error.message : 'Unknown error' 
            },
          },
        });
      }
    }
    
    return results;
  }

  clearHistory(): void {
    this.history = [];
  }

  getHistory(): Content[] {
    return [...this.history];
  }
}