
import React, { useEffect, useState } from 'react';
import { ParticleEffect } from '../types';
import { Coins, Sparkles } from 'lucide-react';

interface ParticleEffectsProps {
  particles: ParticleEffect[];
  onRemove: (id: string) => void;
}

export const ParticleEffects: React.FC<ParticleEffectsProps> = ({ particles, onRemove }) => {
  return (
    <>
      {particles.map(particle => {
        const duration = 1500; // ms
        const age = Date.now() - particle.createdAt;
        const progress = Math.min(age / duration, 1);
        const opacity = 1 - progress;
        const yOffset = progress * 60;
        const scale = 0.5 + (1 - progress) * 0.5;
        
        if (progress >= 1) {
          setTimeout(() => onRemove(particle.id), 0);
          return null;
        }

        let content: React.ReactNode;
        let className = '';

        switch (particle.type) {
          case 'coin':
            content = (
              <div className="flex items-center gap-1 text-yellow-400 font-bold text-sm">
                <Coins size={14} className="animate-spin" />
                <span>+{particle.value}</span>
              </div>
            );
            className = 'text-yellow-400';
            break;
          case 'xp':
            content = (
              <div className="flex items-center gap-1 text-blue-400 font-bold text-sm">
                <Sparkles size={14} className="animate-pulse" />
                <span>+{particle.value} XP</span>
              </div>
            );
            className = 'text-blue-400';
            break;
          case 'harvest':
            content = (
              <div className="text-2xl animate-bounce">
                {particle.value === 1 ? '✨' : '⭐'}
              </div>
            );
            break;
          case 'combo':
            content = (
              <div className="text-lg font-bold text-purple-400 animate-pulse">
                COMBO x{particle.value}!
              </div>
            );
            break;
          case 'prestige':
            content = (
              <div className="text-xl font-bold text-gradient-to-r from-yellow-400 to-orange-500 animate-pulse">
                PRESTIGE!
              </div>
            );
            break;
          default:
            return null;
        }

        return (
          <div
            key={particle.id}
            className="absolute pointer-events-none z-50 transition-all"
            style={{
              left: `${particle.x}px`,
              top: `${particle.y - yOffset}px`,
              opacity,
              transform: `translate(-50%, -50%) scale(${scale})`,
              filter: 'drop-shadow(0 0 8px currentColor)',
            }}
          >
            {content}
          </div>
        );
      })}
    </>
  );
};

