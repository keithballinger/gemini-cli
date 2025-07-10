#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { 
  GeminiClient, 
  Config, 
  AuthType,
  FileDiscoveryService,
  ToolRegistry,
  sessionId,
  executeToolCall
} from '@google/gemini-cli-core';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Configuration
const PORT = process.env.GEMINI_BRIDGE_PORT || 3001;
const HOST = process.env.GEMINI_BRIDGE_HOST || 'localhost';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize Gemini Client using @google/gemini-cli-core
let geminiClient;
let config;

async function initializeGeminiClient() {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error('Failed to initialize Gemini Client: No API key found');
      console.error('Make sure GEMINI_API_KEY or GOOGLE_API_KEY environment variable is set');
      process.exit(1);
    }
    
    // Create Config with tool support enabled
    config = new Config({
      sessionId: sessionId,
      targetDir: process.cwd(),
      cwd: process.cwd(),
      debugMode: false,
      model: 'gemini-1.5-flash-002',
      usageStatisticsEnabled: false, // Disable for bridge service
      telemetry: { enabled: false }, // Disable telemetry for bridge service
      enableTools: true, // Enable tool support
      toolDiscoveryCommands: [], // Will use built-in tools
    });
    
    // Initialize authentication
    await config.refreshAuth(AuthType.USE_GEMINI);
    
    // Initialize tool registry with built-in tools
    const toolRegistry = await config.getToolRegistry();
    const toolDeclarations = toolRegistry.getFunctionDeclarations();
    console.log('Available tools:', toolDeclarations.map(t => t.name));
    
    // Get the initialized client
    geminiClient = config.getGeminiClient();
    
    console.log('Gemini Client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Gemini Client:', error);
    console.error('Error details:', error.stack);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'gemini-shell-bridge',
    geminiReady: !!geminiClient 
  });
});

// Helper function to process query with automatic tool execution
async function processQueryWithTools(query, controller) {
  const toolRegistry = await config.getToolRegistry();
  let allContent = '';
  let allUsage = {};
  let hasTools = false;
  
  async function sendAndProcess(message) {
    console.log('Sending message:', message);
    const messageStream = geminiClient.sendMessageStream(message, controller.signal);
    
    let responseText = '';
    let pendingToolCalls = [];
    let turn = null;
    
    for await (const event of messageStream) {
      console.log('Event:', event.type);
      
      if (event.type === 'content' && event.value) {
        responseText += event.value;
      } else if (event.type === 'tool_call_request') {
        hasTools = true;
        pendingToolCalls.push(event.value);
        console.log('Tool requested:', event.value.name);
      } else if (event.type === 'usage' && event.usage) {
        allUsage = event.usage;
      } else if (event.type === 'turn_complete') {
        turn = event.value;
      }
    }
    
    allContent += responseText;
    
    // Execute pending tools and continue conversation
    if (pendingToolCalls.length > 0) {
      console.log('Executing', pendingToolCalls.length, 'tools');
      const toolResponses = [];
      
      for (const toolCall of pendingToolCalls) {
        try {
          const result = await executeToolCall(config, toolCall, toolRegistry, controller.signal);
          console.log('Tool executed:', toolCall.name);
          
          // Collect tool responses in the format Gemini expects
          if (result.responseParts && Array.isArray(result.responseParts)) {
            toolResponses.push(...result.responseParts);
          } else if (result.responseParts) {
            toolResponses.push(result.responseParts);
          }
        } catch (error) {
          console.error('Tool error:', error);
          toolResponses.push({
            functionResponse: {
              id: toolCall.callId,
              name: toolCall.name,
              response: { error: error.message }
            }
          });
        }
      }
      
      // Send tool responses back to Gemini for final answer
      if (toolResponses.length > 0) {
        console.log('Sending tool responses back to Gemini');
        return await sendAndProcess(toolResponses);
      }
    }
    
    return { text: allContent, usage: allUsage, hasTools };
  }
  
  // Start the conversation
  return await sendAndProcess([{ text: query }]);
}

// Query endpoint for HTTP requests
app.post('/query', async (req, res) => {
  try {
    const { query, options = {} } = req.body;
    const { cwd } = options;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!geminiClient) {
      return res.status(503).json({ error: 'Gemini Client not initialized' });
    }

    console.log('Processing query:', query);

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, options.timeout || 30000);
    
    try {
      const result = await processQueryWithTools(query, controller);
      clearTimeout(timeout);
      
      res.json({
        success: true,
        response: {
          text: result.text || 'No response received',
          metadata: {
            model: config.getModel(),
            timestamp: new Date().toISOString(),
            toolsUsed: result.hasTools
          },
          usage: result.usage || {}
        }
      });
    } catch (innerError) {
      clearTimeout(timeout);
      throw innerError;
    }

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
    if (!geminiClient) {
      return res.status(503).json({ error: 'Gemini Client not initialized' });
    }

    // Get available tools from the tool registry
    const toolRegistry = await config.getToolRegistry();
    const tools = toolRegistry.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description
    }));
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

    if (!geminiClient) {
      return res.status(503).json({ error: 'Gemini Client not initialized' });
    }

    // Get tool registry and execute tool
    const toolRegistry = await config.getToolRegistry();
    const tool = toolRegistry.getTool(toolName);
    
    if (!tool) {
      return res.status(404).json({ error: `Tool '${toolName}' not found` });
    }
    
    const controller = new AbortController();
    const result = await tool.execute(parameters, controller.signal);
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

  if (!geminiClient) {
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

    // Use Gemini CLI streaming API
    const controller = new AbortController();
    const messageStream = geminiClient.sendMessageStream([{ text: query }], controller.signal);
    
    let responseText = '';
    let usageMetadata = {};
    
    for await (const event of messageStream) {
      if (event.type === 'content' && event.value) {
        responseText += event.value;
        ws.send(JSON.stringify({ 
          type: 'chunk', 
          data: event.value 
        }));
      }
    }

    // Send completion message
    ws.send(JSON.stringify({ 
      type: 'complete', 
      response: {
        text: responseText || 'No response received',
        metadata: {
          model: config.getModel(),
          timestamp: new Date().toISOString()
        },
        usage: usageMetadata
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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  console.error('Stack:', error.stack);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

start().catch(console.error);