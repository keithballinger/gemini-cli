#!/usr/bin/env node

import { 
  GeminiClient, 
  Config, 
  AuthType,
  sessionId
} from '@google/gemini-cli-core';

async function testCoreIntegration() {
  console.log('Testing @google/gemini-cli-core integration...');
  
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.log('No API key found. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.');
      return;
    }
    
    console.log('Creating Config...');
    
    // Create Config with minimal required parameters
    const config = new Config({
      sessionId: sessionId,
      targetDir: process.cwd(),
      cwd: process.cwd(),
      debugMode: false,
      model: 'gemini-1.5-flash-002',
      usageStatisticsEnabled: false,
      telemetry: { enabled: false },
    });
    
    console.log('Config created successfully');
    console.log('Initializing authentication...');
    
    // Initialize authentication and tools
    await config.refreshAuth(AuthType.USE_GEMINI);
    
    console.log('Authentication initialized');
    
    // Get the initialized client
    const geminiClient = config.getGeminiClient();
    
    console.log('Gemini Client retrieved successfully');
    
    // Test a simple query
    console.log('Testing simple query...');
    const query = 'Hello! Can you respond with just "Hi from Gemini CLI Core!"?';
    
    console.log('Sending message stream...');
    const controller = new AbortController();
    const messageStream = geminiClient.sendMessageStream([{ text: query }], controller.signal);
    
    console.log('Processing stream...');
    let responseText = '';
    
    for await (const event of messageStream) {
      console.log('Full event:', JSON.stringify(event, null, 2));
      if (event.type === 'content' && event.value) {
        responseText += event.value;
      }
    }
    
    console.log('Query successful!');
    console.log('Response:', responseText);
    
  } catch (error) {
    console.error('Integration test failed:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testCoreIntegration();