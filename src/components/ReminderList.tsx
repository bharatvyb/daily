import React, { useState, useEffect, useMemo } from 'react';
import { format, isToday, isTomorrow, isAfter, isBefore, startOfDay, endOfWeek, isWithinInterval, addDays } from 'date-fns';
import { useStore } from '../store';
import { ReminderCard } from './ReminderCard';
import { Reminder } from '../types';
import { PerDayReminderGroup } from './PerDayReminderGroup';
import { Eye, Archive } from 'lucide-react';

interface ReminderListProps {
  type: 'today' | 'next' | 'past';
  onEditReminder: (id: string) => void;
}

interface CompletedPerDayReminder {
  title: string;
  completedCount: number;
  totalCount: number;
  datetime: Date;
  id: string;
}

export function ReminderList({ type, onEditReminder }: ReminderListProps) {
  const { reminders, updateReminder, archiveReminder, cleanupArchivedReminders, settings } = useStore();
  const [showArchived, setShowArchived] = useState(false);
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = startOfDay(new Date(today));
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isCompact = settings.layout === 'compact';

  // Clean up old archived reminders
  useEffect(() => {
    cleanupArchivedReminders();
  }, []);

  const nextSections = useMemo(() => {
    if (type !== 'next') return null;

    const endOfCurrentWeek = endOfWeek(today);

    const thisWeekReminders = reminders
      .filter(r => {
        const reminderDate = new Date(r.datetime);
        return !r.archived && 
               !r.completed && 
               isWithinInterval(reminderDate, {
                 start: tomorrow,
                 end: endOfCurrentWeek
               });
      })
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

    const futureReminders = reminders
      .filter(r => {
        const reminderDate = new Date(r.datetime);
        return !r.archived && 
               !r.completed && 
               isAfter(reminderDate, endOfCurrentWeek);
      })
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

    return {
      thisWeek: thisWeekReminders,
      future: futureReminders
    };
  }, [reminders, today, tomorrow]);

  const filteredReminders = useMemo(() => {
    return reminders.filter(reminder => {
      const reminderDate = startOfDay(new Date(reminder.datetime));
      switch (type) {
        case 'next':
          return (isTomorrow(reminderDate) || reminderDate > tomorrow) && !reminder.archived && !reminder.completed;
        case 'past':
          if (showArchived) {
            return reminder.archived;
          }
          return !reminder.archived && reminder.completed;
        default:
          return false;
      }
    }).sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }, [reminders, type, today, tomorrow, showArchived]);

  const getCompletedPerDayReminders = (reminders: Reminder[], forToday: boolean = false) => {
    // Group per-day reminders by title
    const perDayGroups = reminders.reduce((acc, reminder) => {
      if (reminder.recurrence.type === 'per-day') {
        const date = startOfDay(new Date(reminder.datetime));
        const key = `${reminder.title}-${date.getTime()}`;
        
        if (!acc[key]) {
          acc[key] = {
            title: reminder.title,
            date,
            reminders: []
          };
        }
        acc[key].reminders.push(reminder);
      }
      return acc;
    }, {} as Record<string, { title: string; date: Date; reminders: Reminder[] }>);

    // Convert groups to CompletedPerDayReminder format
    return Object.values(perDayGroups)
      .filter(group => {
        const isForToday = isToday(group.date);
        return forToday ? isForToday : !isForToday;
      })
      .filter(group => {
        // Only include groups where all reminders are completed
        return group.reminders.every(r => r.completed);
      })
      .map(group => ({
        title: group.title,
        completedCount: group.reminders.filter(r => r.completed).length,
        totalCount: group.reminders.length,
        datetime: group.reminders[0].datetime,
        id: group.reminders[0].id
      }));
  };

  const todaySections = useMemo(() => {
    if (type !== 'today') return null;

    // Get all per-day reminders
    const allPerDayReminders = reminders.filter(r => 
      isToday(new Date(r.datetime)) && 
      !r.archived && 
      r.recurrence.type === 'per-day'
    );

    // Get active per-day reminders (not all completed)
    const activePerDayReminders = allPerDayReminders.filter(r => {
      const groupReminders = allPerDayReminders.filter(gr => gr.title === r.title);
      return !groupReminders.every(gr => gr.completed);
    });

    const regularReminders = reminders.filter(r => 
      r.recurrence.type !== 'per-day'
    );

    const todayUncompleted = regularReminders.filter(r => 
      isToday(new Date(r.datetime)) && !r.archived && !r.completed
    );

    const pastUncompleted = regularReminders.filter(r => 
      isBefore(new Date(r.datetime), today) && !r.archived && !r.completed
    );

    // Get completed regular reminders and completed per-day groups
    const completedRegularReminders = regularReminders.filter(r => 
      isToday(new Date(r.datetime)) && !r.archived && r.completed
    );

    const completedPerDayReminders = getCompletedPerDayReminders(allPerDayReminders, true);

    return {
      perDayReminders: activePerDayReminders,
      todayUncompleted,
      pastUncompleted,
      completedRegularReminders,
      completedPerDayReminders
    };
  }, [reminders, type, today]);

  const pastSections = useMemo(() => {
    if (type !== 'past' || showArchived) return null;

    const completedRegularToday = reminders.filter(r => 
      isToday(new Date(r.datetime)) && !r.archived && r.completed && r.recurrence.type !== 'per-day'
    );

    const completedPerDayToday = getCompletedPerDayReminders(reminders, true);

    const completedRegularPast = reminders.filter(r => 
      isBefore(new Date(r.datetime), today) && !r.archived && r.completed && r.recurrence.type !== 'per-day'
    );

    const completedPerDayPast = getCompletedPerDayReminders(reminders, false);

    const completedRegularFuture = reminders.filter(r => 
      isAfter(new Date(r.datetime), today) && !r.archived && r.completed && r.recurrence.type !== 'per-day'
    );

    return {
      today: {
        regular: completedRegularToday,
        perDay: completedPerDayToday
      },
      past: {
        regular: completedRegularPast,
        perDay: completedPerDayPast
      },
      future: {
        regular: completedRegularFuture
      }
    };
  }, [reminders, type, today, showArchived]);

  const renderCompletedPerDayReminder = (reminder: CompletedPerDayReminder) => (
    <div key={reminder.id} className="bg-white rounded-xl p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">{reminder.title}</h3>
          <p className="text-xs text-gray-500 mt-1">
            Completed {reminder.completedCount}/{reminder.totalCount} tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEditReminder(reminder.id)}
            className="p-1.5 bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
          >
            <Eye size={16} strokeWidth={2.5} />
          </button>
          {!showArchived && (
            <button
              onClick={() => archiveReminder(reminder.id)}
              className="p-1.5 bg-gray-100 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
            >
              <Archive size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderReminderList = (reminders: Reminder[], screenType: 'today' | 'next' | 'past') => (
    <div className={`grid gap-3 ${isCompact ? 'grid-cols-1' : 'grid-cols-1'}`}>
      {reminders.map(reminder => (
        <ReminderCard
          key={reminder.id}
          reminder={reminder}
          onView={onEditReminder}
          onToggleComplete={screenType === 'today' ? updateReminder : undefined}
          onArchive={screenType === 'past' ? archiveReminder : undefined}
          showArchiveButton={screenType === 'past' && !showArchived}
          screenType={screenType}
        />
      ))}
    </div>
  );

  if (type === 'today') {
    return (
      <div className={`space-y-6 ${isCompact ? 'p-3' : 'p-4'}`}>
        {todaySections && (
          <>
            {/* Per-day Reminders Section */}
            {todaySections.perDayReminders.length > 0 && (
              <div className="rounded-2xl overflow-hidden bg-indigo-50 border border-indigo-100">
                <div className={`px-4 ${isCompact ? 'py-2' : 'py-3'}`}>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium text-indigo-900 ${isCompact ? 'text-base' : 'text-lg'}`}>
                      Recurring Tasks
                    </h3>
                    <span className="text-sm bg-white/50 px-2 py-0.5 rounded-full text-indigo-700">
                      {todaySections.perDayReminders.length}
                    </span>
                  </div>
                </div>
                <div className={`${isCompact ? 'p-2' : 'p-4'} pt-0`}>
                  <PerDayReminderGroup 
                    reminders={todaySections.perDayReminders}
                    onEditReminder={onEditReminder}
                  />
                </div>
              </div>
            )}

            {/* Yet to do Section */}
            {todaySections.pastUncompleted.length > 0 && (
              <div className="rounded-2xl overflow-hidden bg-red-50 border border-red-100">
                <div className={`px-4 ${isCompact ? 'py-2' : 'py-3'}`}>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium text-red-900 ${isCompact ? 'text-base' : 'text-lg'}`}>
                      Yet to do
                    </h3>
                    <span className="text-sm bg-white/50 px-2 py-0.5 rounded-full text-red-700">
                      {todaySections.pastUncompleted.length}
                    </span>
                  </div>
                </div>
                <div className={`${isCompact ? 'p-2' : 'p-4'} pt-0`}>
                  {renderReminderList(todaySections.pastUncompleted, 'today')}
                </div>
              </div>
            )}

            {/* Upcoming Today Section */}
            {todaySections.todayUncompleted.length > 0 && (
              <div className="rounded-2xl overflow-hidden bg-blue-50 border border-blue-100">
                <div className={`px-4 ${isCompact ? 'py-2' : 'py-3'}`}>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium text-blue-900 ${isCompact ? 'text-base' : 'text-lg'}`}>
                      Upcoming Today
                    </h3>
                    <span className="text-sm bg-white/50 px-2 py-0.5 rounded-full text-blue-700">
                      {todaySections.todayUncompleted.length}
                    </span>
                  </div>
                </div>
                <div className={`${isCompact ? 'p-2' : 'p-4'} pt-0`}>
                  {renderReminderList(todaySections.todayUncompleted, 'today')}
                </div>
              </div>
            )}

            {/* Completed Today Section */}
            {(todaySections.completedRegularReminders.length > 0 || todaySections.completedPerDayReminders.length > 0) && (
              <div className="rounded-2xl overflow-hidden bg-green-50 border border-green-100">
                <div className={`px-4 ${isCompact ? 'py-2' : 'py-3'}`}>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium text-green-900 ${isCompact ? 'text-base' : 'text-lg'}`}>
                      Completed Today
                    </h3>
                    <span className="text-sm bg-white/50 px-2 py-0.5 rounded-full text-green-700">
                      {todaySections.completedRegularReminders.length + todaySections.completedPerDayReminders.length}
                    </span>
                  </div>
                </div>
                <div className={`${isCompact ? 'p-2' : 'p-4'} pt-0 space-y-3`}>
                  {todaySections.completedPerDayReminders.map(renderCompletedPerDayReminder)}
                  {renderReminderList(todaySections.completedRegularReminders, 'today')}
                </div>
              </div>
            )}

            {Object.values(todaySections).every(section => 
              Array.isArray(section) ? section.length === 0 : true
            ) && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
                <p className="text-lg">No reminders for today</p>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (type === 'past') {
    if (showArchived) {
      return (
        <div className={`space-y-6 ${isCompact ? 'p-3' : 'p-4'}`}>
          <div className="flex justify-between items-center">
            <h2 className={`font-semibold text-gray-900 ${isCompact ? 'text-lg' : 'text-xl'}`}>
              Archived Reminders
            </h2>
            <button
              onClick={() => setShowArchived(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white"
            >
              Show Completed
            </button>
          </div>

          {filteredReminders.length > 0 ? (
            <div className="space-y-3">
              {renderReminderList(filteredReminders, 'past')}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
              <p className="text-lg">No archived reminders</p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`space-y-6 ${isCompact ? 'p-3' : 'p-4'}`}>
        <div className="flex justify-between items-center">
          <h2 className={`font-semibold text-gray-900 ${isCompact ? 'text-lg' : 'text-xl'}`}>
            Past Reminders
          </h2>
          <button
            onClick={() => setShowArchived(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Show Archived
          </button>
        </div>

        {pastSections && (
          <div className="space-y-6">
            {/* Today's Completed Section */}
            {(pastSections.today.regular.length > 0 || pastSections.today.perDay.length > 0) && (
              <div className="rounded-2xl overflow-hidden bg-green-50 border border-green-100">
                <div className={`px-4 ${isCompact ? 'py-2' : 'py-3'}`}>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium text-green-900 ${isCompact ? 'text-base' : 'text-lg'}`}>
                      Completed Today
                    </h3>
                    <span className="text-sm bg-white/50 px-2 py-0.5 rounded-full text-green-700">
                      {pastSections.today.regular.length + pastSections.today.perDay.length}
                    </span>
                  </div>
                </div>
                <div className={`${isCompact ? 'p-2' : 'p-4'} pt-0 space-y-3`}>
                  {pastSections.today.perDay.map(renderCompletedPerDayReminder)}
                  {renderReminderList(pastSections.today.regular, 'past')}
                </div>
              </div>
            )}

            {/* Past Completed Section */}
            {(pastSections.past.regular.length > 0 || pastSections.past.perDay.length > 0) && (
              <div className="rounded-2xl overflow-hidden bg-purple-50 border border-purple-100">
                <div className={`px-4 ${isCompact ? 'py-2' : 'py-3'}`}>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium text-purple-900 ${isCompact ? 'text-base' : 'text-lg'}`}>
                      Past Completed
                    </h3>
                    <span className="text-sm bg-white/50 px-2 py-0.5 rounded-full text-purple-700">
                      {pastSections.past.regular.length + pastSections.past.perDay.length}
                    </span>
                  </div>
                </div>
                <div className={`${isCompact ? 'p-2' : 'p-4'} pt-0 space-y-3`}>
                  {pastSections.past.perDay.map(renderCompletedPerDayReminder)}
                  {renderReminderList(pastSections.past.regular, 'past')}
                </div>
              </div>
            )}

            {/* Future Completed Section */}
            {pastSections.future.regular.length > 0 && (
              <div className="rounded-2xl overflow-hidden bg-blue-50 border border-blue-100">
                <div className={`px-4 ${isCompact ? 'py-2' : 'py-3'}`}>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium text-blue-900 ${isCompact ? 'text-base' : 'text-lg'}`}>
                      Future Completed
                    </h3>
                    <span className="text-sm bg-white/50 px-2 py-0.5 rounded-full text-blue-700">
                      {pastSections.future.regular.length}
                    </span>
                  </div>
                </div>
                <div className={`${isCompact ? 'p-2' : 'p-4'} pt-0`}>
                  {renderReminderList(pastSections.future.regular, 'past')}
                </div>
              </div>
            )}

            {Object.values(pastSections).every(section => 
              Object.values(section).every(subsection => 
                Array.isArray(subsection) ? subsection.length === 0 : true
              )
            ) && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
                <p className="text-lg">No completed reminders</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Next tab
  if (type === 'next') {
    return (
      <div className={`space-y-6 ${isCompact ? 'p-3' : 'p-4'}`}>
        {nextSections && (
          <>
            {/* This Week Section */}
            {nextSections.thisWeek.length > 0 && (
              <div className="rounded-2xl overflow-hidden bg-blue-50 border border-blue-100">
                <div className={`px-4 ${isCompact ? 'py-2' : 'py-3'}`}>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium text-blue-900 ${isCompact ? 'text-base' : 'text-lg'}`}>
                      This Week
                    </h3>
                    <span className="text-sm bg-white/50 px-2 py-0.5 rounded-full text-blue-700">
                      {nextSections.thisWeek.length}
                    </span>
                  </div>
                </div>
                <div className={`${isCompact ? 'p-2' : 'p-4'} pt-0`}>
                  {renderReminderList(nextSections.thisWeek, 'next')}
                </div>
              </div>
            )}

            {/* Future Section */}
            {nextSections.future.length > 0 && (
              <div className="rounded-2xl overflow-hidden bg-purple-50 border border-purple-100">
                <div className={`px-4 ${isCompact ? 'py-2' : 'py-3'}`}>
                  <div className="flex items-center gap-2">
                    <h3 className={`font-medium text-purple-900 ${isCompact ? 'text-base' : 'text-lg'}`}>
                      Future
                    </h3>
                    <span className="text-sm bg-white/50 px-2 py-0.5 rounded-full text-purple-700">
                      {nextSections.future.length}
                    </span>
                  </div>
                </div>
                <div className={`${isCompact ? 'p-2' : 'p-4'} pt-0`}>
                  {renderReminderList(nextSections.future, 'next')}
                </div>
              </div>
            )}

            {Object.values(nextSections).every(section => section.length === 0) && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
                <p className="text-lg">No upcoming reminders</p>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return null;
}