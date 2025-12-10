
import React, { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';

interface AnimatedCoinProps {
  value: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  onComplete: () => void;
  delay?: number;
}

export const AnimatedCoin: React.FC<AnimatedCoinProps> = ({
  value,
  startX,
  startY,
  targetX,
  targetY,
  onComplete,
  delay = 0
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 800;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const p = Math.min(elapsed / duration, 1);
        
        // Ease-out curve
        const eased = 1 - Math.pow(1 - p, 3);
        setProgress(eased);
        
        if (p < 1) {
          requestAnimationFrame(animate);
        } else {
          setTimeout(onComplete, 100);
        }
      };
      
      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, onComplete]);

  const currentX = startX + (targetX - startX) * progress;
  const currentY = startY + (targetY - startY) * progress;
  const scale = progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.7) / 0.3;
  const opacity = progress < 0.8 ? 1 : 1 - (progress - 0.8) / 0.2;

  return (
    <div
      className="absolute pointer-events-none z-50 flex items-center gap-1 text-yellow-400 font-bold text-sm"
      style={{
        left: `${currentX}px`,
        top: `${currentY}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        filter: 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.8))',
      }}
    >
      <Coins size={16} className="animate-spin" />
      <span>+{value}</span>
    </div>
  );
};

