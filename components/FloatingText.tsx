
import React, { useEffect, useState } from 'react';
import { Coins, Star } from 'lucide-react';

export interface FloatingText {
  id: string;
  type: 'coins' | 'xp' | 'level';
  value: number;
  x: number;
  y: number;
}

interface FloatingTextProps {
  text: FloatingText;
  onComplete: () => void;
}

export const FloatingTextItem: React.FC<FloatingTextProps> = ({ text, onComplete }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 300);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const getColor = () => {
    switch (text.type) {
      case 'coins':
        return 'text-amber-400';
      case 'xp':
        return 'text-emerald-400';
      case 'level':
        return 'text-purple-400';
      default:
        return 'text-white';
    }
  };

  const getIcon = () => {
    switch (text.type) {
      case 'coins':
        return <Coins size={16} />;
      case 'xp':
        return <Star size={16} />;
      default:
        return null;
    }
  };

  const getPrefix = () => {
    switch (text.type) {
      case 'coins':
        return '+';
      case 'xp':
        return '+';
      case 'level':
        return 'Level ';
      default:
        return '';
    }
  };

  return (
    <div
      className={`
        absolute pointer-events-none z-50
        ${getColor()}
        font-bold text-lg
        flex items-center gap-1
        animate-float-up
        ${visible ? 'opacity-100' : 'opacity-0'}
        transition-opacity duration-300
      `}
      style={{
        left: `${text.x}px`,
        top: `${text.y}px`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {getIcon()}
      <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        {getPrefix()}{text.value.toLocaleString()}
      </span>
    </div>
  );
};

