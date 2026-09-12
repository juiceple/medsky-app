import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  consumeJungsiFeedback,
  getJungsiOnboarding,
  markJungsiReportSent,
  updateJungsiProgress,
} from '@/lib/jungsi-api';
import { JUNGSI_CONSULTANT_STATUSES, type JungsiOnboardingWithFiles } from '@/lib/jungsi-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; onboarding: JungsiOnboardingWithFiles };

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
 * 온보딩 상세 — 웹 /consultant/jungsi/[onboardingId] 와 같은 화면. 컨설턴트가 직접
 * 하는 조작(진행 상태, 리포트 전달, 사후 피드백 사용)을 담는다. 배정·마감일·취소는
 * 실장 전용이라 웹에만 있다. 제출 자료는 확인 상태만 보여주고 파일은 열지 않는다
 * (웹의 컨설턴트 워크스페이스와 같다 — 검증은 실장의 몫).
 */
export function JungsiOnboardingDetailScreen({ onboardingId }: { onboardingId: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState('');
  const [savingReport, setSavingReport] = useState(false);
  const [consumingFeedback, setConsumingFeedback] = useState(false);
  const textSecondary = useThemeColor({}, 'textSecondary');

  const load = useCallback(async () => {
    try {
      const onboarding = await getJungsiOnboarding(onboardingId);
      setState({ status: 'ready', onboarding });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : '불러오지 못했습니다.',
      });
    }
  }, [onboardingId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleUpdateStatus(status: (typeof JUNGSI_CONSULTANT_STATUSES)[number]) {
    setUpdatingStatus(status);
    try {
      await updateJungsiProgress({ onboardingId, status });
      await load();
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setUpdatingStatus(null);
    }
  }

  async function handleSaveReport() {
    if (!reportUrl.trim()) {
      Alert.alert('입력 확인', '리포트 링크를 입력해주세요.');
      return;
    }
    setSavingReport(true);
    try {
      await markJungsiReportSent({ onboardingId, reportUrl: reportUrl.trim() });
      await load();
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSavingReport(false);
    }
  }

  async function handleConsumeFeedback() {
    setConsumingFeedback(true);
    try {
      await consumeJungsiFeedback(onboardingId);
      await load();
    } catch (error) {
      Alert.alert('처리 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setConsumingFeedback(false);
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

  const { onboarding } = state;
  const feedbackLeft = onboarding.feedback_quota - onboarding.feedback_used;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <ThemedText style={styles.cardTitle}>
          {onboarding.student_name ?? onboarding.buyer_name ?? '이름 미입력'}
        </ThemedText>
        <InfoRow label="학교" value={onboarding.high_school} />
        <InfoRow label="학년" value={onboarding.grade_level} />
        <InfoRow label="계열" value={onboarding.track} />
        <InfoRow label="희망 대학" value={onboarding.desired_schools} />
        <InfoRow label="희망 학과" value={onboarding.desired_majors} />
        <InfoRow
          label="수업 일정"
          value={
            onboarding.lesson_date
              ? `${onboarding.lesson_date} ${onboarding.lesson_time ?? ''}`.trim()
              : null
          }
        />
        <InfoRow label="학생 연락처" value={onboarding.student_phone} />
        <InfoRow label="학부모 연락처" value={onboarding.parent_phone} />
      </Card>

      <Card>
        <ThemedText style={styles.cardTitle}>제출 자료</ThemedText>
        {onboarding.files.length === 0 ? (
          <ThemedText style={[styles.meta, { color: textSecondary }]}>
            아직 제출된 자료가 없어요.
          </ThemedText>
        ) : (
          onboarding.files.map((file) => (
            <View key={file.id} style={styles.checklistRow}>
              <ThemedText style={styles.checklistKey}>{file.kind}</ThemedText>
              <Badge
                label={file.check_result}
                tone={
                  file.check_result === '정상'
                    ? 'success'
                    : file.check_result === '재발급 필요'
                      ? 'danger'
                      : 'neutral'
                }
              />
            </View>
          ))
        )}
      </Card>

      <Card>
        <ThemedText style={styles.cardTitle}>진행 상태</ThemedText>
        <ThemedText style={[styles.meta, { color: textSecondary }]}>
          여기서 바꾼 상태는 고객의 진행 상황 페이지에 그대로 보여요.
        </ThemedText>
        <View style={styles.statusRow}>
          {JUNGSI_CONSULTANT_STATUSES.map((status) => (
            <Button
              key={status}
              label={status}
              size="sm"
              fullWidth={false}
              variant={onboarding.status === status ? 'primary' : 'outline'}
              loading={updatingStatus === status}
              disabled={updatingStatus !== null}
              onPress={() => handleUpdateStatus(status)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <ThemedText style={styles.cardTitle}>최종 리포트</ThemedText>
        {onboarding.report_sent_at ? (
          <ThemedText style={[styles.meta, { color: textSecondary }]}>
            전달 완료 · {new Date(onboarding.report_sent_at).toLocaleString('ko-KR', { hour12: false })}
          </ThemedText>
        ) : (
          <>
            <TextInput
              style={styles.textInput}
              value={reportUrl}
              onChangeText={setReportUrl}
              placeholder="https://..."
              placeholderTextColor={textSecondary}
              autoCapitalize="none"
            />
            <ThemedText style={[styles.meta, { color: textSecondary }]}>
              저장하면 고객에게 리포트 안내가 함께 예약돼요.
            </ThemedText>
            <Button label="리포트 전달 기록" onPress={handleSaveReport} loading={savingReport} />
          </>
        )}
      </Card>

      <Card>
        <ThemedText style={styles.cardTitle}>사후 피드백</ThemedText>
        <ThemedText style={[styles.meta, { color: textSecondary }]}>
          {onboarding.feedback_used}/{onboarding.feedback_quota}회 사용
          {feedbackLeft > 0 ? ` · ${feedbackLeft}회 남음` : ' · 모두 사용'}
        </ThemedText>
        {feedbackLeft > 0 ? (
          <Button
            label="피드백 1회 사용"
            variant="outline"
            onPress={handleConsumeFeedback}
            loading={consumingFeedback}
          />
        ) : null}
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
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: 3 },
  infoLabel: { fontSize: 13, flexShrink: 0 },
  infoValue: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  checklistKey: { fontSize: 13, fontWeight: '600' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  textInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: 10,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: 13,
  },
});
