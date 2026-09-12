import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getSusiApplication,
  requestSusiLessonScheduleChange,
  saveSusiApplicationMemo,
  verifySusiSubmissionItem,
} from '@/lib/susi-api';
import type { SusiApplicationDetail } from '@/lib/susi-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; detail: SusiApplicationDetail };

function formatKstDateTime(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString('ko-KR', { hour12: false });
}

/**
 * 진행 건(원서 접수 보조) 상세 — 웹 /consultant/susi/applications/[id] 와 같은 화면.
 * 컨설턴트가 직접 하는 조작(자료 확인, 내부 메모, 수업 일정 변경 요청)을 담는다.
 * 배정·수업일 직접 확정·진학사 계정 열람 등은 실장 전용이라 웹에만 있다.
 */
export function SusiApplicationDetailScreen({ applicationId }: { applicationId: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [memoDraft, setMemoDraft] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);
  const [verifyingKey, setVerifyingKey] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('20:00');
  const [scheduleNote, setScheduleNote] = useState('');
  const [requestingSchedule, setRequestingSchedule] = useState(false);
  const textSecondary = useThemeColor({}, 'textSecondary');

  const load = useCallback(async () => {
    try {
      const detail = await getSusiApplication(applicationId);
      setState({ status: 'ready', detail });
      setMemoDraft(detail.application.internalMemo ?? '');
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : '불러오지 못했습니다.',
      });
    }
  }, [applicationId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleVerify(itemKey: string) {
    setVerifyingKey(itemKey);
    try {
      await verifySusiSubmissionItem({ applicationId, itemKey });
      await load();
    } catch (error) {
      Alert.alert('확인 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setVerifyingKey(null);
    }
  }

  async function handleSaveMemo() {
    setSavingMemo(true);
    try {
      await saveSusiApplicationMemo({ applicationId, internalMemo: memoDraft });
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSavingMemo(false);
    }
  }

  async function handleRequestSchedule() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduleDate) || !/^\d{2}:\d{2}$/.test(scheduleTime)) {
      Alert.alert('입력 확인', '날짜는 YYYY-MM-DD, 시간은 HH:MM 형식으로 입력해주세요.');
      return;
    }

    setRequestingSchedule(true);
    try {
      await requestSusiLessonScheduleChange({
        applicationId,
        lessonDate: scheduleDate,
        lessonTime: scheduleTime,
        note: scheduleNote,
      });
      await load();
      Alert.alert('요청 완료', '실장에게 일정 변경을 요청했어요.');
    } catch (error) {
      Alert.alert('요청 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setRequestingSchedule(false);
    }
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

  const { application, checklist, submission, materialsDue, reportDue } = state.detail;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <ThemedText style={styles.cardTitle}>{application.studentName}</ThemedText>
        <ThemedText style={[styles.meta, { color: textSecondary }]}>
          상태 {application.status} · 자료 {submission.done}/{submission.total}
        </ThemedText>
        {application.lessonAt ? (
          <ThemedText style={[styles.meta, { color: textSecondary }]}>
            수업 예정 {formatKstDateTime(application.lessonAt)}
          </ThemedText>
        ) : null}
        {materialsDue ? (
          <ThemedText style={[styles.meta, materialsDue.overdue && { color: '#DC2626' }]}>
            자료 마감 {materialsDue.label}
          </ThemedText>
        ) : null}
        {reportDue ? (
          <ThemedText style={[styles.meta, reportDue.overdue && { color: '#DC2626' }]}>
            리포트 기한 {reportDue.label}
          </ThemedText>
        ) : null}
      </Card>

      <Card>
        <ThemedText style={styles.cardTitle}>자료 체크리스트</ThemedText>
        {checklist.map((entry) => {
          const tone: BadgeTone = entry.verified ? 'success' : entry.done ? 'primary' : 'neutral';
          return (
            <View key={entry.key} style={styles.checklistRow}>
              <View style={styles.checklistLabel}>
                <ThemedText style={styles.checklistKey}>{entry.label}</ThemedText>
                {entry.needsAttention ? (
                  <ThemedText style={styles.attentionText}>{entry.attentionReason}</ThemedText>
                ) : null}
              </View>
              {entry.verified ? (
                <Badge label="확인함" tone={tone} />
              ) : entry.done ? (
                <Button
                  label={verifyingKey === entry.key ? '처리 중' : '확인함'}
                  size="sm"
                  variant="outline"
                  fullWidth={false}
                  disabled={verifyingKey !== null}
                  loading={verifyingKey === entry.key}
                  onPress={() => handleVerify(entry.key)}
                />
              ) : (
                <Badge label={entry.optional ? '선택' : '미제출'} tone="neutral" />
              )}
            </View>
          );
        })}
      </Card>

      <Card>
        <ThemedText style={styles.cardTitle}>수업 일정 변경 요청</ThemedText>
        {application.lessonChangeRequestedAt ? (
          <ThemedText style={[styles.meta, { color: textSecondary }]}>
            실장 확인 대기 중 · {formatKstDateTime(application.lessonChangeRequestedLessonAt)}
            {application.lessonChangeRequestedNote ? ` · ${application.lessonChangeRequestedNote}` : ''}
          </ThemedText>
        ) : null}
        <View style={styles.scheduleRow}>
          <TextInput
            style={styles.scheduleInputDate}
            value={scheduleDate}
            onChangeText={setScheduleDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={textSecondary}
          />
          <TextInput
            style={styles.scheduleInputTime}
            value={scheduleTime}
            onChangeText={setScheduleTime}
            placeholder="HH:MM"
            placeholderTextColor={textSecondary}
          />
        </View>
        <TextInput
          style={styles.memoInput}
          value={scheduleNote}
          onChangeText={setScheduleNote}
          placeholder="사유(선택)"
          placeholderTextColor={textSecondary}
        />
        <Button
          label="일정 변경 요청"
          onPress={handleRequestSchedule}
          loading={requestingSchedule}
          variant="outline"
        />
      </Card>

      <Card>
        <View style={styles.memoHeader}>
          <ThemedText style={styles.cardTitle}>내부 메모</ThemedText>
          <ThemedText style={[styles.meta, { color: textSecondary }]}>고객에게 보이지 않음</ThemedText>
        </View>
        <TextInput
          style={styles.memoTextarea}
          value={memoDraft}
          onChangeText={setMemoDraft}
          multiline
          numberOfLines={4}
          placeholder="상담 중 알게 된 배경, 다음 확인할 것 등을 남겨주세요."
          placeholderTextColor={textSecondary}
        />
        <Button label="메모 저장" onPress={handleSaveMemo} loading={savingMemo} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  checklistLabel: { flex: 1, gap: 2 },
  checklistKey: { fontSize: 13, fontWeight: '600' },
  attentionText: { fontSize: 11, color: '#D97706' },
  scheduleRow: { flexDirection: 'row', gap: Spacing.sm },
  scheduleInputDate: {
    flex: 1.4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 10,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: 13,
  },
  scheduleInputTime: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 10,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: 13,
  },
  memoInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 10,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: 13,
  },
  memoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memoTextarea: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 10,
    padding: Spacing.sm,
    fontSize: 13,
    minHeight: 90,
    textAlignVertical: 'top',
  },
});
