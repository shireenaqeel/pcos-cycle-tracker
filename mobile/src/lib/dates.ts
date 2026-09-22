import { format, parse } from 'date-fns';

/**
 * Cycle dates are calendar days, not instants. `new Date('2026-03-05')` parses as
 * UTC midnight and `toISOString()` converts back through UTC, so either one shifts
 * the day by ±1 depending on the device's offset. These two stay in local time so a
 * date survives the round trip to SQLite unchanged, wherever the user is.
 */
export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function fromIsoDate(iso: string): Date {
  return parse(iso, 'yyyy-MM-dd', new Date());
}
