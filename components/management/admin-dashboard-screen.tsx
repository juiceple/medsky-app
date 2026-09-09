import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getDashboard } from '@/lib/management-api';
import type { DashboardData } from '@/lib/management-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: DashboardData };

type NavItem = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; href: string };

const NAV_ITEMS: NavItem[] = [
  { key: 'consultants', label: '컨설턴트 명부', icon: 'people-outline', href: '/admin/consultants' },
  { key: 'invitations', label: '학생 초대', icon: 'mail-outline', href: '/admin/invitations' },
  { key: 'settlements', label: '정산·단가', icon: 'cash-outline', href: '/admin/settlements' },
  { key: 'feedback', label: '피드백·설문', icon: 'chatbox-ellipses-outline', href: '/admin/feedback' },
  { key: 'notifications', label: '알림 관리', icon: 'notifications-outline', href: '/admin/notifications' },
];

function StatTile({ label, value, tone }: { label: string; value: number | string; tone?: 'danger' | 'warning' }) {
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const danger = useThemeColor({}, 'danger');
  const warning = useThemeColor({}, 'warning');
  const color = tone === 'danger' ? danger : tone === 'warning' ? warning : text;

  return (
    <View style={styles.statTile}>
      <ThemedText style={[styles.statValue, { color }]}>{value}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: textSecondary }]}>{label}</ThemedText>
    </View>
  );
}

/** 실장 콘솔 홈. 운영 지표 + 다른 관리 화면으로 가는 진입점. */
export function AdminDashboardScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const border = useThemeColor({}, 'border');
  const danger = useThemeColor({}, 'danger');

  const load = useCallback(async () => {
    try {
      const data = await getDashboard();
      setState({ status: 'ready', data });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : '불러오지 못했습니다.' });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (state.status === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: background }]}>
        <ActivityIndicator color={primary} />
      </View>
    );
  }

  if (state.status === 'error') {
    return <StatusMessage message={state.message} onRetry={load} />;
  }

  const { overview, consultantLoads, stalledStudents } = state.data;

  return (
    <FlatList
      style={{ backgroundColor: background }}
      data={NAV_ITEMS}
      keyExtractor={(item) => item.key}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primary} />}
      ListHeaderComponent={
        <View style={{ gap: Spacing.lg }}>
          <ScreenHeader title="실장 콘솔" subtitle="종합 생기부 관리 운영 현황" />

          <Card style={styles.statsCard}>
            <View style={styles.statsGrid}>
              <StatTile label="전체 학생" value={overview.totalStudents} />
              <StatTile label="진행중" value={overview.activeStudents} />
              <StatTile label="배정 대기" value={overview.unassigned} tone={overview.unassigned > 0 ? 'warning' : undefined} />
              <StatTile label="입력 대기" value={overview.waitingOnboarding} />
              <StatTile label="잔여 부족" value={overview.lowCredit} tone={overview.lowCredit > 0 ? 'warning' : undefined} />
              <StatTile label="정체" value={overview.stalled} tone={overview.stalled > 0 ? 'danger' : undefined} />
            </View>
            <View style={[styles.monthRow, { borderTopColor: border }]}>
              <ThemedText style={[styles.monthLabel, { color: textSecondary }]}>이번 달 진행</ThemedText>
              <ThemedText style={styles.monthValue}>
                {overview.roundsThisMonth}회 · {overview.sessionsThisMonth}건
              </ThemedText>
            </View>
          </Card>

          {stalledStudents.length > 0 ? (
            <Card>
              <ThemedText type="defaultSemiBold">정체된 학생</ThemedText>
              {stalledStudents.slice(0, 5).map((student) => (
                <View key={student.id} style={styles.stalledRow}>
                  <ThemedText style={styles.stalledName}>{student.name}</ThemedText>
                  <ThemedText style={[styles.stalledMeta, { color: danger }]}>
                    {student.daysSinceLastLesson ?? '?'}일째 · 잔여 {student.remaining}회
                    {student.consultantName ? ` · ${student.consultantName}` : ''}
                  </ThemedText>
                </View>
              ))}
            </Card>
          ) : null}

          {consultantLoads.length > 0 ? (
            <Card>
              <ThemedText type="defaultSemiBold">컨설턴트별 부하</ThemedText>
              {consultantLoads.slice(0, 8).map((load) => (
                <View key={load.consultant.id} style={styles.loadRow}>
                  <ThemedText style={styles.loadName} numberOfLines={1}>
                    {load.consultant.name}
                  </ThemedText>
                  <View style={styles.loadRight}>
                    <ThemedText style={[styles.loadMeta, { color: textSecondary }]}>
                      학생 {load.activeStudentCount} · 잔여 {load.remainingRounds}회
                    </ThemedText>
                    {load.missingRate ? <Badge label="단가 미설정" tone="warning" /> : null}
                  </View>
                </View>
              ))}
            </Card>
          ) : null}

          <ThemedText type="defaultSemiBold">관리</ThemedText>
        </View>
      }
      ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(item.href as never)}>
          {({ pressed }) => (
            <Card style={[styles.navCard, pressed && styles.navCardPressed]}>
              <View style={[styles.navIcon, { backgroundColor: `${primary}1A` }]}>
                <Ionicons name={item.icon} size={20} color={primary} />
              </View>
              <ThemedText style={styles.navLabel}>{item.label}</ThemedText>
              <Ionicons name="chevron-forward" size={18} color={textSecondary} />
            </Card>
          )}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, paddingTop: Spacing.xxxl + 20, paddingBottom: 60, gap: Spacing.md, flexGrow: 1 },
  statsCard: { gap: Spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  statTile: { width: '33%', paddingVertical: Spacing.sm, gap: 2 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12 },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
  },
  monthLabel: { fontSize: 13 },
  monthValue: { fontSize: 13, fontWeight: '700' },
  stalledRow: { gap: 2, paddingVertical: 2 },
  stalledName: { fontSize: 14, fontWeight: '700' },
  stalledMeta: { fontSize: 12.5 },
  loadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, paddingVertical: 3 },
  loadName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  loadRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  loadMeta: { fontSize: 12.5 },
  navCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  navCardPressed: { opacity: 0.85 },
  navIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
});
