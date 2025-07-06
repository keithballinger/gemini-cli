/**
 * Simple loading indicator for shell mode that doesn't require StreamingContext
 */

import React, { useEffect, useState } from 'react';
import { Text } from 'ink';
import { Colors } from '../colors.js';

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export const SimpleLoadingIndicator: React.FC = () => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prevFrame) => (prevFrame + 1) % spinnerFrames.length);
    }, 80);

    return () => clearInterval(timer);
  }, []);

  return <Text color={Colors.AccentPurple}>{spinnerFrames[frame]}</Text>;
};