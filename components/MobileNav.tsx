
import React from 'react';
import { LayoutGrid, Store, TrendingUp, Target, Trophy } from 'lucide-react';

type Tab = 'field' | 'shop' | 'market' | 'missions' | 'achievements';

interface MobileNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'field', icon: <LayoutGrid size={20} />, label: 'Field' },
    { id: 'shop', icon: <Store size={20} />, label: 'Shop' },
    { id: 'market', icon: <TrendingUp size={20} />, label: 'Market' },
    { id: 'missions', icon: <Target size={20} />, label: 'Missions' },
    { id: 'achievements', icon: <Trophy size={20} />, label: 'Achievements' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-white/10 z-50 safe-area-bottom md:hidden">
      <div className="flex justify-around items-center h-16">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
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
      </div>
    </nav>
  );
};

