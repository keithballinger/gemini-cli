/**
 * Browser-compatible wrapper for Gemini core functionality
 * This avoids importing the full core package which has many Node.js dependencies
 */

import { GoogleGenAI, GenerateContentParameters } from '@google/genai';

export class BrowserGeminiCore {
  private genAI: GoogleGenAI;
  
  constructor(apiKey: string) {
    this.genAI = new GoogleGenAI(apiKey);
  }

  async generateContent(model: string, params: GenerateContentParameters) {
    const genModel = this.genAI.getGenerativeModel({ model });
    return genModel.generateContent(params);
  }
}