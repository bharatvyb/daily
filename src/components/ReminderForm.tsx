import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, RepeatIcon, Trash2, Clock2 } from 'lucide-react';
import { useStore } from '../store';
import { addDays, addMinutes, format, addWeeks, addMonths, addYears, endOfDay, startOfDay, isAfter, isBefore } from 'date-fns';
import { Reminder } from '../types';

interface ReminderFormProps {
  onClose: () => void;
  reminderId?: string | null;
}

export function ReminderForm({ onClose, reminderId }: ReminderFormProps) {
  const { addReminder, updateReminder, deleteReminder, reminders, showBanner, settings } = useStore();
  const existingReminder = reminderId ? reminders.find(r => r.id === reminderId) : null;
  const isCompact = settings.layout === 'compact';
  
  const [title, setTitle] = useState(existingReminder?.title || '');
  const [notes, setNotes] = useState(existingReminder?.notes || '');
  
  const defaultDateTime = existingReminder 
    ? new Date(existingReminder.datetime)
    : addMinutes(new Date(), 10);
    
  const [date, setDate] = useState(format(defaultDateTime, 'yyyy-MM-dd'));
  const [time, setTime] = useState(format(defaultDateTime, 'HH:mm'));
  
  const [recurrence, setRecurrence] = useState<Reminder['recurrence']>(
    existingReminder?.recurrence || { type: 'none' }
  );
  const [showCustomDays, setShowCustomDays] = useState(recurrence.type === 'custom');
  const [showIntervalSettings, setShowIntervalSettings] = useState(recurrence.type === 'per-day');
  const [intervalValue, setIntervalValue] = useState(recurrence.interval?.value || 30);

  // For per-day reminders, default end date is end of current day
  // For other recurring reminders, default is 30 days from start date
  const getDefaultEndDate = () => {
    if (recurrence.type === 'per-day') {
      return format(endOfDay(new Date(date)), 'yyyy-MM-dd');
    }
    return format(addDays(new Date(date), 30), 'yyyy-MM-dd');
  };

  const [endDate, setEndDate] = useState(
    recurrence.endDate 
      ? format(new Date(recurrence.endDate), 'yyyy-MM-dd')
      : getDefaultEndDate()
  );

  // Update end date when recurrence type changes
  useEffect(() => {
    setEndDate(getDefaultEndDate());
  }, [recurrence.type, date]);

  const generateRecurringDates = (startDate: Date, endDate: Date, recurrenceType: string, customDays?: number[], interval?: { value: number; unit: 'minutes' }): Date[] => {
    const dates: Date[] = [];
    const now = new Date();
    
    if (recurrenceType === 'per-day') {
      if (!interval) return dates;

      // For per-day reminders, generate all occurrences for each day
      let currentDate = startOfDay(startDate);
      const endDateTime = endOfDay(endDate);
      
      // Set the initial time from the time input
      const [hours, minutes] = time.split(':').map(Number);
      currentDate.setHours(hours, minutes, 0, 0);

      // If start time is in the past for today, move to the next interval that hasn't occurred yet
      if (isBefore(currentDate, now)) {
        const minutesSinceStart = Math.floor((now.getTime() - currentDate.getTime()) / (1000 * 60));
        const intervalsToSkip = Math.ceil(minutesSinceStart / interval.value);
        currentDate = addMinutes(currentDate, intervalsToSkip * interval.value);
      }

      while (currentDate <= endDateTime) {
        dates.push(new Date(currentDate));
        currentDate = addMinutes(currentDate, interval.value);

        // If we've moved to the next day, reset to the start time
        if (currentDate.getDate() !== dates[dates.length - 1].getDate()) {
          currentDate = startOfDay(currentDate);
          currentDate.setHours(hours, minutes, 0, 0);
        }
      }

      return dates;
    }

    // Handle other recurrence types
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      
      switch (recurrenceType) {
        case 'daily':
          currentDate = addDays(currentDate, 1);
          break;
        case 'alternate':
          currentDate = addDays(currentDate, 2);
          break;
        case 'weekly':
          currentDate = addWeeks(currentDate, 1);
          break;
        case 'monthly':
          currentDate = addMonths(currentDate, 1);
          break;
        case 'yearly':
          currentDate = addYears(currentDate, 1);
          break;
        case 'custom':
          if (customDays?.length) {
            const currentDay = currentDate.getDay();
            const nextDayIndex = customDays.findIndex(day => day > currentDay);
            if (nextDayIndex !== -1) {
              currentDate = addDays(currentDate, customDays[nextDayIndex] - currentDay);
            } else {
              currentDate = addDays(currentDate, 7 - currentDay + customDays[0]);
            }
          }
          break;
      }
    }
    
    return dates;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const baseDateTime = new Date(`${date}T${time}`);
    const endDateTime = new Date(`${endDate}T${time}`);
    
    const recurrenceConfig = {
      ...recurrence,
      endDate: recurrence.type !== 'none' ? endDateTime : undefined,
      interval: recurrence.type === 'per-day' ? { value: intervalValue, unit: 'minutes' as const } : undefined
    };

    if (existingReminder) {
      updateReminder(existingReminder.id, {
        title,
        notes,
        datetime: baseDateTime,
        recurrence: recurrenceConfig
      });
      showBanner('✨ Reminder updated successfully!', 'success');
    } else {
      if (recurrence.type === 'none') {
        addReminder({
          title,
          notes,
          datetime: baseDateTime,
          recurrence: { type: 'none' },
          completed: false
        });
      } else {
        const dates = generateRecurringDates(
          baseDateTime,
          endDateTime,
          recurrence.type,
          recurrence.customDays,
          recurrenceConfig.interval
        );
        
        dates.forEach(date => {
          addReminder({
            title,
            notes,
            datetime: date,
            recurrence: recurrenceConfig,
            completed: false
          });
        });
        
        showBanner(`✨ Created ${dates.length} recurring reminders!`, 'success');
      }
    }
    
    onClose();
  };

  const handleDelete = () => {
    if (existingReminder) {
      if (recurrence.type !== 'none') {
        // Delete all future recurring reminders
        reminders
          .filter(r => 
            r.title === existingReminder.title && 
            new Date(r.datetime) >= new Date(existingReminder.datetime)
          )
          .forEach(r => deleteReminder(r.id));
      } else {
        deleteReminder(existingReminder.id);
      }
      onClose();
    }
  };

  const recurrenceOptions = [
    { label: 'None', value: 'none' },
    { label: 'Per Day', value: 'per-day' },
    { label: 'Daily', value: 'daily' },
    { label: 'Alternate', value: 'alternate' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' },
    { label: 'Custom', value: 'custom' }
  ];

  const weekDays = [
    { short: 'S', long: 'Sunday', value: 0 },
    { short: 'M', long: 'Monday', value: 1 },
    { short: 'T', long: 'Tuesday', value: 2 },
    { short: 'W', long: 'Wednesday', value: 3 },
    { short: 'Th', long: 'Thursday', value: 4 },
    { short: 'F', long: 'Friday', value: 5 },
    { short: 'S', long: 'Saturday', value: 6 }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-[32px] shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className={`border-b border-gray-100 ${isCompact ? 'p-4' : 'p-6'}`}>
          <div className="flex justify-between items-center">
            <h2 className={`font-semibold text-gray-900 ${isCompact ? 'text-lg' : 'text-2xl'}`}>
              {existingReminder ? 'Edit Reminder' : 'New Reminder'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className={`hover:bg-gray-100 rounded-full transition-colors ${isCompact ? 'p-1.5' : 'p-2'}`}
            >
              <X size={isCompact ? 18 : 24} className="text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className={`space-y-4 ${isCompact ? 'p-4' : 'p-6'}`}>
            {/* Title Input */}
            <div className="space-y-1.5">
              <label htmlFor="title" className={`block font-medium text-gray-700 ${isCompact ? 'text-sm' : 'text-base'}`}>
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What do you want to remember?"
                required
                className={`
                  w-full border-0 bg-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400
                  ${isCompact ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-base'}
                `}
              />
            </div>

            {/* Notes Input */}
            <div className="space-y-1.5">
              <label htmlFor="notes" className={`block font-medium text-gray-700 ${isCompact ? 'text-sm' : 'text-base'}`}>
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add additional details..."
                rows={isCompact ? 2 : 3}
                className={`
                  w-full border-0 bg-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-gray-400
                  ${isCompact ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-base'}
                `}
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="date" className={`block font-medium text-gray-700 ${isCompact ? 'text-sm' : 'text-base'}`}>
                  Start Date
                </label>
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 ${isCompact ? 'left-2.5' : 'left-4'}`}>
                    <Calendar size={isCompact ? 16 : 20} />
                  </div>
                  <input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className={`
                      w-full border-0 bg-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500
                      ${isCompact ? 'pl-8 pr-3 py-2 text-sm' : 'pl-12 pr-4 py-3 text-base'}
                    `}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="time" className={`block font-medium text-gray-700 ${isCompact ? 'text-sm' : 'text-base'}`}>
                  Time
                </label>
                <div className="relative">
                  <div className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isCompact ? 'left-2.5' : 'left-4'}`}>
                    <Clock size={isCompact ? 16 : 20} />
                  </div>
                  <input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className={`
                      w-full border-0 bg-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500
                      ${isCompact ? 'pl-8 pr-3 py-2 text-sm' : 'pl-12 pr-4 py-3 text-base'}
                    `}
                  />
                </div>
              </div>
            </div>

            {/* Recurrence */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RepeatIcon size={isCompact ? 16 : 20} className="text-gray-400" />
                <span className={`font-medium text-gray-700 ${isCompact ? 'text-sm' : 'text-base'}`}>Repeat</span>
              </div>
              <div className={`grid gap-2 ${isCompact ? 'grid-cols-4' : 'grid-cols-3'}`}>
                {recurrenceOptions.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setRecurrence({ type: value as any });
                      setShowCustomDays(value === 'custom');
                      setShowIntervalSettings(value === 'per-day');
                    }}
                    className={`
                      rounded-xl font-medium truncate transition-colors
                      ${isCompact ? 'py-2 px-2 text-xs' : 'py-2.5 px-3 text-sm'}
                      ${recurrence.type === value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Per-day Interval Settings */}
            {showIntervalSettings && (
              <div className={`bg-gray-50 rounded-xl ${isCompact ? 'p-3' : 'p-4'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock2 size={isCompact ? 16 : 20} className="text-gray-400" />
                  <h3 className={`font-medium text-gray-700 ${isCompact ? 'text-sm' : 'text-base'}`}>
                    Repeat Every
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={intervalValue}
                    onChange={(e) => setIntervalValue(Number(e.target.value))}
                    className={`
                      flex-1 border-0 bg-white rounded-xl focus:ring-2 focus:ring-blue-500
                      ${isCompact ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-base'}
                    `}
                  >
                    <option value="5">5 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                    <option value="180">3 hours</option>
                    <option value="240">4 hours</option>
                    <option value="360">6 hours</option>
                  </select>
                </div>
                <p className={`mt-2 text-gray-500 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                  Reminders will repeat at this interval during each day
                </p>
              </div>
            )}

            {/* End Date (for recurring reminders) */}
            {recurrence.type !== 'none' && (
              <div className="space-y-1.5">
                <label htmlFor="endDate" className={`block font-medium text-gray-700 ${isCompact ? 'text-sm' : 'text-base'}`}>
                  End Date
                </label>
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 ${isCompact ? 'left-2.5' : 'left-4'}`}>
                    <Calendar size={isCompact ? 16 : 20} />
                  </div>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={date}
                    required
                    className={`
                      w-full border-0 bg-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500
                      ${isCompact ? 'pl-8 pr-3 py-2 text-sm' : 'pl-12 pr-4 py-3 text-base'}
                    `}
                  />
                </div>
              </div>
            )}

            {/* Custom Days Selection */}
            {showCustomDays && (
              <div className={`bg-gray-50 rounded-xl ${isCompact ? 'p-3' : 'p-4'}`}>
                <h3 className={`font-medium text-gray-700 mb-2 ${isCompact ? 'text-sm' : 'text-base'}`}>Select Days</h3>
                <div className="grid grid-cols-7 gap-1.5">
                  {weekDays.map(({ short, long, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        const currentDays = recurrence.customDays || [];
                        const newDays = currentDays.includes(value)
                          ? currentDays.filter(d => d !== value)
                          : [...currentDays, value];
                        setRecurrence({ type: 'custom', customDays: newDays });
                      }}
                      className={`
                        rounded-lg font-medium transition-colors
                        ${isCompact ? 'p-2 text-xs' : 'p-2.5 text-sm'}
                        ${recurrence.customDays?.includes(value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 shadow-sm'
                        }
                      `}
                      title={long}
                    >
                      {short}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className={`border-t border-gray-100 ${isCompact ? 'p-4' : 'p-6'}`}>
            <div className="flex gap-3">
              {existingReminder && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className={`
                    flex-1 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition-colors
                    flex items-center justify-center gap-2
                    ${isCompact ? 'py-2.5 text-sm' : 'py-3.5 text-base'}
                  `}
                >
                  <Trash2 size={isCompact ? 16 : 20} />
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`
                  flex-1 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors
                  ${isCompact ? 'py-2.5 text-sm' : 'py-3.5 text-base'}
                `}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`
                  flex-1 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors
                  ${isCompact ? 'py-2.5 text-sm' : 'py-3.5 text-base'}
                `}
              >
                {existingReminder ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}