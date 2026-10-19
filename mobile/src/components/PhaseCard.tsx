import { Pressable, StyleSheet, Text, View } from 'react-native';
import { addDays, format } from 'date-fns';

import { SectionLabel, SoftCard } from './Soft';
import { SYMPTOM_LABELS } from '../content/trackers';
import type { OvulationSignal } from '../engine/ovulation';
import type { CyclePhase, PhaseMap } from '../engine/phaseMap';
import { fromIsoDate } from '../lib/dates';
import { radius, spacing, typography, useThemeColors, useThemedStyles, type ThemeColors } from '../theme';
import type { SymptomTag } from '../types';

const PHASE_NAMES: Record<CyclePhase, string> = {
  period: 'Period',
  between: 'Between periods',
  follicular: 'Follicular',
  ovulation: 'Ovulation',
  luteal: 'Luteal',
  premenstrual: 'Premenstrual',
  window: 'Period expected',
  late: 'Later than expected',
};

function describe(phase: CyclePhase, signal: OvulationSignal | null, ovulationLikelyNow: boolean): string {
  switch (phase) {
    case 'period':
      return 'Day one of a cycle is the first day of bleeding.';
    case 'between':
      return ovulationLikelyNow
        ? "After your period. If this cycle has an ovulation, it's likely to be around now."
        : "After your period. Ovulation hasn't been measured this cycle, so it's estimated below.";
    case 'follicular':
      return 'After your period and before ovulation. This is the part of a cycle that stretches or shrinks the most.';
    case 'ovulation':
      return `Estimated from ${signal?.source === 'temperature' ? 'your temperature rise' : 'your positive LH test'}.`;
    case 'luteal':
      return 'After ovulation. The next period usually follows about two weeks later.';
    case 'premenstrual':
      return 'Your period could be under a week away, which is when PMS symptoms tend to show up.';
    case 'window':
      return 'Your period could start any day now.';
    case 'late':
      return "Past the window. With irregular cycles that's common, not a sign the app or you got something wrong.";
  }
}

function phaseColor(phase: CyclePhase, colors: ThemeColors): string {
  switch (phase) {
    case 'period':
      return colors.accent;
    case 'between':
      return colors.border;
    case 'follicular':
      return colors.apricot;
    case 'ovulation':
      return colors.sage;
    case 'luteal':
      return colors.petal;
    case 'premenstrual':
      return colors.lilac;
    case 'window':
      return colors.accentSoft;
    case 'late':
      return colors.textFaint;
  }
}

interface Props {
  map: PhaseMap;
  cycleDay: number;
  lastPeriodStart: string;
  signal: OvulationSignal | null;
  /** Null until there is enough history for a pattern to mean anything. */
  premenstrualPattern: SymptomTag[] | null;
  /** The period window's confidence, which the ovulation estimate inherits. */
  confidence: number;
  onLearnMore: () => void;
  delay?: number;
}

export function PhaseCard({
  map,
  cycleDay,
  lastPeriodStart,
  signal,
  premenstrualPattern,
  confidence,
  onLearnMore,
  delay,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const anchor = fromIsoDate(lastPeriodStart);
  const dateOf = (day: number) => format(addDays(anchor, day - 1), 'd MMM');
  const markerLeft = `${((Math.min(cycleDay, map.totalDays) - 0.5) / map.totalDays) * 100}%` as const;
  const pmsAhead = map.current !== 'period' && cycleDay < map.premenstrualFromDay;
  const likely = map.likelyOvulation;
  const ovulationLikelyNow =
    likely !== null && cycleDay >= likely.startDay && cycleDay <= likely.endDay;
  const ovulationAhead = likely !== null && cycleDay <= likely.endDay;

  return (
    <SoftCard delay={delay}>
      <SectionLabel>Where you are in your cycle</SectionLabel>
      <Text style={styles.phaseName}>{PHASE_NAMES[map.current]}</Text>
      <Text style={styles.body}>{describe(map.current, signal, ovulationLikelyNow)}</Text>

      <View style={styles.trackWrap}>
        <View style={styles.track}>
          {map.segments.map((segment) => (
            <View
              key={segment.phase}
              style={{
                backgroundColor: phaseColor(segment.phase, colors),
                flex: segment.endDay - segment.startDay + 1,
              }}
            />
          ))}
        </View>
        {likely !== null && (
          <View style={styles.estimateTrack}>
            <View
              style={[
                styles.estimate,
                {
                  left: `${((likely.startDay - 1) / map.totalDays) * 100}%`,
                  width: `${((likely.endDay - likely.startDay + 1) / map.totalDays) * 100}%`,
                },
              ]}
            />
          </View>
        )}
        <View style={[styles.marker, { left: markerLeft }]} />
      </View>

      <View style={styles.list}>
        {map.segments.map((segment) => (
          <View key={segment.phase} style={styles.row}>
            <View style={[styles.swatch, { backgroundColor: phaseColor(segment.phase, colors) }]} />
            <Text style={[styles.rowName, segment.phase === map.current && styles.rowCurrent]}>
              {PHASE_NAMES[segment.phase]}
            </Text>
            <Text style={styles.rowDates}>
              {segment.startDay === segment.endDay
                ? dateOf(segment.startDay)
                : `${dateOf(segment.startDay)} – ${dateOf(segment.endDay)}`}
            </Text>
          </View>
        ))}
        {likely !== null && (
          <View style={styles.row}>
            <View style={[styles.swatch, styles.swatchEstimate]} />
            <Text style={styles.rowName}>Ovulation likely</Text>
            <Text style={styles.rowDates}>
              {dateOf(likely.startDay)} – {dateOf(likely.endDay)}
            </Text>
          </View>
        )}
      </View>

      {likely !== null && ovulationAhead && (
        <Text style={styles.body}>
          If you ovulate this cycle, it's most likely between {dateOf(likely.startDay)} and{' '}
          {dateOf(likely.endDay)} — about {Math.round(confidence * 100)}% likely. That's counted
          back about two weeks from your expected period, not measured, and with PCOS some cycles
          have no ovulation at all.
        </Text>
      )}
      {likely !== null && (
        <Text style={styles.note}>
          An estimate like this isn't reliable enough to plan or prevent a pregnancy.
        </Text>
      )}

      {pmsAhead && (
        <Text style={styles.body}>
          PMS could start between {dateOf(map.premenstrualFromDay)} and{' '}
          {dateOf(map.premenstrualToDay)} — counted back from your expected period, so it moves
          when that does.
        </Text>
      )}

      <Text style={styles.body}>
        {premenstrualPattern === null
          ? 'Once two cycles and a few check-ins are logged, this will show which symptoms tend to come before your period.'
          : premenstrualPattern.length === 0
            ? 'Nothing you log shows up more often before your period than at other times.'
            : `Before past periods you've logged ${joinLabels(premenstrualPattern)} more often than at other times.`}
      </Text>

      {signal === null && (
        <Text style={styles.note}>
          Logging LH tests or morning temperatures in the check-in would measure ovulation instead
          of estimating it, and tighten the period prediction too.
        </Text>
      )}

      <Pressable hitSlop={8} onPress={onLearnMore}>
        <Text style={styles.link}>How the phases work</Text>
      </Pressable>
    </SoftCard>
  );
}

function joinLabels(tags: SymptomTag[]): string {
  const labels = tags.map((tag) => SYMPTOM_LABELS[tag].toLowerCase());
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    phaseName: {
      ...typography.heading,
      color: colors.text,
    },
    body: {
      ...typography.bodySmall,
      color: colors.text,
    },
    trackWrap: {
      marginVertical: spacing.sm,
    },
    track: {
      borderRadius: radius.pill,
      flexDirection: 'row',
      height: 12,
      overflow: 'hidden',
    },
    // Sits over the track rather than inside it so it reads as "you are here",
    // not as another segment.
    marker: {
      backgroundColor: colors.text,
      borderRadius: radius.pill,
      height: 20,
      marginLeft: -2,
      position: 'absolute',
      top: -4,
      width: 4,
    },
    estimateTrack: {
      height: 6,
      marginTop: spacing.xs,
    },
    estimate: {
      backgroundColor: colors.sage,
      borderRadius: radius.pill,
      height: 6,
      position: 'absolute',
    },
    swatchEstimate: {
      backgroundColor: 'transparent',
      borderColor: colors.sage,
      borderWidth: 2,
    },
    list: {
      gap: spacing.xs,
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    swatch: {
      borderRadius: radius.pill,
      height: 10,
      width: 10,
    },
    rowName: {
      ...typography.caption,
      color: colors.textMuted,
      flex: 1,
    },
    rowCurrent: {
      ...typography.label,
      color: colors.text,
    },
    rowDates: {
      ...typography.caption,
      color: colors.textMuted,
    },
    note: {
      ...typography.micro,
      color: colors.textFaint,
    },
    link: {
      ...typography.label,
      color: colors.accent,
    },
  });
