import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import { Squish } from '../components/Soft';
import {
  radius,
  spacing,
  typography,
  useThemedStyles,
  type ThemeColors,
} from '../theme';

/**
 * Stands in front of the app when the lock is on. It leans entirely on the
 * device's own biometrics or passcode — inventing a PIN would mean storing a
 * secret this app has no business holding, and would be weaker than what the
 * phone already offers.
 *
 * If the device has no enrolled lock there is nothing to check, so it unlocks
 * rather than trapping someone out of their own records.
 */
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const [failed, setFailed] = useState(false);

  const attempt = useCallback(async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) {
      onUnlock();
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock your cycle data',
      cancelLabel: 'Cancel',
    });
    if (result.success) onUnlock();
    else setFailed(true);
  }, [onUnlock]);

  useEffect(() => {
    void attempt();
  }, [attempt]);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Locked</Text>
      <Text style={styles.body}>
        {failed
          ? 'That did not go through. Try again whenever you are ready.'
          : 'Waiting for your phone to confirm it is you.'}
      </Text>
      <Squish onPress={() => void attempt()} haptic={false}>
        <View style={styles.button}>
          <Text style={styles.buttonText}>Unlock</Text>
        </View>
      </Squish>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      alignItems: 'center',
      backgroundColor: colors.background,
      flex: 1,
      gap: spacing.sm,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    title: {
      ...typography.title,
      color: colors.text,
    },
    body: {
      ...typography.bodySmall,
      color: colors.textMuted,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    buttonText: {
      ...typography.strong,
      color: colors.onAccent,
    },
  });
