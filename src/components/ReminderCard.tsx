import React from 'react';
import { Check, Eye, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { Reminder } from '../types';
import { useStore } from '../store';

interface ReminderCardProps {
  reminder: Reminder;
  onView: (id: string) => void;
  onArchive?: (id: string) => void;
  onToggleComplete?: (id: string, data: Partial<Reminder>) => void;
  showArchiveButton?: boolean;
  screenType?: 'today' | 'next' | 'past';
}

export function ReminderCard({ 
  reminder, 
  onView, 
  onArchive, 
  onToggleComplete, 
  showArchiveButton,
  screenType = 'today'
}: ReminderCardProps) {
  const { settings } = useStore();
  const isCompact = settings.layout === 'compact';

  return (
    <div className={`
      bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow
      ${isCompact ? 'p-2.5 h-[72px]' : 'p-5'} 
    `}>
      <div className="flex items-center justify-between gap-3 h-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`
              font-medium truncate
              ${reminder.completed ? 'text-gray-400 line-through' : 'text-gray-900'}
              ${isCompact ? 'text-sm' : 'text-lg'}
            `}>
              {reminder.title}
            </h3>
            {reminder.recurrence.type !== 'none' && (
              <span className={`
                text-gray-500 capitalize shrink-0
                ${isCompact ? 'text-[11px]' : 'text-sm'}
              `}>
                • {reminder.recurrence.type}
              </span>
            )}
          </div>
          <div className={`
            flex items-center gap-2 text-gray-500 mt-1
            ${isCompact ? 'text-[11px]' : 'text-sm'}
          `}>
            {isCompact ? (
              <>
                <span>{format(new Date(reminder.datetime), 'MMM d, h:mm a')}</span>
                {reminder.notes && (
                  <>
                    <span>•</span>
                    <span className="truncate">{reminder.notes}</span>
                  </>
                )}
              </>
            ) : (
              <>
                <span>{format(new Date(reminder.datetime), 'MMM d, yyyy')}</span>
                <span>•</span>
                <span>{format(new Date(reminder.datetime), 'h:mm a')}</span>
                {reminder.notes && (
                  <p className="mt-1 text-gray-600 line-clamp-2">{reminder.notes}</p>
                )}
              </>
            )}
          </div>
        </div>
        <div className={`
          flex items-center shrink-0
          ${isCompact ? 'gap-1' : 'gap-2'}
        `}>
          {/* Show mark as complete button only in Today screen */}
          {screenType === 'today' && onToggleComplete && (
            <button
              onClick={() => onToggleComplete(reminder.id, { completed: !reminder.completed })}
              className={`
                rounded-xl transition-colors
                ${isCompact ? 'p-1.5' : 'p-2.5'}
                ${reminder.completed
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-400 hover:text-gray-600'
                }
              `}
            >
              <Check size={isCompact ? 16 : 20} strokeWidth={2.5} />
            </button>
          )}

          {/* Show view button for all screens */}
          <button
            onClick={() => onView(reminder.id)}
            className={`
              bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors
              ${isCompact ? 'p-1.5' : 'p-2.5'}
            `}
          >
            <Eye size={isCompact ? 16 : 20} strokeWidth={2.5} />
          </button>

          {/* Show archive button only in Past screen when showArchiveButton is true */}
          {screenType === 'past' && showArchiveButton && onArchive && (
            <button
              onClick={() => onArchive(reminder.id)}
              className={`
                bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors
                ${isCompact ? 'p-1.5' : 'p-2.5'}
              `}
            >
              <Archive size={isCompact ? 16 : 20} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}