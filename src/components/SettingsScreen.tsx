import React, { useState } from 'react';
import { User, Smile, X, LayoutGrid, LayoutList, Sparkles } from 'lucide-react';
import { useStore } from '../store';

export function SettingsScreen() {
  const { settings, updateSettings } = useStore();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempName, setTempName] = useState(settings.name);
  const [tempIcon, setTempIcon] = useState(settings.appIcon);

  const handleSaveProfile = () => {
    updateSettings({ name: tempName, appIcon: tempIcon });
    setIsEditingProfile(false);
  };

  const toggleLayout = () => {
    updateSettings({ layout: settings.layout === 'compact' ? 'flexible' : 'compact' });
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* App Personalization Card */}
      <div className="bg-blue-50 rounded-3xl p-4">
        <button
          onClick={() => setIsEditingProfile(true)}
          className="w-full flex items-start gap-4"
        >
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
            <span className="text-2xl text-white">{settings.appIcon}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-blue-900">App Personalization</h3>
            <div className="flex items-center gap-2 text-blue-700 mt-1">
              <User size={18} />
              <span>{settings.name}</span>
            </div>
          </div>
        </button>
      </div>

      {/* Layout Settings Card */}
      <div className="bg-white rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.layout === 'compact' ? (
              <LayoutList size={24} className="text-gray-600" />
            ) : (
              <LayoutGrid size={24} className="text-gray-600" />
            )}
            <div>
              <h3 className="font-medium text-gray-900">Layout Style</h3>
              <p className="text-sm text-gray-500">
                {settings.layout === 'compact' ? 'Compact view' : 'Flexible view'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleLayout}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              settings.layout === 'compact'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {settings.layout === 'compact' ? 'Switch to Flexible' : 'Switch to Compact'}
          </button>
        </div>
      </div>

      {/* Company Info Card */}
      <div className="bg-white rounded-3xl p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-blue-600">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">BharatVyb AI Solutions</h3>
            <p className="text-sm text-gray-500">Version 3.0.0</p>
          </div>
        </div>
        <div className="text-sm text-gray-500 mt-2">
          © 2025 BharatVyb AI Solutions. All rights reserved.
        </div>
        <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
          Made with <span className="text-red-500">❤️</span> in India
        </div>
      </div>

      {/* Profile Edit Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
          <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-[32px] shadow-modal">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">App Personalization</h2>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">App Icon</h3>
                  <div className="grid grid-cols-5 gap-4">
                    {['💰', '💵', '🏦', '💳', '💲', '🪙', '📊', '📈', '💹', '🏧'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => setTempIcon(emoji)}
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${
                          tempIcon === emoji ? 'bg-blue-100' : 'bg-gray-100'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-lg font-medium mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full px-4 py-3 text-lg border-0 bg-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your name"
                  />
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="w-full py-4 bg-blue-600 text-white text-lg font-medium rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}