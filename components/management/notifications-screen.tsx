import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  getNotificationLog,
  getNotificationTemplates,
  getParentLinks,
  registerKakaoTemplate,
  reissueParentLink,
  retryNotificationJob,
  runNotificationSchedule,
  toggleParentNotify,
  updateNotificationTemplate,
} from '@/lib/management-api';
import type {
  NotificationCounts,
  NotificationKind,
  NotificationLogRow,
  NotificationSettingRow,
  ParentLinkRow,
} from '@/lib/management-types';

const NOTIFICATION_LABELS: Record<NotificationKind, string> = {
  student_invitation: '결제 완료 안내',
  student_invitation_remind: '기본정보 입력 재안내',
  student_assigned: '담당 컨설턴트 배정(학생)',
  parent_assigned: '담당 컨설턴트 배정(학부모)',
  consultant_first_lesson: '첫 수업 미편성',
  student_lesson_summary: '수업 요약',
  student_lesson_reminder: '수업 하루 전 알림',
  parent_weekly_report: '학부모 주간 리포트',
  parent_low_credit: '잔여 회차 임박',
  parent_expiry_warning: '수업 기한 임박',
  consultant_stalled: '정체 학생 독촉',
  consultant_unlogged: '회차 기록 누락',
  consultant_invitation: '컨설턴트 초대',
  manager_ops_alert: '운영 확인 필요',
};

type Tab = 'templates' | 'log' | 'parents';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      settings: NotificationSettingRow[];
      log: NotificationLogRow[];
      counts: NotificationCounts;
      links: ParentLinkRow[];
    };

function jobStatusTone(status: string): BadgeTone {
  if (status === '발송') return 'success';
  if (status === '실패') return 'danger';
  if (status === '대기' || status === '발송중') return 'primary';
  return 'neutral';
}

/** 실장 전용: 알림 템플릿 on/off·카카오 템플릿 등록, 발송 로그·재시도, 학부모 링크 관리. */
export function NotificationsScreen() {
  const [tab, setTab] = useState<Tab>('templates');
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [runningSchedule, setRunningSchedule] = useState(false);
  const [busyKind, setBusyKind] = useState<NotificationKind | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [registerFormKind, setRegisterFormKind] = useState<NotificationKind | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [registering, setRegistering] = useState(false);

  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const text = useThemeColor({}, 'text');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');

  const load = useCallback(async () => {
    try {
      const [{ settings }, { log, counts }, { links }] = await Promise.all([
        getNotificationTemplates(),
        getNotificationLog(),
        getParentLinks(),
      ]);
      setState({ status: 'ready', settings, log, counts, links });
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

  async function handleToggle(row: NotificationSettingRow) {
    setBusyKind(row.kind);
    try {
      await updateNotificationTemplate({
        kind: row.kind,
        kakaoTemplateId: row.kakao_template_id,
        isEnabled: !row.is_enabled,
      });
      load();
    } catch (error) {
      Alert.alert('변경 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setBusyKind(null);
    }
  }

  async function handleRegisterTemplate() {
    if (!registerFormKind || !templateId.trim()) {
      Alert.alert('입력 필요', '알림 종류와 카카오 템플릿 ID를 입력해주세요.');
      return;
    }
    setRegistering(true);
    try {
      const result = await registerKakaoTemplate({ kind: registerFormKind, templateId: templateId.trim() });
      Alert.alert('등록 완료', result.message);
      setRegisterFormKind(null);
      setTemplateId('');
      load();
    } catch (error) {
      Alert.alert('등록 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setRegistering(false);
    }
  }

  async function handleRetry(job: NotificationLogRow) {
    setBusyId(job.id);
    try {
      await retryNotificationJob(job.id);
      load();
    } catch (error) {
      Alert.alert('재시도 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRunSchedule() {
    setRunningSchedule(true);
    try {
      const result = await runNotificationSchedule();
      Alert.alert('스케줄 실행', result.message);
      load();
    } catch (error) {
      Alert.alert('실행 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setRunningSchedule(false);
    }
  }

  async function handleReissueParentLink(link: ParentLinkRow) {
    setBusyId(link.studentId);
    try {
      const result = await reissueParentLink(link.studentId);
      load();
      Share.share({ message: `${link.studentName} 학부모 조회 링크: ${result.url}` });
    } catch (error) {
      Alert.alert('발급 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleParentNotify(link: ParentLinkRow) {
    setBusyId(link.studentId);
    try {
      await toggleParentNotify(link.studentId, !link.notifyEnabled);
      load();
    } catch (error) {
      Alert.alert('변경 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setBusyId(null);
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

  const { settings, log, counts, links } = state;

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primary} />}>
      <ScreenHeader title="알림 관리" subtitle={`대기 ${counts.pending} · 실패 ${counts.failed}`} />

      <Button label="스케줄 지금 실행" variant="secondary" loading={runningSchedule} onPress={handleRunSchedule} />

      <View style={styles.tabRow}>
        {(['templates', 'log', 'parents'] as const).map((key) => {
          const label = key === 'templates' ? '템플릿' : key === 'log' ? '발송 로그' : '학부모 링크';
          const selected = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={[styles.tabButton, { backgroundColor: selected ? primary : surfaceSecondary }]}>
              <ThemedText style={[styles.tabText, { color: selected ? '#fff' : text }]}>{label}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      {tab === 'templates' ? (
        <View style={{ gap: Spacing.md }}>
          {settings.map((row) => {
            const label = NOTIFICATION_LABELS[row.kind];
            const editingKind = registerFormKind === row.kind;
            return (
              <Card key={row.kind} style={{ gap: Spacing.xs }}>
                <View style={styles.rowHeader}>
                  <ThemedText style={styles.rowName}>{label}</ThemedText>
                  <Badge label={row.is_enabled ? '켜짐' : '꺼짐'} tone={row.is_enabled ? 'success' : 'neutral'} />
                </View>
                <ThemedText style={[styles.rowMeta, { color: textSecondary }]}>
                  {row.templateName ? `템플릿: ${row.templateName}` : '카카오 템플릿 미연결'}
                </ThemedText>
                <View style={styles.rowButtons}>
                  <Button
                    label={row.is_enabled ? '끄기' : '켜기'}
                    size="sm"
                    variant="secondary"
                    fullWidth={false}
                    loading={busyKind === row.kind}
                    onPress={() => handleToggle(row)}
                  />
                  <Button
                    label="템플릿 등록"
                    size="sm"
                    variant="ghost"
                    fullWidth={false}
                    onPress={() => {
                      setRegisterFormKind(editingKind ? null : row.kind);
                      setTemplateId('');
                    }}
                  />
                </View>
                {editingKind ? (
                  <View style={styles.registerForm}>
                    <TextInput
                      style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
                      value={templateId}
                      onChangeText={setTemplateId}
                      placeholder="카카오 알림톡 템플릿 ID"
                      placeholderTextColor={textSecondary}
                    />
                    <Button label="등록" size="sm" loading={registering} onPress={handleRegisterTemplate} />
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      ) : null}

      {tab === 'log' ? (
        <View style={{ gap: Spacing.md }}>
          {log.map((job) => (
            <Card key={job.id} style={{ gap: Spacing.xs }}>
              <View style={styles.rowHeader}>
                <ThemedText style={styles.rowName}>{NOTIFICATION_LABELS[job.kind]}</ThemedText>
                <Badge label={job.status} tone={jobStatusTone(job.status)} />
              </View>
              <ThemedText style={[styles.rowMeta, { color: textSecondary }]}>
                {job.studentName ?? job.consultantName ?? job.recipient_name ?? '수신자 미상'}
              </ThemedText>
              {job.error_message ? (
                <ThemedText style={[styles.rowBody, { color: textSecondary }]} numberOfLines={2}>
                  {job.error_message}
                </ThemedText>
              ) : null}
              {job.status === '실패' ? (
                <Button
                  label="다시 시도"
                  size="sm"
                  variant="secondary"
                  fullWidth={false}
                  loading={busyId === job.id}
                  onPress={() => handleRetry(job)}
                />
              ) : null}
            </Card>
          ))}
          {log.length === 0 ? (
            <ThemedText style={[styles.empty, { color: textSecondary }]}>발송 이력이 없어요.</ThemedText>
          ) : null}
        </View>
      ) : null}

      {tab === 'parents' ? (
        <View style={{ gap: Spacing.md }}>
          {links.map((link) => (
            <Card key={link.studentId} style={{ gap: Spacing.xs }}>
              <View style={styles.rowHeader}>
                <ThemedText style={styles.rowName}>{link.studentName}</ThemedText>
                <Badge label={link.notifyEnabled ? '수신 켜짐' : '수신 꺼짐'} tone={link.notifyEnabled ? 'success' : 'neutral'} />
              </View>
              <ThemedText style={[styles.rowMeta, { color: textSecondary }]}>
                {link.parentName ?? '학부모 미등록'} {link.parentPhone ? `· ${link.parentPhone}` : ''}
              </ThemedText>
              <View style={styles.rowButtons}>
                <Button
                  label={link.notifyEnabled ? '알림 끄기' : '알림 켜기'}
                  size="sm"
                  variant="secondary"
                  fullWidth={false}
                  loading={busyId === link.studentId}
                  onPress={() => handleToggleParentNotify(link)}
                />
                <Button
                  label="링크 재발급"
                  size="sm"
                  variant="ghost"
                  fullWidth={false}
                  loading={busyId === link.studentId}
                  onPress={() => handleReissueParentLink(link)}
                />
              </View>
            </Card>
          ))}
          {links.length === 0 ? (
            <ThemedText style={[styles.empty, { color: textSecondary }]}>학생이 없어요.</ThemedText>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, paddingTop: Spacing.xxxl + 20, paddingBottom: 60, gap: Spacing.md },
  tabRow: { flexDirection: 'row', gap: Spacing.sm },
  tabButton: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.pill, alignItems: 'center' },
  tabText: { fontSize: 12.5, fontWeight: '700' },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowName: { fontSize: 14.5, fontWeight: '700', flexShrink: 1 },
  rowMeta: { fontSize: 12.5 },
  rowBody: { fontSize: 12.5 },
  rowButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  registerForm: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', marginTop: Spacing.xs },
  input: {
    flex: 1,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    fontSize: 13,
  },
  empty: { textAlign: 'center', marginTop: 20, fontSize: 14 },
});
