/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useInput } from 'ink';

export interface CollapsibleState {
  [responseId: string]: boolean;
}

export interface CollapsibleResponseManagerProps {
  children: (props: {
    collapsibleStates: CollapsibleState;
    toggleResponse: (id: string, collapsed: boolean) => void;
    toggleAllResponses: () => void;
    clearAllResponses: () => void;
  }) => React.ReactNode;
}

/**
 * Manages the collapsed/expanded state of multiple Gemini responses
 * and provides global keyboard shortcuts
 */
export const CollapsibleResponseManager: React.FC<CollapsibleResponseManagerProps> = ({
  children
}) => {
  const [collapsibleStates, setCollapsibleStates] = useState<CollapsibleState>({});
  const [allCollapsed, setAllCollapsed] = useState(false);

  // Handle individual response toggle
  const toggleResponse = useCallback((id: string, collapsed: boolean) => {
    setCollapsibleStates(prev => ({
      ...prev,
      [id]: collapsed
    }));
  }, []);

  // Toggle all responses
  const toggleAllResponses = useCallback(() => {
    const newState = !allCollapsed;
    setAllCollapsed(newState);
    
    // Update all known responses
    const newStates: CollapsibleState = {};
    Object.keys(collapsibleStates).forEach(id => {
      newStates[id] = newState;
    });
    setCollapsibleStates(newStates);
  }, [allCollapsed, collapsibleStates]);

  // Clear all responses from view
  const clearAllResponses = useCallback(() => {
    setCollapsibleStates({});
  }, []);

  // Global keyboard shortcuts
  useInput((input, key) => {
    // Ctrl+O: Toggle all responses
    if (input === 'o' && key.ctrl && !key.shift) {
      toggleAllResponses();
    }
    
    // Ctrl+Shift+O: Clear all responses
    if (input === 'O' && key.ctrl && key.shift) {
      clearAllResponses();
    }
  });

  return (
    <>
      {children({
        collapsibleStates,
        toggleResponse,
        toggleAllResponses,
        clearAllResponses
      })}
    </>
  );
};