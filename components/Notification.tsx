
import React, { useEffect } from 'react';
import { X, CheckCircle, Star, Trophy, Target, Coins, Zap } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'mission' | 'achievement' | 'level';
  title: string;
  message?: string;
  icon?: React.ReactNode;
  duration?: number;
  count?: number; // For grouped notifications
  groupKey?: string; // Key to identify notifications that should be grouped
}

interface NotificationProps {
  notification: Notification;
  onClose: () => void;
}

export const NotificationItem: React.FC<NotificationProps> = ({ notification, onClose }) => {
  useEffect(() => {
    const duration = notification.duration || 1000; // Default 1 second
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification.id, notification.duration]); // Only depend on id and duration, not onClose

  const getStyles = () => {
    switch (notification.type) {
      case 'mission':
        return 'bg-gradient-to-r from-purple-600/90 to-pink-600/90 border-purple-400/50';
      case 'achievement':
        return 'bg-gradient-to-r from-amber-600/90 to-yellow-600/90 border-amber-400/50';
      case 'level':
        return 'bg-gradient-to-r from-emerald-600/90 to-teal-600/90 border-emerald-400/50';
      case 'success':
        return 'bg-emerald-600/90 border-emerald-400/50';
      case 'info':
        return 'bg-blue-600/90 border-blue-400/50';
      case 'warning':
        return 'bg-yellow-600/90 border-yellow-400/50';
      default:
        return 'bg-slate-700/90 border-slate-500/50';
    }
  };

  const getIcon = () => {
    if (notification.icon) return notification.icon;
    switch (notification.type) {
      case 'mission':
        return <Target size={20} className="text-white" />;
      case 'achievement':
        return <Trophy size={20} className="text-white" />;
      case 'level':
        return <Star size={20} className="text-white" />;
      case 'success':
        return <CheckCircle size={20} className="text-white" />;
      default:
        return <Zap size={20} className="text-white" />;
    }
  };

  return (
    <div
      className={`
        ${getStyles()}
        border-2 rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-2xl backdrop-blur-md
        animate-slide-in-right
        min-w-[280px] sm:min-w-[300px] max-w-[calc(100vw-2rem)] sm:max-w-[400px]
        flex items-start gap-2 sm:gap-3
        relative overflow-hidden
      `}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shine" />
      
      <div className="relative z-10 flex-shrink-0">
        {getIcon()}
      </div>
      <div className="relative z-10 flex-1">
        <div className="font-bold text-white text-sm">
          {notification.title}
          {notification.count && notification.count > 1 && (
            <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">
              x{notification.count}
            </span>
          )}
        </div>
        {notification.message && (
          <div className="text-white/90 text-xs mt-1">{notification.message}</div>
        )}
      </div>
      <button
        onClick={onClose}
        className="relative z-10 text-white/70 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

