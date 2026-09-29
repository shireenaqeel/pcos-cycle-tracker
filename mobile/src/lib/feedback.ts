import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptics are a nicety, not a feature: web has no API for them and a simulator
 * has no motor, so every call is fire-and-forget and never blocks or surfaces
 * an error to the person logging their day.
 */
function safely(run: () => Promise<void>): void {
  if (Platform.OS === 'web') return;
  void run().catch(() => {});
}

/** Selecting a chip, stepping a counter — the small stuff. */
export function tapFeedback(): void {
  safely(() => Haptics.selectionAsync());
}

/** Something was saved. */
export function successFeedback(): void {
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** A destructive confirmation, like deleting a logged cycle. */
export function warningFeedback(): void {
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
