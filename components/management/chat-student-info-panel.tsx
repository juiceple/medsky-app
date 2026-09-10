import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getReservations, getStudentDetail, sendChatMessage } from '@/lib/management-api';
import type { LessonMaterial, ReservationView, StudentDetail } from '@/lib/management-types';

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; detail: StudentDetail; nextReservation: ReservationView | null };

const CANCELLED_STATUSES = new Set<ReservationView['status']>(['취소', '예약자 취소', '완료', '노쇼']);

function formatDate(dateStr: string | null) {
  if (!dateStr) return '기록 없음';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatNextLesson(reservation: ReservationView | null) {
  if (!reservation) return '예정된 수업 없음';
  const today = new Date().toDateString();
  const day = new Date(reservation.lessonDate).toDateString() === today ? '오늘' : formatDate(reservation.lessonDate);
  return reservation.lessonTime ? `${day} ${reservation.lessonTime}` : day;
}

function fileIconFor(material: LessonMaterial): keyof typeof Ionicons.glyphMap {
  const url = material.url ?? '';
  if (/\.(png|jpe?g|gif|webp)(\?|$)/i.test(url)) return 'image-outline';
  return 'document-text-outline';
}

/**
 * 채팅 대화창 오른쪽에 붙는 "학생 정보" 패널 (태블릿 가로·PC, `useIsWorkspaceWide`).
 * 진행 회차·잔여·최근/다음 수업, 결제 안내 보내기, 최근 공유 자료를 보여준다.
 * medsky-app 이 아직 확장한 것 — mockup(4b/4c)의 우측 패널을 그대로 옮겼다.
 */
export function ChatStudentInfoPanel({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [sendingReminder, setSendingReminder] = useState(false);

  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const primary = useThemeColor({}, 'primary');
  const danger = useThemeColor({}, 'danger');
  const dangerMuted = useThemeColor({}, 'dangerMuted');

  const load = useCallback(async () => {
    try {
      const [detail, { reservations }] = await Promise.all([
        getStudentDetail(studentId),
        getReservations(studentId),
      ]);
      const upcoming = reservations
        .filter((r) => !CANCELLED_STATUSES.has(r.status))
        .sort((a, b) => `${a.lessonDate}${a.lessonTime}`.localeCompare(`${b.lessonDate}${b.lessonTime}`));
      const now = Date.now();
      const nextReservation =
        upcoming.find((r) => new Date(`${r.lessonDate}T${r.lessonTime ?? '00:00'}`).getTime() >= now) ??
        upcoming[upcoming.length - 1] ??
        null;
      setState({ status: 'ready', detail, nextReservation });
    } catch {
      setState({ status: 'error' });
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <View style={[styles.panel, styles.center, { backgroundColor: surface, borderLeftColor: border }]}>
        <ActivityIndicator color={primary} />
      </View>
    );
  }

  if (state.status === 'error') {
    return <View style={[styles.panel, { backgroundColor: surface, borderLeftColor: border }]} />;
  }

  const { detail, nextReservation } = state;
  const { student, sessions } = detail;
  const materials = sessions
    .flatMap((session) =>
      session.materials
        .filter((m) => m.is_shared_with_student)
        .map((material) => ({ material, lessonDate: session.lesson_date }))
    )
    .sort((a, b) => b.lessonDate.localeCompare(a.lessonDate))
    .slice(0, 3);

  async function handleSendReminder() {
    setSendingReminder(true);
    try {
      await sendChatMessage({
        studentId,
        body: `[결제 안내] ${student.student_name} 학생, 잔여 회차가 ${student.balance.remaining}회예요. 다음 결제를 안내드려요 — 편하실 때 확인 부탁드려요.`,
      });
    } catch (error) {
      Alert.alert('전송 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSendingReminder(false);
    }
  }

  return (
    <ScrollView
      style={[styles.panel, { backgroundColor: surface, borderLeftColor: border }]}
      contentContainerStyle={styles.panelContent}>
      <ThemedText style={[styles.sectionLabel, { color: textSecondary }]}>학생 정보</ThemedText>

      <Pressable onPress={() => router.push({ pathname: '/student/[id]', params: { id: studentId } })} style={styles.identity}>
        <Avatar name={student.student_name} size={56} />
        <ThemedText style={styles.identityName}>{student.student_name}</ThemedText>
        <ThemedText style={[styles.identityMeta, { color: textSecondary }]}>
          {student.service_type ?? '종합 생기부 관리'}({student.balance.granted}회)
        </ThemedText>
      </Pressable>

      <View style={[styles.statList, { borderTopColor: border }]}>
        <StatRow label="진행 회차" value={`${student.balance.used} / ${student.balance.granted}회`} border={border} />
        <StatRow
          label="잔여"
          value={`${student.balance.remaining}회`}
          valueColor={student.balance.remaining < 0 ? danger : undefined}
          border={border}
        />
        <StatRow label="최근 수업" value={formatDate(student.lastLessonDate)} border={border} />
        <StatRow label="다음 수업" value={formatNextLesson(nextReservation)} valueColor={nextReservation ? primary : undefined} />
      </View>

      <Pressable
        onPress={handleSendReminder}
        disabled={sendingReminder}
        style={[styles.reminderButton, { backgroundColor: dangerMuted, opacity: sendingReminder ? 0.6 : 1 }]}>
        {sendingReminder ? (
          <ActivityIndicator color={danger} size="small" />
        ) : (
          <ThemedText style={[styles.reminderButtonText, { color: danger }]}>결제 안내 보내기</ThemedText>
        )}
      </Pressable>

      <ThemedText style={[styles.sectionLabel, styles.filesLabel, { color: textSecondary }]}>
        공유한 자료 {materials.length}
      </ThemedText>
      {materials.length === 0 ? (
        <ThemedText style={[styles.filesEmpty, { color: textTertiary }]}>아직 공유한 자료가 없어요.</ThemedText>
      ) : (
        materials.map(({ material }) => (
          <Pressable
            key={material.id}
            style={styles.fileRow}
            disabled={!material.url}
            onPress={() => material.url && Linking.openURL(material.url)}>
            <Ionicons name={fileIconFor(material)} size={18} color={primary} />
            <ThemedText style={styles.fileTitle} numberOfLines={1}>
              {material.title}
            </ThemedText>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function StatRow({
  label,
  value,
  valueColor,
  border,
}: {
  label: string;
  value: string;
  valueColor?: string;
  border?: string;
}) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  return (
    <View style={[styles.statRow, border && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: border }]}>
      <ThemedText style={[styles.statLabel, { color: textSecondary }]}>{label}</ThemedText>
      <ThemedText style={[styles.statValue, valueColor && { color: valueColor }]}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: 284, flexGrow: 0, flexShrink: 0, borderLeftWidth: StyleSheet.hairlineWidth },
  center: { alignItems: 'center', justifyContent: 'center' },
  panelContent: { padding: Spacing.xl },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginBottom: Spacing.md },
  identity: { alignItems: 'center', gap: Spacing.sm, paddingBottom: Spacing.lg },
  identityName: { fontSize: 17, fontWeight: '800' },
  identityMeta: { fontSize: 13 },
  statList: { borderTopWidth: StyleSheet.hairlineWidth },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  statLabel: { fontSize: 13.5 },
  statValue: { fontSize: 13.5, fontWeight: '700' },
  reminderButton: {
    marginTop: Spacing.md,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderButtonText: { fontSize: 14, fontWeight: '700' },
  filesLabel: { marginTop: Spacing.xxl },
  filesEmpty: { fontSize: 13 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  fileTitle: { flex: 1, fontSize: 13.5, fontWeight: '600' },
});
