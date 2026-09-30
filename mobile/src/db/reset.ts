import { getDb } from './client';
import { LOCAL_USER_ID } from './profile';

/**
 * Wipes everything recorded but keeps the profile row, so the app returns to a
 * fresh state without re-running onboarding.
 *
 * Offered because a period tracker that cannot forget is a liability: people
 * lend phones, cross borders, and change their minds about what they want
 * stored. There is no server copy, so this really is deletion.
 */
export async function deleteAllRecords(): Promise<void> {
  const db = await getDb();
  await db.execAsync('BEGIN');
  try {
    await db.runAsync(`DELETE FROM cycle_log WHERE user_id = ?`, LOCAL_USER_ID);
    await db.runAsync(`DELETE FROM daily_symptom_log WHERE user_id = ?`, LOCAL_USER_ID);
    await db.runAsync(`DELETE FROM prediction_snapshot WHERE user_id = ?`, LOCAL_USER_ID);
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}
