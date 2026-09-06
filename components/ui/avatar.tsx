import { StyleSheet, Text, View } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

function initialsOf(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  // Korean names: first character reads as the "initial" people expect.
  return trimmed[0];
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const bg = useThemeColor({}, 'primaryMuted');
  const fg = useThemeColor({}, 'primary');

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}>
      <Text style={[styles.initials, { color: fg, fontSize: size * 0.4 }]}>{initialsOf(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
  },
});
