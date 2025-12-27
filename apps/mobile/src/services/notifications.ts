import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { api } from './api';
import type { Medication, Schedule } from '../navigation/types';

const REMINDERS_KEY = 'med-tracker-reminders-enabled';
const CATEGORY_ID = 'MED_REMINDER';
const HORIZON_HOURS = 24;
const MAX_OCCURRENCES = 20;
const POSTPONE_MINUTES = 30;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let responseSubscription: Notifications.Subscription | null = null;

type ScheduleWithMedication = {
  schedule: Schedule;
  medication: Medication;
};

type UserProfile = {
  timezone?: string | null;
};

export type NotificationDebugInfo = {
  enabled: boolean;
  permissionGranted: boolean;
  permissionStatus?: string;
  timezone: string | null;
  scheduledCount: number;
  scheduledTimes: string[];
};

export async function isRemindersEnabled(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(REMINDERS_KEY);
  return stored === 'true';
}

export async function setRemindersEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(REMINDERS_KEY, 'true');
  } else {
    await SecureStore.deleteItemAsync(REMINDERS_KEY);
  }
}

async function ensureNotificationCategories() {
  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    {
      identifier: 'TAKEN',
      buttonTitle: 'Taken',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'SKIP',
      buttonTitle: 'Skip',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'POSTPONE',
      buttonTitle: 'Postpone',
      options: { opensAppToForeground: false },
    },
  ]);
}

async function requestPermissions(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const result = await Notifications.requestPermissionsAsync();
  return result.granted || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

function parseWeekday(date: Date): string {
  const day = date.getDay();
  switch (day) {
    case 0:
      return 'sun';
    case 1:
      return 'mon';
    case 2:
      return 'tue';
    case 3:
      return 'wed';
    case 4:
      return 'thu';
    case 5:
      return 'fri';
    case 6:
      return 'sat';
    default:
      return 'mon';
  }
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const utcTime = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return (utcTime - date.getTime()) / 60000;
}

function makeZonedDate(year: number, month: number, day: number, hour: number, minute: number, timeZone: string) {
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offsetMinutes = getTimeZoneOffsetMinutes(utcDate, timeZone);
  return new Date(utcDate.getTime() - offsetMinutes * 60000);
}

function buildOccurrences(schedule: Schedule, now: Date, timeZone?: string | null): Date[] {
  const occurrences: Date[] = [];
  const horizonMs = HORIZON_HOURS * 60 * 60 * 1000;
  const endTime = now.getTime() + horizonMs;

  if (schedule.recurrence_type === 'interval') {
    const intervalHours = schedule.interval_hours ?? 1;
    let next = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
    while (next.getTime() <= endTime && occurrences.length < MAX_OCCURRENCES) {
      occurrences.push(next);
      next = new Date(next.getTime() + intervalHours * 60 * 60 * 1000);
    }
    return occurrences;
  }

  const times = schedule.times ?? [];
  const days = Math.ceil(HORIZON_HOURS / 24);
  const weekdaySet = new Set((schedule.weekdays ?? []).map((day) => day.toLowerCase()));

  const baseParts = timeZone
    ? new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .formatToParts(now)
        .reduce<Record<string, string>>((acc, part) => {
          if (part.type !== 'literal') {
            acc[part.type] = part.value;
          }
          return acc;
        }, {})
    : null;

  const baseYear = baseParts ? Number(baseParts.year) : now.getFullYear();
  const baseMonth = baseParts ? Number(baseParts.month) : now.getMonth() + 1;
  const baseDay = baseParts ? Number(baseParts.day) : now.getDate();

  for (let dayOffset = 0; dayOffset <= days; dayOffset += 1) {
    const base = timeZone
      ? makeZonedDate(baseYear, baseMonth, baseDay + dayOffset, 0, 0, timeZone)
      : new Date(now);
    if (!timeZone) {
      base.setDate(base.getDate() + dayOffset);
    }
    const weekday = parseWeekday(base);

    if (schedule.recurrence_type === 'weekly' && !weekdaySet.has(weekday)) {
      continue;
    }

    times.forEach((time) => {
      const [hours, minutes] = time.split(':').map((value) => Number(value));
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return;
      }
      const occurrence = timeZone
        ? makeZonedDate(baseYear, baseMonth, baseDay + dayOffset, hours, minutes, timeZone)
        : new Date(base);
      if (!timeZone) {
        occurrence.setHours(hours, minutes, 0, 0);
      }
      if (occurrence.getTime() <= now.getTime()) {
        return;
      }
      if (occurrence.getTime() <= endTime && occurrences.length < MAX_OCCURRENCES) {
        occurrences.push(occurrence);
      }
    });
  }

  occurrences.sort((a, b) => a.getTime() - b.getTime());
  return occurrences.slice(0, MAX_OCCURRENCES);
}

async function fetchSchedules(token: string): Promise<ScheduleWithMedication[]> {
  const medications = await api.get<Medication[]>('/medications', token);
  const results = await Promise.all(
    medications.map(async (medication) => {
      const schedules = await api.get<Schedule[]>(`/medications/${medication.id}/schedules`, token);
      return schedules
        .filter((schedule) => schedule.is_active)
        .map((schedule) => ({ schedule, medication }));
    })
  );

  return results.flat();
}

async function fetchTimezone(token: string): Promise<string | null> {
  const profile = await api.get<UserProfile>('/user/profile', token);
  return profile.timezone ?? null;
}

export async function syncNotifications(token: string): Promise<void> {
  const permissionGranted = await requestPermissions();
  if (!permissionGranted) {
    throw new Error('Notification permission not granted');
  }

  await ensureNotificationCategories();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const timezone = await fetchTimezone(token);
  const schedules = await fetchSchedules(token);

  for (const entry of schedules) {
    const occurrences = buildOccurrences(entry.schedule, now, timezone);
    for (const occurrence of occurrences) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: entry.medication.name,
          body: 'Time to take your medication',
          data: {
            scheduleId: entry.schedule.id,
            medicationId: entry.medication.id,
          },
          categoryIdentifier: CATEGORY_ID,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: occurrence,
        },
      });
    }
  }
}

export function registerNotificationResponseHandler(token: string) {
  if (responseSubscription) {
    responseSubscription.remove();
    responseSubscription = null;
  }

  responseSubscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
    try {
      const action = response.actionIdentifier;
      const data = response.notification.request.content.data as {
        scheduleId?: number;
        medicationId?: number;
      };

      if (!data?.scheduleId) {
        return;
      }

      if (action === 'TAKEN' || action === 'SKIP') {
        await api.post(
          '/intakes',
          {
            schedule_id: data.scheduleId,
            status: action === 'TAKEN' ? 'taken' : 'skipped',
            taken_at: new Date().toISOString(),
          },
          token
        );
        return;
      }

      if (action === 'POSTPONE') {
        const trigger = new Date(Date.now() + POSTPONE_MINUTES * 60 * 1000);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: response.notification.request.content.title ?? 'Medication reminder',
            body: 'Reminder postponed',
            data,
            categoryIdentifier: CATEGORY_ID,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: trigger,
          },
        });
      }
    } catch {
      // Ignore notification action errors.
    }
  });

  return () => {
    if (responseSubscription) {
      responseSubscription.remove();
      responseSubscription = null;
    }
  };
}

export async function disableNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await setRemindersEnabled(false);
}

export const remindersPlatformNote = Platform.select({
  ios: 'Reminders follow your profile timezone.',
  android: 'Reminders follow your profile timezone.',
  default: 'Reminders follow your profile timezone.',
});

function formatScheduledTrigger(trigger: Notifications.NotificationTrigger | null): string | null {
  if (!trigger || typeof trigger !== 'object') {
    return null;
  }
  if ('date' in trigger) {
    const dateValue = trigger.date;
    const date =
      dateValue instanceof Date
        ? dateValue
        : typeof dateValue === 'number'
          ? new Date(dateValue)
          : new Date(dateValue as string);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  }
  return null;
}

export async function getNotificationDebugInfo(token: string): Promise<NotificationDebugInfo> {
  const [enabled, permissions, scheduled, timezone] = await Promise.all([
    isRemindersEnabled(),
    Notifications.getPermissionsAsync(),
    Notifications.getAllScheduledNotificationsAsync(),
    fetchTimezone(token),
  ]);

  const scheduledTimes = scheduled
    .map((item) => formatScheduledTrigger(item.trigger))
    .filter((value): value is string => Boolean(value))
    .sort()
    .slice(0, 5);

  const permissionStatus = permissions.ios?.status ?? permissions.status;

  return {
    enabled,
    permissionGranted: permissions.granted || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
    permissionStatus: permissionStatus !== undefined ? String(permissionStatus) : undefined,
    timezone,
    scheduledCount: scheduled.length,
    scheduledTimes,
  };
}
