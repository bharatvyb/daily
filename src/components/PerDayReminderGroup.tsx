import React, { useEffect, useMemo, useState } from 'react';
import { format, isToday, addMinutes, startOfDay, endOfDay, isSameMinute, isBefore, isAfter } from 'date-fns';
import { Reminder } from '../types';
import { useStore } from '../store';
import { Clock, ChevronRight, Eye, CheckCircle2, Check, X } from 'lucide-react';

interface PerDayReminderGroupProps {
  reminders: Reminder[];
  onEditReminder: (id: string) => void;
}

interface RemainingTasksModalProps {
  reminders: Reminder[];
  onClose: () => void;
  title: string;
  interval: number;
  onComplete: (id: string) => void;
}

function RemainingTasksModal({ reminders, onClose, title, interval, onComplete }: RemainingTasksModalProps) {
  const now = new Date();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">Every {interval} minutes</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto">
          <div className="grid gap-2">
            {reminders.map(reminder => {
              const reminderDate = new Date(reminder.datetime);
              const isPast = isBefore(reminderDate, now);
              const isOverdue = isPast && !reminder.completed;

              return (
                <div
                  key={reminder.id}
                  className={`
                    flex items-center gap-2 p-3 rounded-xl transition-all duration-200
                    ${reminder.completed 
                      ? 'bg-green-50 text-green-700' 
                      : isOverdue
                        ? 'bg-red-50 text-red-700'
                        : 'bg-gray-50 text-gray-700'
                    }
                  `}
                >
                  {reminder.completed ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <Clock size={16} className={isOverdue ? 'text-red-400' : 'text-gray-400'} />
                  )}
                  <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                    {format(reminderDate, 'h:mm a')}
                  </span>
                  {!reminder.completed && (
                    <button
                      onClick={() => onComplete(reminder.id)}
                      className="ml-auto p-1 hover:bg-white/50 rounded-lg transition-colors"
                    >
                      <Check size={14} className={isOverdue ? 'text-red-500' : 'text-gray-500'} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PerDayReminderGroup({ reminders, onEditReminder }: PerDayReminderGroupProps) {
  const { settings, updateReminder, addReminder, showBanner } = useStore();
  const isCompact = settings.layout === 'compact';
  const [showRemainingTasks, setShowRemainingTasks] = useState<string | null>(null);
  const [completingAll, setCompletingAll] = useState<string | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Group reminders by title
  const groupedReminders = useMemo(() => {
    return reminders.reduce((acc, reminder) => {
      const key = reminder.title;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(reminder);
      return acc;
    }, {} as Record<string, Reminder[]>);
  }, [reminders]);

  const calculateTimeSlots = (baseReminder: Reminder) => {
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(today);
    const interval = baseReminder.recurrence.interval?.value || 30;
    
    const slots: Date[] = [];
    let currentTime = new Date(today);
    
    // Set initial time from the first reminder
    const [hours, minutes] = format(new Date(baseReminder.datetime), 'HH:mm').split(':').map(Number);
    currentTime.setHours(hours, minutes, 0, 0);
    
    // Generate all slots for the day
    while (currentTime <= todayEnd) {
      slots.push(new Date(currentTime));
      currentTime = addMinutes(currentTime, interval);
    }
    
    return slots.sort((a, b) => a.getTime() - b.getTime());
  };

  // Effect to ensure we have reminders for all slots
  useEffect(() => {
    Object.values(groupedReminders).forEach(group => {
      if (group.length === 0) return;
      
      const baseReminder = group[0];
      const slots = calculateTimeSlots(baseReminder);
      
      slots.forEach(slot => {
        const existingReminder = group.find(r => 
          isSameMinute(new Date(r.datetime), slot)
        );
        
        if (!existingReminder) {
          addReminder({
            ...baseReminder,
            id: undefined,
            datetime: slot,
            completed: false
          });
        }
      });
    });
  }, [groupedReminders, addReminder]);

  const getRelevantReminders = (reminders: Reminder[]) => {
    const now = new Date();
    const slots = calculateTimeSlots(reminders[0]);
    const totalSlots = slots.length;
    
    // Get all reminders for today's slots
    const todayReminders = reminders
      .filter(r => isToday(new Date(r.datetime)))
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    
    // Count completed slots
    const completedCount = todayReminders.filter(r => r.completed).length;
    
    // Get the next three slots including current and upcoming
    const currentAndUpcoming = todayReminders
      .filter(r => !r.completed || isBefore(new Date(r.datetime), now))
      .slice(0, 3);
    
    return {
      displayReminders: currentAndUpcoming,
      allReminders: todayReminders,
      totalSlots,
      completedCount
    };
  };

  const handleCompleteAll = async (title: string, reminders: Reminder[]) => {
    const incompleteReminders = reminders.filter(r => 
      !r.completed && isToday(new Date(r.datetime))
    );
    
    if (incompleteReminders.length === 0) return;

    setCompletingAll(title);
    
    // Start the progress bar animation
    const startTime = Date.now();
    const duration = 2000; // 2 seconds for the animation

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setAnimationProgress(progress * 100);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // After animation completes, mark all tasks as done at once
        incompleteReminders.forEach(reminder => {
          updateReminder(reminder.id, { completed: true, silent: true });
        });

        // Show completion messages
        showBanner('🎉 All tasks marked as complete!', 'success');
        setTimeout(() => {
          showBanner(`✨ Completed ${incompleteReminders.length} tasks for "${title}"!`, 'success');
        }, 300);

        // Reset animation state
        setTimeout(() => {
          setCompletingAll(null);
          setAnimationProgress(0);
        }, 100);
      }
    };

    requestAnimationFrame(animate);
  };

  const handleCompleteReminder = (id: string) => {
    updateReminder(id, { completed: true });
  };

  return (
    <div className="space-y-3">
      {Object.entries(groupedReminders).map(([title, groupReminders]) => {
        const { displayReminders, allReminders, totalSlots, completedCount } = getRelevantReminders(groupReminders);
        const progress = completingAll === title ? animationProgress : (completedCount / totalSlots) * 100;
        const interval = groupReminders[0].recurrence.interval?.value || 30;
        const now = new Date();

        return (
          <div key={`group-${title}`} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="text-blue-500 shrink-0" size={16} />
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-gray-900 text-sm truncate">{title}</h3>
                <p className="text-xs text-gray-500">Every {interval} minutes</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCompleteAll(title, groupReminders)}
                  disabled={completingAll !== null}
                  className={`
                    flex items-center gap-1.5 py-1 px-2 rounded-lg text-xs font-medium 
                    transition-colors
                    ${completingAll === null
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  <CheckCircle2 size={14} />
                  Complete All
                </button>
                <button
                  onClick={() => onEditReminder(groupReminders[0].id)}
                  className="flex items-center gap-1.5 py-1 px-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-700 transition-colors"
                >
                  <Eye size={14} />
                  View
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs font-medium text-blue-600">
                  {completedCount} of {totalSlots} completed
                </div>
                <div className="text-xs font-medium text-blue-600">
                  {Math.round(progress)}%
                </div>
              </div>
              <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${progress}%` }}
                  className="h-full bg-blue-500 transition-all duration-300"
                />
              </div>
            </div>

            {/* Time slots */}
            <div className="grid grid-cols-3 gap-1.5">
              {displayReminders.map((reminder, index) => {
                const reminderDate = new Date(reminder.datetime);
                const isPast = isBefore(reminderDate, now);
                const isOverdue = isPast && !reminder.completed;
                const isClickable = isPast && !reminder.completed;
                
                return (
                  <button
                    key={reminder.id}
                    onClick={() => {
                      if (isClickable) {
                        updateReminder(reminder.id, { completed: true });
                      }
                    }}
                    disabled={!isClickable || completingAll !== null}
                    className={`
                      group relative flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-xs
                      transition-all duration-200
                      ${reminder.completed 
                        ? 'bg-green-500 text-white shadow-sm cursor-default' 
                        : isOverdue
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer'
                          : isPast
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                            : 'bg-gray-100 text-gray-500 cursor-default'
                      }
                      ${completingAll !== null ? 'opacity-50' : ''}
                    `}
                  >
                    {reminder.completed ? (
                      <Check size={12} className="shrink-0" />
                    ) : (
                      <Clock size={12} className={`shrink-0 ${isOverdue ? 'text-red-400' : 'text-gray-400'}`} />
                    )}
                    <span>{format(reminderDate, 'h:mm a')}</span>
                    {/* Status Indicator */}
                    <span 
                      className={`
                        absolute -top-1 -right-1 w-2 h-2 rounded-full
                        ${reminder.completed 
                          ? 'bg-green-500'
                          : isOverdue
                            ? 'bg-red-500'
                            : index === 0 
                              ? 'bg-blue-500'
                              : index === 1 
                                ? 'bg-yellow-400'
                                : 'bg-gray-300'
                        }
                      `} 
                    />
                  </button>
                );
              })}
            </div>

            {totalSlots > displayReminders.length && (
              <button
                onClick={() => setShowRemainingTasks(title)}
                className="mt-2 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
              >
                <ChevronRight size={12} />
                <span>{totalSlots - displayReminders.length} more today</span>
              </button>
            )}

            {/* Remaining Tasks Modal */}
            {showRemainingTasks === title && (
              <RemainingTasksModal
                reminders={allReminders}
                onClose={() => setShowRemainingTasks(null)}
                title={title}
                interval={interval}
                onComplete={handleCompleteReminder}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}