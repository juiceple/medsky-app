import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getSusiStudent } from '@/lib/susi-api';
import type { SusiStudent } from '@/lib/susi-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; student: SusiStudent };

const HOMEPAGE_URL = process.env.EXPO_PUBLIC_HOMEPAGE_API_URL;

function InfoRow({ label, value }: { label: string; value: string | null }) {
  const textSecondary = useThemeColor({}, 'textSecondary');

  return (
    <View style={styles.infoRow}>
      <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>{label}</ThemedText>
      <ThemedText style={styles.infoValue}>{value?.trim() ? value : '—'}</ThemedText>
    </View>
  );
}

/**
 * 컨설턴트/실장이 보는 학생 상담 신청서 — 웹 /consultant/susi/students/[id] 와 같은
 * 조회다. 대학 매칭 보고서(웹의 report 탭)는 판정 엔진이 커서 아직 앱에 옮기지
 * 않았고, 대신 웹에서 바로 열 수 있는 링크를 둔다.
 */
export function SusiStudentDetailScreen({ studentId }: { studentId: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const textSecondary = useThemeColor({}, 'textSecondary');

  const load = useCallback(async () => {
    try {
      const student = await getSusiStudent(studentId);
      setState({ status: 'ready', student });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : '불러오지 못했습니다.',
      });
    }
  }, [studentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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

  const { student } = state;
  const reportUrl = HOMEPAGE_URL
    ? `${HOMEPAGE_URL}/consultant/susi/students/${student.id}/report`
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <ThemedText style={styles.cardTitle}>학생 정보</ThemedText>
        <InfoRow label="이름" value={student.name} />
        <InfoRow label="학년" value={student.grade_level} />
        <InfoRow label="고교" value={student.high_school} />
        <InfoRow label="계열" value={student.tracks.join(', ') || null} />
        <InfoRow label="내신" value={student.gpa != null ? String(student.gpa) : null} />
        <InfoRow label="내신 비고" value={student.gpa_note} />
        <InfoRow label="모의고사 비고" value={student.mock_exam_note} />
        <InfoRow label="생기부 수준" value={student.record_level} />
        <InfoRow label="학생 연락처" value={student.student_phone} />
        <InfoRow label="학부모 연락처" value={student.parent_phone} />
      </Card>

      <Card>
        <ThemedText style={styles.cardTitle}>희망 진학</ThemedText>
        <InfoRow label="희망 대학" value={student.desired_schools} />
        <InfoRow label="희망 학과" value={student.desired_majors} />
        <InfoRow label="지원 희망" value={student.wish_applications} />
        <InfoRow label="재수 의향" value={student.retake_intent} />
      </Card>

      <Card>
        <ThemedText style={styles.cardTitle}>상담 요청사항</ThemedText>
        <ThemedText style={[styles.freeText, { color: textSecondary }]}>
          {student.questions?.trim() || student.extra_requests?.trim() || '작성된 요청사항이 없어요.'}
        </ThemedText>
      </Card>

      {reportUrl ? (
        <Button
          label="대학 매칭 보고서 웹에서 열기"
          variant="outline"
          onPress={() => Linking.openURL(reportUrl)}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: Spacing.xs },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: 3 },
  infoLabel: { fontSize: 13, flexShrink: 0 },
  infoValue: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  freeText: { fontSize: 13, lineHeight: 19 },
});
