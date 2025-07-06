/**
 * Component to display grouped Gemini responses in shell mode
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { HistoryItem, MessageType, ToolCallStatus } from '../types.js';
import { ToolGroupMessage } from './messages/ToolGroupMessage.js';
import { Config } from '@google/gemini-cli-core';

interface GeminiShellResponseProps {
  items: HistoryItem[];
  isActive: boolean;
  terminalWidth: number;
  config?: Config;
  isFocused?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const GeminiShellResponse: React.FC<GeminiShellResponseProps> = ({
  items,
  isActive,
  terminalWidth,
  config,
  isFocused = true,
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse
}) => {
  const [localIsCollapsed, setLocalIsCollapsed] = useState(false);
  
  // Use controlled state if provided, otherwise use local state
  const isCollapsed = controlledIsCollapsed !== undefined ? controlledIsCollapsed : localIsCollapsed;

  // Extract the query from the first user item
  const queryItem = items.find(item => item.type === MessageType.USER);
  const query = (queryItem && 'text' in queryItem) ? queryItem.text : 'Gemini query';

  // Collect all response content and tool groups
  const responseContent: string[] = [];
  const toolGroups: HistoryItem[] = [];
  
  items.forEach(item => {
    if (item.type === 'gemini' || item.type === 'gemini_content' || item.type === 'gemini_collapsible') {
      if ('text' in item && item.text?.trim()) {
        responseContent.push(item.text);
      }
    } else if (item.type === 'tool_group') {
      toolGroups.push(item);
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

      {/* Tool groups with confirmations */}
      {toolGroups.map((toolGroup) => (
        <Box key={toolGroup.id} marginBottom={1}>
          <ToolGroupMessage
            toolCalls={toolGroup.type === 'tool_group' ? toolGroup.tools : []}
            groupId={toolGroup.id}
            availableTerminalHeight={undefined}
            terminalWidth={boxWidth - 4} // Account for padding
            config={config}
            isFocused={isFocused && isActive}
          />
        </Box>
      ))}

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