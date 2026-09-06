import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'md' | 'sm';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = true,
  style,
}: ButtonProps) {
  const primary = useThemeColor({}, 'primary');
  const primaryPressed = useThemeColor({}, 'primaryPressed');
  const primaryMuted = useThemeColor({}, 'primaryMuted');
  const danger = useThemeColor({}, 'danger');
  const dangerMuted = useThemeColor({}, 'dangerMuted');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'borderStrong');
  const text = useThemeColor({}, 'text');

  const isDisabled = disabled || loading;

  const palette: Record<ButtonVariant, { bg: string; pressedBg: string; fg: string; border?: string }> = {
    primary: { bg: primary, pressedBg: primaryPressed, fg: '#fff' },
    danger: { bg: danger, pressedBg: danger, fg: '#fff' },
    secondary: { bg: surfaceSecondary, pressedBg: border, fg: text },
    outline: { bg: 'transparent', pressedBg: primaryMuted, fg: primary, border: primary },
    ghost: { bg: 'transparent', pressedBg: dangerMuted, fg: danger },
  };
  const colors = palette[variant];

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        fullWidth && styles.fullWidth,
        { backgroundColor: pressed ? colors.pressedBg : colors.bg },
        colors.border ? { borderWidth: 1.4, borderColor: colors.border } : null,
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors.fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, size === 'sm' && styles.labelSm, { color: colors.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
  },
  md: { height: 52, paddingHorizontal: Spacing.lg },
  sm: { height: 40, paddingHorizontal: Spacing.lg },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
  label: { fontSize: 15, fontWeight: '700' },
  labelSm: { fontSize: 13, fontWeight: '600' },
});
