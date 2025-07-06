/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';
import { MaxSizedBox } from '../shared/MaxSizedBox.js';

export interface CollapsibleGeminiResponseProps {
  response: string;
  isInitiallyCollapsed?: boolean;
  responseId: string;
  terminalWidth: number;
  onToggle?: (id: string, collapsed: boolean) => void;
  isActive?: boolean;
  showControls?: boolean;
}

export const CollapsibleGeminiResponse: React.FC<CollapsibleGeminiResponseProps> = ({
  response,
  isInitiallyCollapsed = false,
  responseId,
  terminalWidth,
  onToggle,
  isActive = false,
  showControls = true,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(isInitiallyCollapsed);

  // Local keyboard handler for this specific response
  useInput((input, key) => {
    if (!isActive) return;
    
    if (key.return || key.tab || (input === 'o' && key.ctrl)) {
      const newState = !isCollapsed;
      setIsCollapsed(newState);
      onToggle?.(responseId, newState);
    }
  }, { isActive });

  const handleToggle = useCallback(() => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onToggle?.(responseId, newState);
  }, [isCollapsed, onToggle, responseId]);

  if (isCollapsed) {
    return (
      <Box marginTop={1} marginBottom={1}>
        <Text color={Colors.Gray}>
          {'▶ '}
          <Text color={Colors.AccentCyan}>[Gemini analysis available - Ctrl+O to expand]</Text>
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={1} marginBottom={1}>
      <Box 
        borderStyle="round" 
        borderColor={Colors.AccentCyan}
        paddingX={1}
        paddingY={0}
        width={terminalWidth - 2}
      >
        <Box flexDirection="column">
          <Box justifyContent="space-between" marginBottom={1}>
            <Text color={Colors.AccentCyan} bold>
              {'✦ Gemini'}
            </Text>
            {showControls && (
              <Text color={Colors.Gray}>
                Ctrl+O to minimize
              </Text>
            )}
          </Box>
          <MaxSizedBox 
            maxHeight={20}
            maxWidth={terminalWidth - 6} // Account for border and padding
          >
            <Box>
              <Text>{response}</Text>
            </Box>
          </MaxSizedBox>
        </Box>
      </Box>
    </Box>
  );
};