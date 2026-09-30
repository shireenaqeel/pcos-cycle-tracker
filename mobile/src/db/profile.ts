import { getDb } from './client';
import type { Phenotype, UserProfile } from '../types';

const LOCAL_USER_ID = 'local'; // single-user, on-device; no auth for the MVP

interface UserProfileRow {
  id: string;
  phenotype: string | null;
  self_reported_dx: number;
  created_at: string;
  display_name: string | null;
  theme: string | null;
  reminders_enabled: number | null;
  reminder_hour: number | null;
  app_lock_enabled: number | null;
}

function rowToProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    phenotype: row.phenotype as Phenotype | null,
    selfReportedDx: row.self_reported_dx === 1,
    createdAt: row.created_at,
    displayName: row.display_name,
    theme: row.theme as UserProfile['theme'],
    remindersEnabled: row.reminders_enabled === 1,
    reminderHour: row.reminder_hour ?? 20,
    appLockEnabled: row.app_lock_enabled === 1,
  };
}

export async function getOrCreateProfile(): Promise<UserProfile> {
  const db = await getDb();
  const existing = await db.getFirstAsync<UserProfileRow>(
    `SELECT * FROM user_profile WHERE id = ?`,
    LOCAL_USER_ID
  );
  if (existing) return rowToProfile(existing);

  const createdAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO user_profile (id, phenotype, self_reported_dx, created_at) VALUES (?, NULL, 0, ?)`,
    LOCAL_USER_ID,
    createdAt
  );
  return {
    id: LOCAL_USER_ID,
    phenotype: null,
    selfReportedDx: false,
    createdAt,
    displayName: null,
    theme: null,
    remindersEnabled: false,
    reminderHour: 20,
    appLockEnabled: false,
  };
}

export async function setPhenotype(phenotype: Phenotype): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE user_profile SET phenotype = ? WHERE id = ?`, phenotype, LOCAL_USER_ID);
}

export async function setTheme(theme: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE user_profile SET theme = ? WHERE id = ?`, theme, LOCAL_USER_ID);
}

export async function setReminderPrefs(input: {
  enabled: boolean;
  hour: number;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE user_profile SET reminders_enabled = ?, reminder_hour = ? WHERE id = ?`,
    input.enabled ? 1 : 0,
    input.hour,
    LOCAL_USER_ID
  );
}

export async function setAppLock(enabled: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE user_profile SET app_lock_enabled = ? WHERE id = ?`,
    enabled ? 1 : 0,
    LOCAL_USER_ID
  );
}

export async function setDisplayName(displayName: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE user_profile SET display_name = ? WHERE id = ?`,
    displayName === null || displayName.trim() === '' ? null : displayName.trim(),
    LOCAL_USER_ID
  );
}

export { LOCAL_USER_ID };
