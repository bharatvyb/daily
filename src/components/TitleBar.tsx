import React from 'react';
import { Plus } from 'lucide-react';
import { useStore } from '../store';

interface TitleBarProps {
  onAddClick: () => void;
}

export function TitleBar({ onAddClick }: TitleBarProps) {
  const { settings } = useStore();

  return (
    <div className="bg-white shadow-sm relative z-50">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-xl text-white">{settings.appIcon}</span>
          </div>
          <h1 className="text-xl font-semibold">Daily</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Hello, {settings.name}!</span>
          <button
            onClick={onAddClick}
            className="relative z-50 p-2 text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}