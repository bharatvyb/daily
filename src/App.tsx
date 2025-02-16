import React, { useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { TabBar } from './components/TabBar';
import { SettingsScreen } from './components/SettingsScreen';
import { ReminderForm } from './components/ReminderForm';
import { ReminderList } from './components/ReminderList';
import { FeedbackBanner } from './components/FeedbackBanner';

export default function App() {
  const [activeTab, setActiveTab] = useState('today');
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [editingReminder, setEditingReminder] = useState<string | null>(null);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'settings':
        return <SettingsScreen />;
      case 'today':
      case 'next':
      case 'past':
        return (
          <ReminderList 
            type={activeTab as 'today' | 'next' | 'past'} 
            onEditReminder={setEditingReminder}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed inset-0 flex flex-col">
        <TitleBar onAddClick={() => setIsAddingReminder(true)} />
        
        {/* Banner Container */}
        <div className="h-12 relative z-40">
          <FeedbackBanner />
        </div>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-16">
          {renderTabContent()}
        </main>

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {(isAddingReminder || editingReminder) && (
        <ReminderForm 
          onClose={() => {
            setIsAddingReminder(false);
            setEditingReminder(null);
          }}
          reminderId={editingReminder}
        />
      )}
    </div>
  );
}