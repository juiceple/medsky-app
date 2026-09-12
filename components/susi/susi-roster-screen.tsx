import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getSusiApplications, getSusiStudents } from '@/lib/susi-api';
import type { SusiApplicationSummary, SusiStudent } from '@/lib/susi-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; students: SusiStudent[]; applications: SusiApplicationSummary[] };

function statusTone(status: string): BadgeTone {
  if (status === '종료' || status === '취소') return 'neutral';
  if (status === '보고서 전달' || status === '리포트 발송') return 'success';
  if (status === '상담 대기' || status === '자료 대기' || status === '배정 대기') return 'warning';
  return 'primary';
}

function StudentRow({ student, onPress }: { student: SusiStudent; onPress: () => void }) {
  const textSecondary = useThemeColor({}, 'textSecondary');

  return (
    <Pressable onPress={onPress} style={styles.rowWrap}>
      {({ pressed }) => (
        <Card style={[styles.row, pressed && styles.rowPressed]}>
          <Avatar name={student.name} size={40} />
          <View style={styles.rowBody}>
            <View style={styles.rowTitleLine}>
              <ThemedText style={styles.rowTitle}>{student.name}</ThemedText>
              <Badge label={student.status} tone={statusTone(student.status)} />
            </View>
            <ThemedText style={[styles.rowMeta, { color: textSecondary }]} numberOfLines={1}>
              {student.high_school ?? '고교 미입력'} · {student.grade_level ?? '학년 미입력'}
            </ThemedText>
          </View>
        </Card>
      )}
    </Pressable>
  );
}

function ApplicationRow({
  row,
  onPress,
}: {
  row: SusiApplicationSummary;
  onPress: () => void;
}) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  const { application, submission, materialsDue, reportDue } = row;

  const dueNotice = reportDue ?? materialsDue;

  return (
    <Pressable onPress={onPress} style={styles.rowWrap}>
      {({ pressed }) => (
        <Card style={[styles.row, pressed && styles.rowPressed]}>
          <Avatar name={application.studentName} size={40} />
          <View style={styles.rowBody}>
            <View style={styles.rowTitleLine}>
              <ThemedText style={styles.rowTitle}>{application.studentName}</ThemedText>
              <Badge label={application.status} tone={statusTone(application.status)} />
            </View>
            <ThemedText style={[styles.rowMeta, { color: textSecondary }]} numberOfLines={1}>
              자료 {submission.done}/{submission.total}
              {dueNotice ? ` · ${reportDue ? '리포트 ' : '자료 '}${dueNotice.label}` : ''}
            </ThemedText>
          </View>
          {dueNotice?.overdue ? (
            <Badge label="지연" tone="danger" />
          ) : null}
        </Card>
      )}
    </Pressable>
  );
}

/** 컨설턴트/실장의 수시 원서 컨설팅 명부 — 웹 /consultant/susi 와 같은 화면이다. */
export function SusiRosterScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const textSecondary = useThemeColor({}, 'textSecondary');

  const load = useCallback(async () => {
    try {
      const [{ students }, { applications }] = await Promise.all([
        getSusiStudents(),
        getSusiApplications(),
      ]);
      setState({ status: 'ready', students, applications });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : '불러오지 못했습니다.',
      });
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
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (state.status === 'error') {
    return <StatusMessage message={state.message} onRetry={load} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <ThemedText style={styles.sectionTitle}>진행 건 · 자료·수업</ThemedText>
      {state.applications.length === 0 ? (
        <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
          담당 중인 진행 건이 없어요.
        </ThemedText>
      ) : (
        state.applications.map((row) => (
          <ApplicationRow
            key={row.application.id}
            row={row}
            onPress={() =>
              router.push({
                pathname: '/susi-application/[id]',
                params: { id: row.application.id },
              })
            }
          />
        ))
      )}

      <ThemedText style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
        학생 · 상담 신청
      </ThemedText>
      {state.students.length === 0 ? (
        <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
          담당 중인 학생이 없어요.
        </ThemedText>
      ) : (
        state.students.map((student) => (
          <StudentRow
            key={student.id}
            student={student}
            onPress={() =>
              router.push({ pathname: '/susi-student/[id]', params: { id: student.id } })
            }
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: Spacing.xs },
  sectionTitleSpaced: { marginTop: Spacing.lg },
  emptyText: { fontSize: 13, marginBottom: Spacing.sm },
  rowWrap: { marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  rowPressed: { opacity: 0.7 },
  rowBody: { flex: 1, gap: 2 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 12 },
});
