import React from 'react';
import { Calendar, Clock, History, Settings } from 'lucide-react';
import { useStore } from '../store';

interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const { showBanner, clearBanners } = useStore();
  
  const tabs = [
    { id: 'today', label: 'Today', icon: Clock, message: '📅 Viewing today\'s tasks' },
    { id: 'next', label: 'Next', icon: Calendar, message: '🔮 Planning ahead - viewing upcoming tasks' },
    { id: 'past', label: 'Past', icon: History, message: '📚 Looking back at your history' },
    { id: 'settings', label: 'Settings', icon: Settings, message: '⚙️ Customize your experience' },
  ];

  const handleTabChange = (tab: string) => {
    clearBanners(); // Clear existing banners before showing new tab message
    onTabChange(tab);
    const selectedTab = tabs.find(t => t.id === tab);
    if (selectedTab) {
      showBanner(selectedTab.message, 'info');
    }
  };

  return (
    <div className="bg-white border-t shadow-lg relative z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={`flex flex-col items-center py-2 px-4 flex-1 ${
              activeTab === id
                ? 'text-blue-600 border-t-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={20} />
            <span className="text-sm mt-1">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}