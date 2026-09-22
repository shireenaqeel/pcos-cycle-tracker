import { getDb } from './client';
import type { Phenotype, UserProfile } from '../types';

const LOCAL_USER_ID = 'local'; // single-user, on-device; no auth for the MVP

interface UserProfileRow {
  id: string;
  phenotype: string | null;
  self_reported_dx: number;
  created_at: string;
}

function rowToProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    phenotype: row.phenotype as Phenotype | null,
    selfReportedDx: row.self_reported_dx === 1,
    createdAt: row.created_at,
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
  return { id: LOCAL_USER_ID, phenotype: null, selfReportedDx: false, createdAt };
}

export async function setPhenotype(phenotype: Phenotype): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE user_profile SET phenotype = ? WHERE id = ?`, phenotype, LOCAL_USER_ID);
}

export { LOCAL_USER_ID };
