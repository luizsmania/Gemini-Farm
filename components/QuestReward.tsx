
import React, { useEffect, useState } from 'react';
import { Coins, Star, Sparkles, CheckCircle } from 'lucide-react';

interface QuestRewardProps {
  coins: number;
  xp: number;
  onComplete: () => void;
}

export const QuestReward: React.FC<QuestRewardProps> = ({ coins, xp, onComplete }) => {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<'entering' | 'showing' | 'exiting'>('entering');

  useEffect(() => {
    // Enter animation
    setTimeout(() => setPhase('showing'), 100);
    
    // Exit after showing
    const exitTimer = setTimeout(() => {
      setPhase('exiting');
      setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 500);
    }, 2500);

    return () => clearTimeout(exitTimer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${
          phase === 'entering' ? 'opacity-0' : phase === 'exiting' ? 'opacity-0' : 'opacity-100'
        }`}
      />
      
      {/* Reward Card */}
      <div
        className={`
          relative z-10
          bg-gradient-to-br from-purple-600 via-pink-600 to-amber-500
          border-4 border-white/30
          rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl mx-4
          transform transition-all duration-500
          ${phase === 'entering' ? 'scale-0 rotate-180 opacity-0' : ''}
          ${phase === 'showing' ? 'scale-100 rotate-0 opacity-100 animate-bounce-in' : ''}
          ${phase === 'exiting' ? 'scale-75 rotate-45 opacity-0' : ''}
        `}
      >
        {/* Sparkle effects */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full animate-sparkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 text-center">
          {/* Success Icon */}
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-white/30 rounded-full blur-xl animate-pulse-glow" />
              <CheckCircle 
                size={64} 
                className="text-white relative z-10 animate-bounce-in drop-shadow-2xl" 
                strokeWidth={3}
              />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-4xl font-black text-white mb-2 drop-shadow-lg animate-bounce-in" style={{ animationDelay: '0.1s' }}>
            QUEST COMPLETE!
          </h2>
          
          <div className="text-white/90 text-lg mb-6 animate-bounce-in" style={{ animationDelay: '0.2s' }}>
            Great job, farmer!
          </div>

          {/* Rewards */}
          <div className="flex items-center justify-center gap-8 mb-4 animate-bounce-in" style={{ animationDelay: '0.3s' }}>
            {/* Coins */}
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border-2 border-white/30">
              <div className="flex items-center gap-2 mb-1">
                <Coins size={32} className="text-amber-300 drop-shadow-lg" />
                <span className="text-3xl font-black text-white drop-shadow-lg">+{coins.toLocaleString()}</span>
              </div>
              <div className="text-white/80 text-sm font-bold">COINS</div>
            </div>

            {/* XP */}
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border-2 border-white/30">
              <div className="flex items-center gap-2 mb-1">
                <Star size={32} className="text-emerald-300 drop-shadow-lg" />
                <span className="text-3xl font-black text-white drop-shadow-lg">+{xp.toLocaleString()}</span>
              </div>
              <div className="text-white/80 text-sm font-bold">EXPERIENCE</div>
            </div>
          </div>

          {/* Confetti effect */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            {[...Array(30)].map((_, i) => {
              const angle = (i / 30) * Math.PI * 2;
              const distance = 200 + Math.random() * 100;
              const tx = Math.cos(angle) * distance;
              const ty = Math.sin(angle) * distance;
              return (
                <div
                  key={i}
                  className="absolute w-3 h-3 rounded-full animate-confetti"
                  style={{
                    left: '50%',
                    top: '50%',
                    backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#FFE66D', '#FF6B9D'][i % 5],
                    animationDelay: `${i * 0.05}s`,
                    '--tx': `${tx}px`,
                    '--ty': `${ty}px`
                  } as React.CSSProperties}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

