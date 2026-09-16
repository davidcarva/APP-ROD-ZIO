import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Vibrações táteis com intensidades distintas por tipo de evento.
// Na web não há motor háptico útil, então vira no-op.
const IS_WEB = Platform.OS === 'web';

function fire(effect: () => Promise<unknown>) {
  if (IS_WEB) return;
  try {
    effect().catch(() => {});
  } catch {
    // aparelho sem motor háptico
  }
}

export const haptic = {
  tap: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  soft: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  medium: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  selection: () => fire(() => Haptics.selectionAsync()),
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
