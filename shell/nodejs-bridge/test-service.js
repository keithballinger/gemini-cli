#!/usr/bin/env node

import { 
  GeminiClient, 
  Config, 
  AuthType, 
  FileDiscoveryService,
  ToolRegistry,
  sessionId
} from '@google/gemini-cli-core';

async function testGeminiIntegration() {
  console.log('Testing Gemini Core integration...');
  
  try {
    // Check if API key is available
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.log('No API key found. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.');
      console.log('Skipping integration test.');
      return;
    }
    
    // Create a file service
    const fileService = new FileDiscoveryService(process.cwd());
    
    // Create config with required parameters
    const config = new Config({
      sessionId: sessionId,
      embeddingModel: 'text-embedding-004',
      targetDir: process.cwd(),
      debugMode: false,
      question: '',
      fullContext: false,
      userMemory: '',
      geminiMdFileCount: 0,
      usageStatisticsEnabled: false,
      fileService: fileService, // Pass file service so tools can be initialized
    });
    
    // Create content generator config
    const contentGeneratorConfig = {
      authType: AuthType.USE_GEMINI,
      apiKey: apiKey,
      model: 'gemini-1.5-flash-002',
    };
    
    console.log('Initializing Gemini Client...');
    
    // Initialize client
    const geminiClient = new GeminiClient(config);
    await geminiClient.initialize(contentGeneratorConfig);
    
    console.log('Gemini Client initialized successfully!');
    
    // Test a simple query
    console.log('Testing simple query...');
    const query = 'Hello, can you say hi back?';
    const messageStream = geminiClient.sendMessageStream([{ text: query }], AbortSignal.timeout(30000));
    
    let response = null;
    for await (const event of messageStream) {
      if (event.text) {
        response = event.text;
        break;
      }
    }
    
    if (response) {
      console.log('Query successful!');
      console.log('Response:', response);
    } else {
      console.log('No response received');
    }
    
  } catch (error) {
    console.error('Integration test failed:', error.message);
    console.error('Full error:', error);
  }
}

testGeminiIntegration();