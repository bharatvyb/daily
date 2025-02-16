import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Reminder, UserSettings, BannerMessage } from './types';
import { subDays, startOfDay, format } from 'date-fns';

interface AppState {
  reminders: Reminder[];
  settings: UserSettings;
  bannerMessages: BannerMessage[];
  lastGreetingShown: string | null;
  addReminder: (reminder: Omit<Reminder, 'id'>) => void;
  updateReminder: (id: string, reminder: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  archiveReminder: (id: string) => void;
  cleanupArchivedReminders: () => void;
  showBanner: (text: string, type?: 'success' | 'info') => void;
  removeBanner: (id: string) => void;
  clearBanners: () => void;
  shouldShowGreeting: () => boolean;
  updateLastGreetingShown: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      reminders: [],
      settings: {
        name: 'User',
        appIcon: '📅',
        layout: 'flexible',
      },
      bannerMessages: [],
      lastGreetingShown: null,
      addReminder: (reminder) => {
        const id = crypto.randomUUID();
        set((state) => ({
          reminders: [...state.reminders, { ...reminder, id }],
        }));
        const { showBanner } = get();
        const time = format(new Date(reminder.datetime), 'h:mm a');
        showBanner(`✨ New reminder set for ${time}!`, 'success');
      },
      updateReminder: (id, reminder) => {
        const { showBanner } = get();
        const existingReminder = get().reminders.find(r => r.id === id);
        
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, ...reminder } : r
          ),
        }));

        // Only show completion messages if explicitly requested
        // This prevents spam when bulk completing tasks
        if (reminder.completed !== undefined && existingReminder && !reminder.silent) {
          if (reminder.completed) {
            const time = format(new Date(existingReminder.datetime), 'h:mm a');
            showBanner(`✅ Task completed for ${time}!`, 'success');
          } else {
            showBanner('🔄 Task marked as incomplete', 'info');
          }
        } else if (!('completed' in reminder)) {
          // Only show generic update message if we're not updating completion status
          showBanner('✨ Reminder updated successfully!');
        }
      },
      deleteReminder: (id) => {
        // Get the reminder before deleting it
        const reminder = get().reminders.find(r => r.id === id);
        if (!reminder) return;

        // Delete the reminder
        set((state) => ({
          reminders: state.reminders.filter((r) => r.id !== id),
        }));

        // Show the banner after deletion
        const { showBanner } = get();
        showBanner('🗑️ Reminder deleted', 'info');
      },
      updateSettings: (settings) => {
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }));
        const { showBanner } = get();
        showBanner('⚙️ Settings updated successfully!');
      },
      archiveReminder: (id) => {
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, archived: true, archivedAt: new Date() } : r
          ),
        }));
        const { showBanner } = get();
        showBanner('🗄️ Reminder archived successfully!', 'success');
      },
      cleanupArchivedReminders: () => {
        const thirtyDaysAgo = subDays(new Date(), 30);
        set((state) => {
          const initialCount = state.reminders.length;
          const newReminders = state.reminders.filter((reminder) => {
            if (reminder.archived && reminder.archivedAt) {
              return new Date(reminder.archivedAt) > thirtyDaysAgo;
            }
            return true;
          });
          
          const removedCount = initialCount - newReminders.length;
          if (removedCount > 0) {
            const { showBanner } = get();
            showBanner(`🧹 Cleaned up ${removedCount} old archived ${removedCount === 1 ? 'reminder' : 'reminders'}`, 'info');
          }
          
          return { reminders: newReminders };
        });
      },
      showBanner: (text, type = 'success') => {
        const id = crypto.randomUUID();
        set((state) => ({
          bannerMessages: [...state.bannerMessages, { id, text, type }],
        }));
        setTimeout(() => {
          get().removeBanner(id);
        }, 5000);
      },
      removeBanner: (id) =>
        set((state) => ({
          bannerMessages: state.bannerMessages.filter((msg) => msg.id !== id),
        })),
      clearBanners: () =>
        set({ bannerMessages: [] }),
      shouldShowGreeting: () => {
        const state = get();
        const today = startOfDay(new Date()).toISOString();
        return state.lastGreetingShown !== today;
      },
      updateLastGreetingShown: () => {
        const today = startOfDay(new Date()).toISOString();
        set({ lastGreetingShown: today });
      },
    }),
    {
      name: 'daily-storage',
    }
  )
);