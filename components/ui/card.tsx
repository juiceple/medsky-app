import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type CardProps = ViewProps & {
  /** `elevated` (default) floats on the screen background; `flat` sits flush, no shadow. */
  variant?: 'elevated' | 'flat';
  padded?: boolean;
};

export function Card({ style, variant = 'elevated', padded = true, ...rest }: CardProps) {
  const backgroundColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');

  return (
    <View
      style={[
        styles.base,
        { backgroundColor },
        padded && styles.padded,
        variant === 'elevated' ? [styles.elevated, Shadows.sm] : { borderColor, borderWidth: StyleSheet.hairlineWidth },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
  },
  padded: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  elevated: {
    borderWidth: 0,
  },
});
