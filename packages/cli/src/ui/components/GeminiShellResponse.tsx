/**
 * Component to display grouped Gemini responses in shell mode
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { HistoryItem, MessageType } from '../types.js';

interface GeminiShellResponseProps {
  items: HistoryItem[];
  isActive: boolean;
  terminalWidth: number;
}

export const GeminiShellResponse: React.FC<GeminiShellResponseProps> = ({
  items,
  isActive,
  terminalWidth
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Extract the query from the first user item
  const queryItem = items.find(item => item.type === MessageType.USER);
  const query = queryItem?.text || 'Gemini query';

  // Collect all response content
  const responseContent: string[] = [];
  const toolCalls: string[] = [];
  
  items.forEach(item => {
    if (item.type === 'gemini' || item.type === 'gemini_content' || item.type === 'gemini_collapsible') {
      if (item.text?.trim()) {
        responseContent.push(item.text);
      }
    } else if (item.type === 'tool_group' && item.tools) {
      item.tools.forEach(tool => {
        toolCalls.push(`✔ ${tool.name}`);
      });
    }
  });

  const fullResponse = responseContent.join('').trim();
  const boxWidth = Math.min(terminalWidth - 2, 120); // Max width of 120

  if (isCollapsed) {
    return (
      <Box 
        borderStyle="round" 
        borderColor={Colors.AccentCyan}
        paddingX={1}
        width={boxWidth}
        marginBottom={1}
      >
        <Text>
          ▶ {query} <Text color={Colors.Gray}>(Ctrl+O to expand)</Text>
        </Text>
      </Box>
    );
  }

  return (
    <Box 
      borderStyle="round" 
      borderColor={Colors.AccentCyan}
      paddingX={1}
      paddingY={0}
      flexDirection="column"
      width={boxWidth}
      marginBottom={1}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text color={Colors.AccentCyan}>✦ Gemini</Text>
        <Text color={Colors.Gray}> - {query}</Text>
        {!isActive && <Text color={Colors.Gray}> (Ctrl+O to minimize)</Text>}
      </Box>

      {/* Tool calls */}
      {toolCalls.length > 0 && (
        <Box marginBottom={1} flexDirection="column">
          {toolCalls.map((tool, index) => (
            <Text key={index} color={Colors.AccentGreen}>{tool}</Text>
          ))}
        </Box>
      )}

      {/* Response */}
      {fullResponse && (
        <Box>
          <Text wrap="wrap">{fullResponse}</Text>
        </Box>
      )}

      {/* Loading indicator */}
      {isActive && !fullResponse && (
        <Text color={Colors.AccentPurple}>Processing...</Text>
      )}
    </Box>
  );
};