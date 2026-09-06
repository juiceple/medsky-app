import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/lib/auth-context';

const ROWS: { key: 'school' | 'phone'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'school', label: '학교', icon: 'school-outline' },
  { key: 'phone', label: '연락처', icon: 'call-outline' },
];

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth();
  const background = useThemeColor({}, 'background');
  const iconColor = useThemeColor({}, 'primary');
  const border = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const dangerColor = useThemeColor({}, 'danger');

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Avatar name={profile?.name ?? user?.email ?? '?'} size={64} />
        <View style={styles.headerText}>
          <ThemedText style={styles.name}>{profile?.name ?? '이름 미등록'}</ThemedText>
          <ThemedText style={[styles.email, { color: textSecondary }]}>{user?.email ?? '-'}</ThemedText>
        </View>
      </View>

      <Card style={styles.infoCard} padded={false}>
        {ROWS.map((row, index) => (
          <View
            key={row.key}
            style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}>
            <View style={[styles.rowIcon, { backgroundColor: `${iconColor}14` }]}>
              <Ionicons name={row.icon} size={18} color={iconColor} />
            </View>
            <View style={styles.rowText}>
              <ThemedText style={[styles.label, { color: textSecondary }]}>{row.label}</ThemedText>
              <ThemedText style={styles.value}>{profile?.[row.key] ?? '-'}</ThemedText>
            </View>
          </View>
        ))}
      </Card>

      <View style={styles.spacer} />

      <Button
        label="로그아웃"
        variant="ghost"
        onPress={signOut}
        icon={<Ionicons name="log-out-outline" size={18} color={dangerColor} />}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Spacing.xl,
    paddingTop: Spacing.xxxl + 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  headerText: { gap: 2, flexShrink: 1 },
  name: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  email: { fontSize: 14 },
  infoCard: { overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { gap: 2, flexShrink: 1 },
  label: { fontSize: 12 },
  value: { fontSize: 15, fontWeight: '600' },
  spacer: { flex: 1, minHeight: Spacing.xxl },
});
