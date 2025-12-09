
import React from 'react';
import { Decoration as DecorationType } from '../types';
import { DECORATIONS } from '../constants';

interface DecorationProps {
  decoration: DecorationType;
  onMouseDown: () => void;
  isDraggable?: boolean;
}

export const Decoration: React.FC<DecorationProps> = ({ decoration, onMouseDown, isDraggable }) => {
  const data = DECORATIONS[decoration.typeId];
  
  return (
    <div 
      onMouseDown={onMouseDown}
      className={`
        w-full h-full absolute inset-0 z-20 flex items-center justify-center
        ${isDraggable ? 'cursor-move hover:scale-105 transition-transform' : 'pointer-events-none'}
      `}
    >
      <div className="text-4xl filter drop-shadow-lg select-none">
        {data.emoji}
      </div>
    </div>
  );
};
