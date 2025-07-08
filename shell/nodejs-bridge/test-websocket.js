#!/usr/bin/env node

import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  console.log('Connected to WebSocket');
  
  // Send a query
  const message = {
    type: 'query',
    query: 'Count from 1 to 5 slowly',
    options: {}
  };
  
  ws.send(JSON.stringify(message));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  
  switch (message.type) {
    case 'start':
      console.log('Query started:', message.query);
      break;
    case 'chunk':
      process.stdout.write(message.data);
      break;
    case 'complete':
      console.log('\nQuery complete');
      console.log('Full response:', message.response.text);
      ws.close();
      break;
    case 'error':
      console.error('Error:', message.error);
      ws.close();
      break;
  }
});

ws.on('close', () => {
  console.log('WebSocket closed');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});