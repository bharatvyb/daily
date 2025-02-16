export interface Reminder {
  id: string;
  title: string;
  notes?: string;
  datetime: Date;
  recurrence: {
    type: 'none' | 'daily' | 'alternate' | 'weekly' | 'monthly' | 'yearly' | 'custom' | 'per-day';
    customDays?: number[];
    endDate?: Date;
    interval?: {
      value: number;
      unit: 'minutes';
    };
  };
  completed: boolean;
  archived?: boolean;
  archivedAt?: Date;
}

export interface UserSettings {
  name: string;
  appIcon: string;
  layout: 'compact' | 'flexible';
}

export interface BannerMessage {
  id: string;
  text: string;
  type: 'success' | 'info';
}