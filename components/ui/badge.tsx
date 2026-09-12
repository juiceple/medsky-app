import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_COLOR_KEYS = {
  primary: { bg: 'primaryMuted', fg: 'primary' },
  success: { bg: 'successMuted', fg: 'success' },
  warning: { bg: 'warningMuted', fg: 'warning' },
  danger: { bg: 'dangerMuted', fg: 'danger' },
  neutral: { bg: 'surfaceSecondary', fg: 'textSecondary' },
} as const;

/** Maps the API's `LessonStatus` union to a badge tone. */
export function lessonStatusTone(status: string): BadgeTone {
  switch (status) {
    case '완료':
      return 'success';
    case '예정':
      return 'primary';
    case '노쇼':
      return 'danger';
    case '취소':
    default:
      return 'neutral';
  }
}

export function Badge({
  label,
  tone = 'neutral',
  style,
}: {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<TextStyle>;
}) {
  const keys = TONE_COLOR_KEYS[tone];
  const bg = useThemeColor({}, keys.bg);
  const fg = useThemeColor({}, keys.fg);

  return (
    <Text style={[styles.badge, { backgroundColor: bg, color: fg }, style]} numberOfLines={1}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    overflow: 'hidden',
  },
});
