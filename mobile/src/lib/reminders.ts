import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays, isAfter, setHours, setMinutes, setSeconds, subDays } from 'date-fns';

import { fromIsoDate } from './dates';

/**
 * Reminders are scheduled entirely on the device. There is no push server, no
 * token, and nothing about a cycle ever leaves the phone to make one appear —
 * which is the whole reason this app can promise what it promises.
 */
export interface ReminderPlan {
  windowStart: string | null;
  windowEnd: string | null;
  /** Hour of day for the daily nudge, 0-23. */
  hour: number;
}

export async function requestPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

function at(date: Date, hour: number): Date {
  return setSeconds(setMinutes(setHours(date, hour), 0), 0);
}

/**
 * Replaces every scheduled reminder with a fresh set. Rescheduling wholesale is
 * deliberate: the prediction moves whenever a cycle is logged or edited, and
 * reconciling individual notifications against a shifted window is how apps end
 * up telling people their period is due on a date the app no longer predicts.
 */
export async function rescheduleReminders(plan: ReminderPlan): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('cycle', {
      name: 'Cycle reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const now = new Date();
  const schedule = async (when: Date, title: string, body: string) => {
    if (!isAfter(when, now)) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  };

  if (plan.windowStart !== null) {
    const start = fromIsoDate(plan.windowStart);

    await schedule(
      at(subDays(start, 2), plan.hour),
      'Your window opens in a couple of days',
      'A good moment to have what you need to hand.'
    );

    await schedule(
      at(start, plan.hour),
      'Your predicted window starts today',
      'It is a range, not a date — it may well be a few days either side.'
    );
  }

  if (plan.windowEnd !== null) {
    await schedule(
      at(addDays(fromIsoDate(plan.windowEnd), 1), plan.hour),
      'Window passed with nothing logged',
      'If your period came, logging it sharpens the next prediction. If it did not, that is worth noting too.'
    );
  }

  // A gentle daily nudge, starting tomorrow so enabling it doesn't fire at once.
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Check in?',
      body: 'A single tap counts. Mood, sleep, or whatever stands out.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: plan.hour,
      minute: 0,
    },
  });
}

export async function cancelReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
