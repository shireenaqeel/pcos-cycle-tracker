import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import { getDb } from '../db/client';
import { insertCycleLog, listCycleLogs } from '../db/cycles';
import { LOCAL_USER_ID } from '../db/profile';
import { listSymptomLogs, saveSymptomLog } from '../db/symptoms';
import { planImport, type ImportPlan } from './importPlan';

/** Lets someone choose a backup file and works out what it would change. */
export async function chooseBackup(): Promise<{ plan: ImportPlan } | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', '*/*'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || picked.assets.length === 0) return null;

  const contents = await new File(picked.assets[0].uri).text();
  const parsed: unknown = JSON.parse(contents);

  const [cycles, logs] = await Promise.all([
    listCycleLogs(LOCAL_USER_ID),
    listSymptomLogs(LOCAL_USER_ID),
  ]);

  return { plan: planImport({ cycles, logs }, parsed) };
}

/**
 * Writes an agreed plan. All or nothing: a restore that half-applied would
 * leave someone's history in a state neither they nor the app could reason
 * about, and there is no server copy to reconcile against.
 */
export async function applyImport(plan: ImportPlan): Promise<void> {
  const db = await getDb();
  await db.execAsync('BEGIN');
  try {
    for (const cycle of plan.cyclesToAdd) {
      await insertCycleLog({
        userId: LOCAL_USER_ID,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        entrySource: cycle.entrySource,
      });
    }

    for (const entry of plan.logsToWrite) {
      await saveSymptomLog({
        userId: LOCAL_USER_ID,
        date: entry.date,
        symptomTags: entry.symptomTags,
        basalTemp: entry.basalTemp,
        mood: null,
        moods: entry.moods,
        discharge: entry.discharge,
        sex: entry.sex,
        stressLevel: entry.stressLevel,
        hydrationGlasses: entry.hydrationGlasses,
        sleepHours: entry.sleepHours,
        movement: entry.movement,
        flow: entry.flow,
        medications: entry.medications,
        foodNote: entry.foodNote,
        otherNote: entry.otherNote,
      });
    }
    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
}
