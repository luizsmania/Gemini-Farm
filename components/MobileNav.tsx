
import React from 'react';
import { LayoutGrid, Store, TrendingUp, Target, Trophy, Shield } from 'lucide-react';
import { safePreventDefault } from '../utils/eventHelpers';

type Tab = 'field' | 'shop' | 'market' | 'missions' | 'achievements' | 'leaderboard';

interface MobileNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isAdmin?: boolean;
  onAdminClick?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onTabChange, isAdmin, onAdminClick }) => {
  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'field', icon: <LayoutGrid size={20} />, label: 'Field' },
    { id: 'shop', icon: <Store size={20} />, label: 'Shop' },
    { id: 'market', icon: <TrendingUp size={20} />, label: 'Market' },
    { id: 'missions', icon: <Target size={20} />, label: 'Missions' },
    { id: 'achievements', icon: <Trophy size={20} />, label: 'Achievements' },
    { id: 'leaderboard', icon: <Trophy size={20} />, label: 'Rankings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-white/10 z-50 safe-area-bottom md:hidden">
      <div className="flex justify-around items-center h-16">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            onTouchEnd={(e) => {
              safePreventDefault(e);
              onTabChange(tab.id);
            }}
            className={`
              flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all
              ${activeTab === tab.id
                ? 'text-emerald-400 bg-emerald-500/10 scale-110'
                : 'text-slate-400 hover:text-slate-200 active:scale-95'
              }
            `}
            style={{ minWidth: '60px' }}
          >
            {tab.icon}
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
        {isAdmin && onAdminClick && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAdminClick();
            }}
            onTouchEnd={(e) => {
              safePreventDefault(e);
              onAdminClick();
            }}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all text-emerald-400 hover:text-emerald-300 active:scale-95"
            style={{ minWidth: '60px' }}
            title="Admin Panel"
          >
            <Shield size={20} />
            <span className="text-xs font-medium">Admin</span>
          </button>
        )}
      </div>
    </nav>
  );
};

