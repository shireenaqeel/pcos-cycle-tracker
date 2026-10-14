import { describe, expect, it } from '@jest/globals';

import { planImport } from '../importPlan';
import type { CycleLog, DailySymptomLog } from '../../types';

function cycle(startDate: string, endDate: string | null = null): CycleLog {
  return {
    id: `cyc_${startDate}`,
    userId: 'local',
    startDate,
    endDate,
    flowIntensity: null,
    isConfirmed: true,
    entrySource: 'logged',
  };
}

function log(date: string, stressLevel: number | null = null): DailySymptomLog {
  return {
    id: `sym_local_${date}`,
    userId: 'local',
    date,
    symptomTags: [],
    basalTemp: null,
    mood: null,
    moods: [],
    discharge: null,
    sex: [],
    stressLevel,
    hydrationGlasses: null,
    sleepHours: null,
    movement: null,
    foodNote: null,
    otherNote: null,
    flow: null,
    medications: null,
    lhTest: null,
  };
}

const EMPTY = { cycles: [], logs: [] };

describe('restoring onto an empty device', () => {
  it('takes everything in the file', () => {
    const plan = planImport(EMPTY, {
      cycles: [cycle('2026-01-01'), cycle('2026-02-01')],
      dailyLogs: [log('2026-01-02'), log('2026-01-03')],
    });

    expect(plan.cyclesToAdd).toHaveLength(2);
    expect(plan.logsToWrite).toHaveLength(2);
    expect(plan.duplicateCycles).toBe(0);
    expect(plan.unreadable).toBe(0);
  });

  it('keeps end dates and provenance', () => {
    const plan = planImport(EMPTY, {
      cycles: [{ startDate: '2026-03-01', endDate: '2026-03-05', entrySource: 'logged' }],
    });

    expect(plan.cyclesToAdd[0].endDate).toBe('2026-03-05');
    expect(plan.cyclesToAdd[0].entrySource).toBe('logged');
  });

  it('treats a period of unstated provenance as remembered rather than logged live', () => {
    const plan = planImport(EMPTY, { cycles: [{ startDate: '2026-03-01' }] });
    expect(plan.cyclesToAdd[0].entrySource).toBe('backfilled');
  });
});

describe('never losing what is already on the device', () => {
  it('skips periods whose start date is already recorded', () => {
    const plan = planImport(
      { cycles: [cycle('2026-01-01')], logs: [] },
      { cycles: [cycle('2026-01-01'), cycle('2026-02-01')] }
    );

    expect(plan.cyclesToAdd.map((c) => c.startDate)).toEqual(['2026-02-01']);
    expect(plan.duplicateCycles).toBe(1);
  });

  it('leaves an existing day untouched rather than overwriting it from an older backup', () => {
    const plan = planImport(
      { cycles: [], logs: [log('2026-01-02', 5)] },
      { dailyLogs: [log('2026-01-02', 1), log('2026-01-03', 2)] }
    );

    expect(plan.logsToWrite.map((l) => l.date)).toEqual(['2026-01-03']);
    expect(plan.skippedLogs).toBe(1);
  });

  it('is idempotent — importing the same file twice adds nothing the second time', () => {
    const file = {
      cycles: [cycle('2026-01-01'), cycle('2026-02-01')],
      dailyLogs: [log('2026-01-02')],
    };

    const first = planImport(EMPTY, file);
    const after = { cycles: first.cyclesToAdd, logs: first.logsToWrite };
    const second = planImport(after, file);

    expect(second.cyclesToAdd).toHaveLength(0);
    expect(second.logsToWrite).toHaveLength(0);
    expect(second.duplicateCycles).toBe(2);
  });

  it('does not let one file add the same start date twice', () => {
    const plan = planImport(EMPTY, { cycles: [cycle('2026-01-01'), cycle('2026-01-01')] });

    expect(plan.cyclesToAdd).toHaveLength(1);
    expect(plan.duplicateCycles).toBe(1);
  });
});

describe('a file is untrusted input', () => {
  it('returns an empty plan for anything that is not a record', () => {
    for (const junk of [null, 42, 'a string', [], undefined]) {
      const plan = planImport(EMPTY, junk);
      expect(plan.cyclesToAdd).toHaveLength(0);
      expect(plan.logsToWrite).toHaveLength(0);
    }
  });

  it('drops entries with a missing or malformed date and counts them', () => {
    const plan = planImport(EMPTY, {
      cycles: [{ startDate: 'not-a-date' }, {}, cycle('2026-01-01'), 'nonsense'],
      dailyLogs: [{ date: '01/02/2026' }, log('2026-01-02')],
    });

    expect(plan.cyclesToAdd).toHaveLength(1);
    expect(plan.logsToWrite).toHaveLength(1);
    expect(plan.unreadable).toBe(4);
  });

  it('ignores fields of the wrong type instead of storing them', () => {
    const plan = planImport(EMPTY, {
      dailyLogs: [
        {
          date: '2026-01-02',
          symptomTags: 'cramps',
          stressLevel: 'high',
          moods: null,
          sleepHours: 7,
        },
      ],
    });

    const [entry] = plan.logsToWrite;
    expect(entry.symptomTags).toEqual([]);
    expect(entry.stressLevel).toBeNull();
    expect(entry.moods).toEqual([]);
    expect(entry.sleepHours).toBe(7);
  });

  it('copes with a file that has no cycles or logs at all', () => {
    const plan = planImport(EMPTY, { exportedAt: '2026-01-01T00:00:00.000Z', app: 'Cycle Engine' });
    expect(plan.cyclesToAdd).toHaveLength(0);
    expect(plan.unreadable).toBe(0);
  });
});
