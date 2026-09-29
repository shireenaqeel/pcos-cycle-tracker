import type { DailySymptomLog, MovementLevel } from '../types';

const MOVEMENT_LABELS: Record<MovementLevel, string> = {
  none: 'rested',
  light: 'moved a little',
  moderate: 'moderate movement',
  intense: 'hard workout',
};

/**
 * One readable line per thing recorded. Shared so a day reads the same wherever
 * it's shown — a value logged in the check-in and then invisible everywhere
 * else is worse than not collecting it.
 */
export function checkInLines(entry: DailySymptomLog): string[] {
  const lines: string[] = [];
  if (entry.mood !== null) lines.push(`Feeling ${entry.mood}`);
  if (entry.stressLevel !== null) lines.push(`Stress ${entry.stressLevel} of 5`);
  if (entry.sleepHours !== null) lines.push(`${entry.sleepHours} hours of sleep`);
  if (entry.hydrationGlasses !== null) {
    lines.push(`${entry.hydrationGlasses} glass${entry.hydrationGlasses === 1 ? '' : 'es'} of water`);
  }
  if (entry.movement !== null) lines.push(MOVEMENT_LABELS[entry.movement]);
  if (entry.basalTemp !== null) lines.push(`${entry.basalTemp}°C`);
  if (entry.foodNote !== null) lines.push(`Food — ${entry.foodNote}`);
  if (entry.otherNote !== null) lines.push(entry.otherNote);
  return lines;
}

export function isCheckInEmpty(entry: DailySymptomLog): boolean {
  return entry.symptomTags.length === 0 && checkInLines(entry).length === 0;
}
