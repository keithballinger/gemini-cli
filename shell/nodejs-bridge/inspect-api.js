#!/usr/bin/env node

import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || 'dummy-key';

try {
  const genAI = new GoogleGenAI(apiKey);
  console.log('GoogleGenAI methods:', Object.getOwnPropertyNames(genAI));
  console.log('Models methods:', Object.getOwnPropertyNames(genAI.models));
  console.log('Models prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(genAI.models)));
} catch (error) {
  console.error('Error:', error.message);
}