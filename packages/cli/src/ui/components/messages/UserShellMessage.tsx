/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

interface UserShellMessageProps {
  text: string;
  cwd?: string;
}

export const UserShellMessage: React.FC<UserShellMessageProps> = ({ text, cwd }) => {
  // Remove leading '!' if present, as App.tsx adds it for the processor.
  const commandToDisplay = text.startsWith('!') ? text.substring(1) : text;
  
  // Format the prompt like the actual shell
  const formatPrompt = () => {
    if (cwd) {
      const home = process.env.HOME || '';
      const displayPath = cwd.startsWith(home) ? '~' + cwd.slice(home.length) : cwd;
      return `${displayPath} ✦ `;
    }
    return '✦ ';
  };

  return (
    <Box>
      <Text color={Colors.Gray}>{formatPrompt()}</Text>
      <Text>{commandToDisplay}</Text>
    </Box>
  );
};
