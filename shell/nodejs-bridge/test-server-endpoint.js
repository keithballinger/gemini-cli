#!/usr/bin/env node

import { 
  GeminiClient, 
  Config, 
  AuthType,
  sessionId
} from '@google/gemini-cli-core';

async function testEndpoint() {
  console.log('Testing server endpoint logic...');
  
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.log('No API key found.');
      return;
    }
    
    // Create Config 
    const config = new Config({
      sessionId: sessionId,
      targetDir: process.cwd(),
      cwd: process.cwd(),
      debugMode: false,
      model: 'gemini-1.5-flash-002',
      usageStatisticsEnabled: false,
      telemetry: { enabled: false },
    });
    
    // Initialize authentication
    await config.refreshAuth(AuthType.USE_GEMINI);
    
    // Get the initialized client
    const geminiClient = config.getGeminiClient();
    
    console.log('Testing query endpoint logic...');
    
    // Simulate the endpoint logic
    const query = 'Say hi';
    console.log('Processing query:', query);
    
    const controller = new AbortController();
    
    // Set timeout
    const timeout = setTimeout(() => {
      controller.abort();
    }, 30000);
    
    try {
      console.log('Creating message stream...');
      const messageStream = geminiClient.sendMessageStream([{ text: query }], controller.signal);
      
      console.log('Stream created, processing events...');
      let responseText = '';
      let eventCount = 0;
      let turn = null;
      
      // Process the async generator
      let result = await messageStream.next();
      while (!result.done) {
        const event = result.value;
        eventCount++;
        console.log(`Event ${eventCount}:`, event.type, event.value ? `"${event.value}"` : 'no value');
        if (event.type === 'content' && event.value) {
          responseText += event.value;
        }
        result = await messageStream.next();
      }
      
      // The final value is the Turn object
      turn = result.value;
      console.log('Turn object received:', turn ? 'yes' : 'no');
      
      clearTimeout(timeout);
      
      console.log('Final response:', responseText);
      console.log('Total events:', eventCount);
      
      // This is what would be sent back
      const response = {
        success: true,
        response: {
          text: responseText || 'No response received',
          metadata: {
            model: config.getModel(),
            timestamp: new Date().toISOString()
          },
          usage: {}
        }
      };
      
      console.log('Would send response:', JSON.stringify(response, null, 2));
      
    } catch (innerError) {
      clearTimeout(timeout);
      console.error('Inner error:', innerError.message);
      console.error('Inner stack:', innerError.stack);
      throw innerError;
    }
    
  } catch (error) {
    console.error('Outer error:', error.message);
    console.error('Outer stack:', error.stack);
  }
}

testEndpoint();