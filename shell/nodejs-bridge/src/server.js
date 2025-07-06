#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { GeminiCLI } from '@google/gemini-cli-core';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Configuration
const PORT = process.env.GEMINI_BRIDGE_PORT || 3001;
const HOST = process.env.GEMINI_BRIDGE_HOST || 'localhost';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize Gemini CLI
let geminiCLI;

async function initializeGeminiCLI() {
  try {
    geminiCLI = new GeminiCLI();
    await geminiCLI.initialize();
    console.log('Gemini CLI initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Gemini CLI:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'gemini-shell-bridge',
    geminiReady: !!geminiCLI 
  });
});

// Query endpoint for HTTP requests
app.post('/query', async (req, res) => {
  try {
    const { query, options = {} } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!geminiCLI) {
      return res.status(503).json({ error: 'Gemini CLI not initialized' });
    }

    const response = await geminiCLI.query(query, options);
    
    res.json({
      success: true,
      response: {
        text: response.text || response,
        metadata: response.metadata || {},
        usage: response.usage || {}
      }
    });

  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error' 
    });
  }
});

// Tools endpoint for listing available tools
app.get('/tools', async (req, res) => {
  try {
    if (!geminiCLI) {
      return res.status(503).json({ error: 'Gemini CLI not initialized' });
    }

    const tools = await geminiCLI.getAvailableTools();
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

    if (!geminiCLI) {
      return res.status(503).json({ error: 'Gemini CLI not initialized' });
    }

    const result = await geminiCLI.executeTool(toolName, parameters);
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

  if (!geminiCLI) {
    ws.send(JSON.stringify({ 
      type: 'error', 
      error: 'Gemini CLI not initialized' 
    }));
    return;
  }

  try {
    // Send start message
    ws.send(JSON.stringify({ 
      type: 'start', 
      query 
    }));

    // Create streaming options
    const streamingOptions = {
      ...options,
      onChunk: (chunk) => {
        ws.send(JSON.stringify({ 
          type: 'chunk', 
          data: chunk 
        }));
      },
      onProgress: (progress) => {
        ws.send(JSON.stringify({ 
          type: 'progress', 
          progress 
        }));
      }
    };

    const response = await geminiCLI.query(query, streamingOptions);

    // Send completion message
    ws.send(JSON.stringify({ 
      type: 'complete', 
      response: {
        text: response.text || response,
        metadata: response.metadata || {},
        usage: response.usage || {}
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
  await initializeGeminiCLI();
  
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