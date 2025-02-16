import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { getTimeOfDay } from '../utils/dateUtils';

interface BannerItemProps {
  message: string;
  type: 'success' | 'info';
  onExited?: () => void;
}

function BannerItem({ message, type, onExited }: BannerItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, 4700); // Start exit animation slightly before removal

    return () => clearTimeout(timer);
  }, []);

  const handleAnimationEnd = (e: React.AnimationEvent) => {
    if (e.animationName === 'slideOutUp' && onExited) {
      onExited();
    }
  };

  return (
    <div
      className={`absolute inset-x-0 px-4 py-3 text-center ${
        isExiting ? 'banner-exit' : 'banner-enter'
      } ${
        type === 'success'
          ? 'bg-gradient-to-r from-green-500 to-green-600'
          : 'bg-gradient-to-r from-blue-500 to-blue-600'
      } text-white shadow-sm`}
      onAnimationEnd={handleAnimationEnd}
    >
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function FeedbackBanner() {
  const { bannerMessages, settings, shouldShowGreeting, updateLastGreetingShown } = useStore();
  const [showGreeting, setShowGreeting] = useState(false);
  const timeOfDay = getTimeOfDay();

  useEffect(() => {
    if (shouldShowGreeting()) {
      setShowGreeting(true);
      updateLastGreetingShown();
    }
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {showGreeting && (
        <BannerItem
          message={`Good ${timeOfDay}, ${settings.name}! ✨`}
          type="info"
          onExited={() => setShowGreeting(false)}
        />
      )}
      
      {bannerMessages.map((message) => (
        <BannerItem
          key={message.id}
          message={message.text}
          type={message.type}
          onExited={() => {/* Banner removal is handled by the store */}}
        />
      ))}
    </div>
  );
}