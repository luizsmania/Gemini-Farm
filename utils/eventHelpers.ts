import React from 'react';

// Helper function to safely call preventDefault and stopPropagation on touch events
// This handles cases where the event listener is passive
export const safePreventDefault = (e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent) => {
  try {
    e.preventDefault();
    e.stopPropagation();
  } catch (err) {
    // Ignore if preventDefault fails (passive listener)
    // This is expected behavior for passive event listeners
  }
};

