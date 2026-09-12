import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { AppModal } from '@/components/ui/app-modal';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { assignConsultant, getConsultants, getDashboard, getStudents, sendChatMessage } from '@/lib/management-api';
import type { ConsultantLoad, ConsultantWithServices, DashboardData, StudentSummary } from '@/lib/management-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      data: DashboardData;
      unassigned: StudentSummary[];
      consultants: ConsultantWithServices[];
    };

type NavItem = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; href: string };

const NAV_ITEMS: NavItem[] = [
  { key: 'consultants', label: '컨설턴트 명부', icon: 'people-outline', href: '/admin/consultants' },
  { key: 'invitations', label: '학생 초대', icon: 'mail-outline', href: '/admin/invitations' },
  { key: 'settlements', label: '정산·단가', icon: 'cash-outline', href: '/admin/settlements' },
  { key: 'feedback', label: '피드백·설문', icon: 'chatbox-ellipses-outline', href: '/admin/feedback' },
  { key: 'notifications', label: '알림 관리', icon: 'notifications-outline', href: '/admin/notifications' },
];

function studentMeta(student: StudentSummary) {
  return [student.grade_level, student.service_type, student.track].filter(Boolean).join(' · ') || '정보 없음';
}

function StatTile({ label, value, tone }: { label: string; value: number | string; tone?: 'danger' | 'warning' }) {
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const danger = useThemeColor({}, 'danger');
  const warning = useThemeColor({}, 'warning');
  const color = tone === 'danger' ? danger : tone === 'warning' ? warning : text;
  const border = useThemeColor({}, 'border');

  return (
    <View style={[styles.statTile, { borderColor: border }]}>
      <ThemedText style={[styles.statValue, { color }]}>{value}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: textSecondary }]}>{label}</ThemedText>
    </View>
  );
}

function SectionHeader({
  title,
  count,
  countTone,
  hint,
}: {
  title: string;
  count: number;
  countTone: 'warning' | 'danger';
  hint: string;
}) {
  const textTertiary = useThemeColor({}, 'textTertiary');

  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <Badge label={`${count}명`} tone={countTone} />
      <View style={{ flex: 1 }} />
      <ThemedText style={[styles.sectionHint, { color: textTertiary }]} numberOfLines={1}>
        {hint}
      </ThemedText>
    </View>
  );
}

function EmptyRow({ message }: { message: string }) {
  const textTertiary = useThemeColor({}, 'textTertiary');
  const border = useThemeColor({}, 'border');
  return (
    <View style={[styles.emptyRow, { borderTopColor: border }]}>
      <ThemedText style={[styles.emptyText, { color: textTertiary }]}>{message}</ThemedText>
    </View>
  );
}

/** 실장 콘솔 홈. 배정 대기·정체 학생 작업 큐를 상단에 두고, 그 아래 컨설턴트 부하와 다른 관리 화면 진입점을 둔다. */
export function AdminDashboardScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [assignTarget, setAssignTarget] = useState<StudentSummary | null>(null);
  const [assignPick, setAssignPick] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [remindingId, setRemindingId] = useState<string | null>(null);

  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');
  const danger = useThemeColor({}, 'danger');
  const warning = useThemeColor({}, 'warning');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const primaryMuted = useThemeColor({}, 'primaryMuted');

  const load = useCallback(async () => {
    try {
      const [data, { students }, { consultants }] = await Promise.all([
        getDashboard(),
        getStudents(),
        getConsultants(),
      ]);
      setState({
        status: 'ready',
        data,
        unassigned: students.filter((student) => student.status === '선생님 배정 전'),
        consultants,
      });
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

  const loadByConsultantId = useMemo(() => {
    if (state.status !== 'ready') return new Map<string, ConsultantLoad>();
    return new Map(state.data.consultantLoads.map((load) => [load.consultant.id, load]));
  }, [state]);

  function openAssign(student: StudentSummary) {
    setAssignTarget(student);
    setAssignPick(null);
  }

  async function handleConfirmAssign() {
    if (!assignTarget || !assignPick) return;
    setAssigning(true);
    try {
      const result = await assignConsultant(assignTarget.id, assignPick);
      Alert.alert('배정 완료', result.message);
      setAssignTarget(null);
      load();
    } catch (error) {
      Alert.alert('배정 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemind(student: DashboardData['stalledStudents'][number]) {
    setRemindingId(student.id);
    try {
      const days = student.daysSinceLastLesson;
      await sendChatMessage({
        studentId: student.id,
        body: `[일정 확인] 마지막 수업${days != null ? `으로부터 ${days}일이 지났어요` : ' 이후 시간이 꽤 지났어요'}. 편하실 때 다음 수업 일정을 잡아주세요.`,
      });
      Alert.alert('알림 전송', `${student.name} 학생 채팅방에 일정 확인 메시지를 보냈어요.`);
    } catch (error) {
      Alert.alert('전송 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setRemindingId(null);
    }
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

  const { data, unassigned, consultants } = state;
  const { overview, consultantLoads, stalledStudents } = data;
  const maxLoad = Math.max(1, ...consultantLoads.map((load) => load.activeStudentCount));

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primary} />}>
      <ScreenHeader title="실장 콘솔" subtitle="종합 생기부 관리 운영 현황" />

      <Card style={styles.statsCard} padded={false}>
        <View style={styles.statsGrid}>
          <StatTile label="전체 학생" value={overview.totalStudents} />
          <StatTile label="진행중" value={overview.activeStudents} />
          <StatTile label="배정 대기" value={unassigned.length} tone={unassigned.length ? 'warning' : undefined} />
          <StatTile label="입력 대기" value={overview.waitingOnboarding} />
          <StatTile label="잔여 부족" value={overview.lowCredit} tone={overview.lowCredit ? 'warning' : undefined} />
          <StatTile label="정체" value={stalledStudents.length} tone={stalledStudents.length ? 'danger' : undefined} />
        </View>
      </Card>

      <Card style={styles.queueCard} padded={false}>
        <SectionHeader title="배정 대기" count={unassigned.length} countTone="warning" hint="결제 후 담당 미지정" />
        {unassigned.length === 0 ? (
          <EmptyRow message="배정 대기 중인 학생이 없어요." />
        ) : (
          unassigned.map((student) => (
            <View key={student.id} style={[styles.queueRow, { borderTopColor: border }]}>
              <View style={styles.queueInfo}>
                <ThemedText style={styles.queueName}>{student.student_name}</ThemedText>
                <ThemedText style={[styles.queueMeta, { color: textSecondary }]} numberOfLines={1}>
                  {studentMeta(student)}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => openAssign(student)}
                style={[styles.smallButton, { backgroundColor: primary }]}>
                <ThemedText style={styles.smallButtonLabel}>담당 배정</ThemedText>
              </Pressable>
            </View>
          ))
        )}
      </Card>

      <Card style={styles.queueCard} padded={false}>
        <SectionHeader title="정체 학생" count={stalledStudents.length} countTone="danger" hint="14일 이상 수업 없음" />
        {stalledStudents.length === 0 ? (
          <EmptyRow message="정체된 학생이 없어요." />
        ) : (
          stalledStudents.map((student) => (
            <View key={student.id} style={[styles.queueRow, { borderTopColor: border }]}>
              <View style={styles.queueInfo}>
                <ThemedText style={styles.queueName}>{student.name}</ThemedText>
                <ThemedText style={[styles.queueMeta, { color: textSecondary }]} numberOfLines={1}>
                  {student.consultantName ?? '담당 미배정'} · 잔여 {student.remaining}회
                  {student.lastLessonDate ? ` · 마지막 ${student.lastLessonDate.slice(5)}` : ''}
                </ThemedText>
              </View>
              <ThemedText style={[styles.queueDays, { color: danger }]}>
                {student.daysSinceLastLesson != null ? `${student.daysSinceLastLesson}일` : '-'}
              </ThemedText>
              <Pressable
                disabled={remindingId === student.id}
                onPress={() => handleRemind(student)}
                style={[styles.ghostButton, { borderColor: border, opacity: remindingId === student.id ? 0.6 : 1 }]}>
                {remindingId === student.id ? (
                  <ActivityIndicator size="small" color={text} />
                ) : (
                  <ThemedText style={styles.ghostButtonLabel}>독촉</ThemedText>
                )}
              </Pressable>
            </View>
          ))
        )}
      </Card>

      <Card style={styles.queueCard} padded={false}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>컨설턴트별 부하</ThemedText>
          <View style={{ flex: 1 }} />
          <ThemedText style={[styles.sectionHint, { color: textTertiary }]}>
            이번 달 진행 {overview.roundsThisMonth}회 · {overview.sessionsThisMonth}건
          </ThemedText>
        </View>
        <View style={styles.loadHeaderRow}>
          <ThemedText style={[styles.loadHeaderText, { color: textTertiary }]}>컨설턴트</ThemedText>
          <ThemedText style={[styles.loadHeaderText, styles.loadHeaderNarrow, { color: textTertiary }]}>담당 학생</ThemedText>
          <ThemedText style={[styles.loadHeaderText, styles.loadHeaderNarrow, { color: textTertiary }]}>잔여 회차</ThemedText>
          <ThemedText style={[styles.loadHeaderText, styles.loadHeaderBar, { color: textTertiary }]}>부하</ThemedText>
        </View>
        {consultantLoads.map((load) => (
          <View key={load.consultant.id} style={[styles.loadRow, { borderTopColor: border }]}>
            <View style={styles.loadNameCell}>
              <ThemedText style={styles.loadName} numberOfLines={1}>
                {load.consultant.name}
              </ThemedText>
              <ThemedText style={[styles.loadTrack, { color: textTertiary }]} numberOfLines={1}>
                {load.consultant.track}
              </ThemedText>
              {load.missingRate ? <Badge label="단가 미설정" tone="warning" /> : null}
            </View>
            <ThemedText style={[styles.loadCell, styles.loadHeaderNarrow]}>{load.activeStudentCount}명</ThemedText>
            <ThemedText style={[styles.loadCell, styles.loadHeaderNarrow, { color: textSecondary }]}>
              {load.remainingRounds}회
            </ThemedText>
            <View style={[styles.loadBarTrack, styles.loadHeaderBar, { backgroundColor: surfaceSecondary }]}>
              <View
                style={[
                  styles.loadBarFill,
                  {
                    width: `${Math.round((load.activeStudentCount / maxLoad) * 100)}%`,
                    backgroundColor: load.activeStudentCount >= 18 ? warning : primary,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </Card>

      <ThemedText type="defaultSemiBold" style={styles.manageLabel}>
        관리
      </ThemedText>
      <View style={{ gap: Spacing.sm }}>
        {NAV_ITEMS.map((item) => (
          <Pressable key={item.key} onPress={() => router.push(item.href as never)}>
            {({ pressed }) => (
              <Card style={[styles.navCard, pressed && styles.navCardPressed]}>
                <View style={[styles.navIcon, { backgroundColor: primaryMuted }]}>
                  <Ionicons name={item.icon} size={20} color={primary} />
                </View>
                <ThemedText style={styles.navLabel}>{item.label}</ThemedText>
                <Ionicons name="chevron-forward" size={18} color={textSecondary} />
              </Card>
            )}
          </Pressable>
        ))}
      </View>

      <AppModal
        visible={assignTarget != null}
        title="담당 컨설턴트 배정"
        subtitle={assignTarget ? `${assignTarget.student_name} · ${studentMeta(assignTarget)}` : undefined}
        onClose={() => setAssignTarget(null)}
        onConfirm={handleConfirmAssign}
        confirmLabel="배정하기"
        confirmDisabled={!assignPick}
        confirmLoading={assigning}>
        {consultants.map((consultant) => {
          const consultantLoad = loadByConsultantId.get(consultant.id);
          const count = consultantLoad?.activeStudentCount ?? 0;
          const selected = assignPick === consultant.id;
          return (
            <Pressable
              key={consultant.id}
              onPress={() => setAssignPick(consultant.id)}
              style={[
                styles.assignOption,
                {
                  borderColor: selected ? primary : border,
                  backgroundColor: selected ? primaryMuted : 'transparent',
                },
              ]}>
              <View style={styles.assignOptionInfo}>
                <ThemedText style={styles.assignOptionName}>{consultant.name}</ThemedText>
                <ThemedText style={[styles.assignOptionMeta, { color: textSecondary }]}>
                  {consultant.track} · {consultant.role_title ?? '직책 미설정'}
                </ThemedText>
              </View>
              <ThemedText style={[styles.assignOptionLoad, { color: count >= 18 ? warning : textSecondary }]}>
                학생 {count}명
              </ThemedText>
            </Pressable>
          );
        })}
      </AppModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, paddingTop: Spacing.xxxl + 20, paddingBottom: 60, gap: Spacing.lg },
  statsCard: { overflow: 'hidden' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  statTile: { width: '33.33%', padding: Spacing.md, gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12 },
  queueCard: { overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.lg, paddingBottom: Spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionHint: { fontSize: 12 },
  emptyRow: { padding: Spacing.xxl, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
  emptyText: { fontSize: 13.5 },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  queueInfo: { flex: 1, minWidth: 0, gap: 2 },
  queueName: { fontSize: 14, fontWeight: '700' },
  queueMeta: { fontSize: 12.5 },
  queueDays: { fontSize: 13, fontWeight: '700' },
  smallButton: { height: 34, paddingHorizontal: Spacing.md, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  smallButtonLabel: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  ghostButton: {
    height: 34,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonLabel: { fontSize: 12.5, fontWeight: '600' },
  loadHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  loadHeaderText: { fontSize: 11.5, fontWeight: '600' },
  loadHeaderNarrow: { width: 68 },
  loadHeaderBar: { flex: 1 },
  loadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  loadNameCell: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  loadName: { fontSize: 13.5, fontWeight: '700' },
  loadTrack: { fontSize: 12, flexShrink: 1 },
  loadCell: { fontSize: 13 },
  loadBarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  loadBarFill: { height: 8, borderRadius: 4 },
  manageLabel: { marginTop: Spacing.xs },
  navCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  navCardPressed: { opacity: 0.85 },
  navIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
  assignOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.4,
  },
  assignOptionInfo: { flex: 1, minWidth: 0, gap: 2 },
  assignOptionName: { fontSize: 13.5, fontWeight: '700' },
  assignOptionMeta: { fontSize: 12 },
  assignOptionLoad: { fontSize: 12, fontWeight: '600' },
});
