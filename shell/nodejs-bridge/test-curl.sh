#!/bin/bash
echo "Testing Gemini Shell Bridge..."
curl -v -X POST http://localhost:3001/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Say hi"}' \
  2>&1