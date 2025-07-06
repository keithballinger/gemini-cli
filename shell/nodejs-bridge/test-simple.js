#!/usr/bin/env node

import { GoogleGenAI } from '@google/genai';

async function testSimpleGemini() {
  console.log('Testing simple GoogleGenAI integration...');
  
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.log('No API key found. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.');
      console.log('Skipping integration test.');
      return;
    }
    
    console.log('Initializing GoogleGenAI...');
    
    // Initialize GoogleGenAI directly
    const genAI = new GoogleGenAI(apiKey);
    
    console.log('GoogleGenAI initialized successfully!');
    
    // Test a simple query
    console.log('Testing simple query...');
    const query = 'Hello, can you say hi back in one sentence?';
    
    const result = await genAI.models.generateContent({
      model: 'gemini-1.5-flash-002',
      contents: [{ role: 'user', parts: [{ text: query }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 1,
        maxOutputTokens: 8192,
      },
    });
    
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    
    console.log('Query successful!');
    console.log('Response:', responseText);
    
    // Test streaming
    console.log('\\nTesting streaming query...');
    const streamQuery = 'Count from 1 to 5 slowly.';
    
    let streamedText = '';
    const streamResult = await genAI.models.generateContentStream({
      model: 'gemini-1.5-flash-002',
      contents: [{ role: 'user', parts: [{ text: streamQuery }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 1,
        maxOutputTokens: 8192,
      },
    });
    
    for await (const chunk of streamResult) {
      const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (chunkText) {
        streamedText += chunkText;
        process.stdout.write(chunkText);
      }
    }
    
    console.log('\\nStreaming successful!');
    console.log('Full streamed response:', streamedText);
    
  } catch (error) {
    console.error('Integration test failed:', error.message);
  }
}

testSimpleGemini();