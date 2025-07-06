#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { GoogleGenAI } from '@google/genai';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Configuration
const PORT = process.env.GEMINI_BRIDGE_PORT || 3001;
const HOST = process.env.GEMINI_BRIDGE_HOST || 'localhost';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize Gemini Client using GoogleGenAI directly
let genAI;

async function initializeGeminiClient() {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('Failed to initialize Gemini Client: No API key found');
      console.error('Make sure GEMINI_API_KEY or GOOGLE_API_KEY environment variable is set');
      process.exit(1);
    }
    
    // Initialize GoogleGenAI directly
    genAI = new GoogleGenAI(apiKey);
    
    console.log('Gemini Client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Gemini Client:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'gemini-shell-bridge',
    geminiReady: !!genAI 
  });
});

// Query endpoint for HTTP requests
app.post('/query', async (req, res) => {
  try {
    const { query, options = {} } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!genAI) {
      return res.status(503).json({ error: 'Gemini Client not initialized' });
    }

    // Generate content using the correct API
    const result = await genAI.models.generateContent({
      model: 'gemini-1.5-flash-002',
      contents: [{ role: 'user', parts: [{ text: query }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 1,
        maxOutputTokens: 8192,
      },
    });
    
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received';
    
    res.json({
      success: true,
      response: {
        text: responseText,
        metadata: {
          model: 'gemini-1.5-flash-002',
          timestamp: new Date().toISOString()
        },
        usage: result.usageMetadata || {}
      }
    });

  } catch (error) {
    console.error('Query error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error' 
    });
  }
});

// Tools endpoint for listing available tools
app.get('/tools', async (req, res) => {
  try {
    if (!genAI) {
      return res.status(503).json({ error: 'Gemini Client not initialized' });
    }

    // For this simple bridge, we'll return an empty tools list
    // In a full implementation, you'd load the actual tool registry
    const tools = [];
    res.json({ tools });
  } catch (error) {
    console.error('Tools error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute tool endpoint
app.post('/tools/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const { parameters = {} } = req.body;

    if (!genAI) {
      return res.status(503).json({ error: 'Gemini Client not initialized' });
    }

    // For this simple bridge, tools are not implemented
    return res.status(501).json({ error: 'Tool execution not implemented in simple bridge' });
    res.json({ success: true, result });
  } catch (error) {
    console.error('Tool execution error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// WebSocket connection for streaming
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'query':
          await handleStreamingQuery(ws, message);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        default:
          ws.send(JSON.stringify({ 
            type: 'error', 
            error: 'Unknown message type' 
          }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        error: error.message 
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

async function handleStreamingQuery(ws, message) {
  const { query, options = {} } = message;

  if (!query) {
    ws.send(JSON.stringify({ 
      type: 'error', 
      error: 'Query is required' 
    }));
    return;
  }

  if (!genAI) {
    ws.send(JSON.stringify({ 
      type: 'error', 
      error: 'Gemini Client not initialized' 
    }));
    return;
  }

  try {
    // Send start message
    ws.send(JSON.stringify({ 
      type: 'start', 
      query 
    }));

    // Use streaming API
    const streamResult = await genAI.models.generateContentStream({
      model: 'gemini-1.5-flash-002',
      contents: [{ role: 'user', parts: [{ text: query }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 1,
        maxOutputTokens: 8192,
      },
    });
    
    let responseText = '';
    for await (const chunk of streamResult) {
      const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (chunkText) {
        responseText += chunkText;
        ws.send(JSON.stringify({ 
          type: 'chunk', 
          data: chunkText 
        }));
      }
    }

    // Send completion message
    ws.send(JSON.stringify({ 
      type: 'complete', 
      response: {
        text: responseText || 'No response received',
        metadata: {
          model: 'gemini-1.5-flash-002',
          timestamp: new Date().toISOString()
        },
        usage: {} // Usage metadata not available in streaming
      }
    }));

  } catch (error) {
    console.error('Streaming query error:', error);
    ws.send(JSON.stringify({ 
      type: 'error', 
      error: error.message 
    }));
  }
}

// Error handling
app.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  await initializeGeminiClient();
  
  server.listen(PORT, HOST, () => {
    console.log(`Gemini Shell Bridge running on http://${HOST}:${PORT}`);
    console.log(`WebSocket endpoint: ws://${HOST}:${PORT}`);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down Gemini Shell Bridge...');
  server.close(() => {
    process.exit(0);
  });
});

start().catch(console.error);