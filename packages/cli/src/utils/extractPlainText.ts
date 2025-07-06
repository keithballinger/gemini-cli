/**
 * Extract plain text from various message types
 */

import { HistoryItem, HistoryItemWithoutId, MessageType } from '../ui/types.js';

/**
 * Remove ANSI escape codes from text
 */
export function stripAnsi(text: string): string {
  // Remove color codes, cursor movements, etc.
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Extract plain text from history items
 */
export function extractPlainTextFromItems(items: (HistoryItem | HistoryItemWithoutId)[]): string {
  const textParts: string[] = [];
  
  items.forEach(item => {
    if (item.type === 'gemini' || 
        item.type === 'gemini_content' || 
        item.type === 'gemini_collapsible') {
      if ('text' in item && item.text?.trim()) {
        // Strip ANSI codes and markdown formatting
        let cleanText = stripAnsi(item.text);
        
        // Remove markdown code block markers
        cleanText = cleanText.replace(/^```[\w]*\n/gm, '');
        cleanText = cleanText.replace(/^```$/gm, '');
        
        textParts.push(cleanText.trim());
      }
    }
  });
  
  return textParts.join('\n');
}

/**
 * Extract plain text from the last Gemini response group
 */
export function extractLastGeminiResponse(allItems: (HistoryItem | HistoryItemWithoutId)[]): string {
  // Find the last group of Gemini responses
  let lastResponseGroup: (HistoryItem | HistoryItemWithoutId)[] = [];
  let inGeminiGroup = false;
  
  // Traverse items in reverse to find the last complete response
  for (let i = allItems.length - 1; i >= 0; i--) {
    const item = allItems[i];
    const isGeminiResponse = 
      item.type === 'gemini' ||
      item.type === 'gemini_content' ||
      item.type === 'gemini_collapsible' ||
      item.type === 'tool_group';
    
    if (isGeminiResponse) {
      lastResponseGroup.unshift(item);
      inGeminiGroup = true;
    } else if (inGeminiGroup && item.type === MessageType.USER) {
      // Found the query that triggered this response
      break;
    } else if (inGeminiGroup) {
      // End of Gemini group
      break;
    }
  }
  
  return extractPlainTextFromItems(lastResponseGroup);
}