import { VirtualFileSystem } from './VirtualFileSystem';
import { createBrowserPlatform } from '../platform/platform-browser';
import { setPlatform, GeminiClient } from '@google/gemini-cli-core';

export interface BrowserGeminiServiceOptions {
  apiKey: string;
  vfs: VirtualFileSystem;
  model?: string;
}

export class BrowserGeminiService {
  private client: GeminiClient;
  private vfs: VirtualFileSystem;

  constructor(private options: BrowserGeminiServiceOptions) {
    this.vfs = options.vfs;
    
    // Set up browser platform before initializing core
    setPlatform(createBrowserPlatform(options.vfs));
    
    // Initialize core GeminiClient
    this.client = new GeminiClient({
      apiKey: options.apiKey,
      model: options.model || 'gemini-1.5-flash'
    });
  }

  async initialize(): Promise<void> {
    await this.client.initialize();
  }

  async sendMessage(message: string): Promise<string> {
    return this.client.sendMessage(message);
  }
}