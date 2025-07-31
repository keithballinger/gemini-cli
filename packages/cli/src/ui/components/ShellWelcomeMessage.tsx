/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';

interface ShellWelcomeMessageProps {
  terminalWidth: number;
}

export const ShellWelcomeMessage: React.FC<ShellWelcomeMessageProps> = ({ 
  terminalWidth 
}) => {
  const maxWidth = Math.min(terminalWidth - 4, 80);
  
  return (
    <Box flexDirection="column" marginBottom={2}>
      <Box>
        <Text color={Colors.AccentCyan} bold>
          🌟 Welcome to Gemini CLI Shell!
        </Text>
      </Box>
      
      <Box marginTop={1}>
        <Text color={Colors.Gray}>
          This enhanced shell combines traditional command-line functionality with AI assistance.
        </Text>
      </Box>
      
      <Box marginTop={1} flexDirection="column">
        <Text color={Colors.AccentYellow} bold>Usage Examples:</Text>
        
        <Box marginTop={1} flexDirection="column">
          <Text color={Colors.AccentGreen}>
            <Text bold>Regular Shell Commands:</Text>
          </Text>
          <Text color={Colors.Gray}>  ls -la, cd ~/Documents, git status, npm install</Text>
        </Box>
        
        <Box marginTop={1} flexDirection="column">
          <Text color={Colors.AccentGreen}>
            <Text bold>AI Queries (with 'g ' prefix):</Text>
          </Text>
          <Text color={Colors.Gray}>  g how do I find large files?</Text>
          <Text color={Colors.Gray}>  g explain what this repository does</Text>
        </Box>
        
        <Box marginTop={1} flexDirection="column">
          <Text color={Colors.AccentGreen}>
            <Text bold>AI Analysis (with '_ ' prefix):</Text>
          </Text>
          <Text color={Colors.Gray}>  _ ps aux | grep node</Text>
          <Text color={Colors.Gray}>  _ df -h</Text>
        </Box>
        
        <Box marginTop={1} flexDirection="column">
          <Text color={Colors.AccentGreen}>
            <Text bold>Natural Language (auto-detected):</Text>
          </Text>
          <Text color={Colors.Gray}>  what files are in this directory</Text>
          <Text color={Colors.Gray}>  how much disk space is being used</Text>
        </Box>
      </Box>
      
      <Box marginTop={1}>
        <Text color={Colors.LightBlue}>
          💡 Tip: Use Ctrl+C to cancel, Ctrl+D to exit, Ctrl+L to clear screen
        </Text>
      </Box>
      
      <Box marginTop={1}>
        <Text color={Colors.Gray} dimColor>
          {'-'.repeat(Math.min(maxWidth, 70))}
        </Text>
      </Box>
    </Box>
  );
};