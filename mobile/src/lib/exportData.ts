import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';

import { listCycleLogs } from '../db/cycles';
import { listPredictionSnapshots } from '../db/predictions';
import { getOrCreateProfile } from '../db/profile';
import { listSymptomLogs } from '../db/symptoms';

/**
 * Writes everything recorded to a file and hands it to the share sheet.
 *
 * Two reasons this exists: a phone that dies takes the only copy of this
 * history with it, and the education content tells people to bring a cycle
 * history to an appointment — which needs to be something they can actually
 * send or print.
 */
export async function exportEverything(): Promise<{ shared: boolean; path: string }> {
  const profile = await getOrCreateProfile();
  const [cycles, symptoms, predictions] = await Promise.all([
    listCycleLogs(profile.id),
    listSymptomLogs(profile.id),
    listPredictionSnapshots(profile.id),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'Cycle Engine',
    profile: {
      phenotype: profile.phenotype,
      createdAt: profile.createdAt,
    },
    cycles,
    dailyLogs: symptoms,
    predictions,
  };

  const file = new File(Paths.cache, `cycle-engine-${format(new Date(), 'yyyy-MM-dd')}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify(payload, null, 2));

  if (!(await Sharing.isAvailableAsync())) return { shared: false, path: file.uri };

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Your cycle data',
    UTI: 'public.json',
  });
  return { shared: true, path: file.uri };
}
