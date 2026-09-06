import { StyleSheet } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export function StatusMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const iconColor = useThemeColor({}, 'textTertiary');

  return (
    <ThemedView style={styles.container}>
      <Ionicons name="alert-circle-outline" size={40} color={iconColor} />
      <ThemedText style={styles.message}>{message}</ThemedText>
      {onRetry ? (
        <Button label="다시 시도" onPress={onRetry} variant="outline" size="sm" fullWidth={false} />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    gap: Spacing.lg,
  },
  message: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 14,
    lineHeight: 20,
  },
});
