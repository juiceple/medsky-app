import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { AppModal } from '@/components/ui/app-modal';
import { Badge } from '@/components/ui/badge';
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

function jobDotColor(status: string, colors: { success: string; danger: string; primary: string; neutral: string }) {
  if (status === '발송') return colors.success;
  if (status === '실패') return colors.danger;
  if (status === '대기' || status === '발송중') return colors.primary;
  return colors.neutral;
}

function Toggle({ on, disabled, onToggle }: { on: boolean; disabled?: boolean; onToggle: () => void }) {
  const primary = useThemeColor({}, 'primary');
  const border = useThemeColor({}, 'borderStrong');

  return (
    <Pressable
      disabled={disabled}
      onPress={onToggle}
      style={[
        styles.toggleTrack,
        { backgroundColor: on ? primary : border, opacity: disabled ? 0.6 : 1, justifyContent: on ? 'flex-end' : 'flex-start' },
      ]}>
      <View style={styles.toggleThumb} />
    </Pressable>
  );
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
  const textTertiary = useThemeColor({}, 'textTertiary');
  const text = useThemeColor({}, 'text');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const success = useThemeColor({}, 'success');
  const danger = useThemeColor({}, 'danger');
  const warning = useThemeColor({}, 'warning');

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
      await updateNotificationTemplate({ kind: row.kind, kakaoTemplateId: row.kakao_template_id, isEnabled: !row.is_enabled });
      load();
    } catch (error) {
      Alert.alert('변경 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setBusyKind(null);
    }
  }

  async function handleRegisterTemplate() {
    if (!registerFormKind || !templateId.trim()) {
      Alert.alert('입력 필요', '카카오 템플릿 ID를 입력해주세요.');
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
  const dotColors = { success, danger, primary, neutral: textTertiary };

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primary} />}>
      <ScreenHeader title="알림 관리" subtitle={`대기 ${counts.pending} · 실패 ${counts.failed}`} />

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
        <View style={{ flex: 1 }} />
        <Pressable
          disabled={runningSchedule}
          onPress={handleRunSchedule}
          style={[styles.outlineButton, { borderColor: border, opacity: runningSchedule ? 0.6 : 1 }]}>
          {runningSchedule ? (
            <ActivityIndicator size="small" color={text} />
          ) : (
            <ThemedText style={styles.outlineButtonLabel}>스케줄 지금 실행</ThemedText>
          )}
        </Pressable>
      </View>

      {tab === 'templates' ? (
        <Card padded={false} style={styles.listCard}>
          {settings.map((row) => {
            const label = NOTIFICATION_LABELS[row.kind];
            return (
              <View key={row.kind} style={[styles.templateRow, { borderTopColor: border }]}>
                <View style={styles.templateInfo}>
                  <ThemedText style={styles.rowName}>{label}</ThemedText>
                  <ThemedText style={[styles.templateMeta, { color: row.templateName ? textSecondary : warning }]}>
                    {row.templateName ? `템플릿 ${row.templateName}` : '카카오 템플릿 미연결'}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => {
                    setRegisterFormKind(row.kind);
                    setTemplateId(row.kakao_template_id ?? '');
                  }}
                  style={styles.registerLink}>
                  <ThemedText style={[styles.registerLinkLabel, { color: primary }]}>템플릿 등록</ThemedText>
                </Pressable>
                <ThemedText style={[styles.stateLabel, { color: row.is_enabled ? success : textTertiary }]}>
                  {row.is_enabled ? '켜짐' : '꺼짐'}
                </ThemedText>
                <Toggle on={row.is_enabled} disabled={busyKind === row.kind} onToggle={() => handleToggle(row)} />
              </View>
            );
          })}
        </Card>
      ) : null}

      {tab === 'log' ? (
        <Card padded={false} style={styles.listCard}>
          <View style={styles.headerRow}>
            <ThemedText style={[styles.headerCell, styles.colLabel, { color: textTertiary }]}>알림</ThemedText>
            <ThemedText style={[styles.headerCell, styles.colRecipient, { color: textTertiary }]}>수신자</ThemedText>
            <ThemedText style={[styles.headerCell, styles.colResult, { color: textTertiary }]}>결과</ThemedText>
          </View>
          {log.map((job) => (
            <View key={job.id} style={[styles.logRow, { borderTopColor: border }]}>
              <View style={styles.logTop}>
                <View style={[styles.logLabelCell, styles.colLabel]}>
                  <View style={[styles.dot, { backgroundColor: jobDotColor(job.status, dotColors) }]} />
                  <ThemedText style={styles.rowName} numberOfLines={1}>
                    {NOTIFICATION_LABELS[job.kind]}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.logRecipient, styles.colRecipient, { color: textSecondary }]} numberOfLines={1}>
                  {job.studentName ?? job.consultantName ?? job.recipient_name ?? '수신자 미상'}
                </ThemedText>
                <ThemedText
                  style={[styles.logResult, styles.colResult, { color: job.status === '실패' ? danger : textSecondary }]}
                  numberOfLines={1}>
                  {job.error_message ?? job.status}
                </ThemedText>
              </View>
              {job.status === '실패' ? (
                <Pressable onPress={() => handleRetry(job)} disabled={busyId === job.id} style={[styles.smallOutline, { borderColor: border }]}>
                  {busyId === job.id ? (
                    <ActivityIndicator size="small" color={text} />
                  ) : (
                    <ThemedText style={styles.smallOutlineLabel}>다시 시도</ThemedText>
                  )}
                </Pressable>
              ) : null}
            </View>
          ))}
          {log.length === 0 ? (
            <View style={styles.empty}>
              <ThemedText style={[styles.emptyText, { color: textTertiary }]}>발송 이력이 없어요.</ThemedText>
            </View>
          ) : null}
        </Card>
      ) : null}

      {tab === 'parents' ? (
        <Card padded={false} style={styles.listCard}>
          {links.map((link) => (
            <View key={link.studentId} style={[styles.parentRow, { borderTopColor: border }]}>
              <View style={styles.parentInfo}>
                <ThemedText style={styles.rowName}>{link.studentName}</ThemedText>
                <ThemedText style={[styles.rowMeta, { color: textSecondary }]}>
                  {link.parentName ?? '학부모 미등록'} {link.parentPhone ? `· ${link.parentPhone}` : ''}
                </ThemedText>
              </View>
              <Badge label={link.notifyEnabled ? '수신 켜짐' : '수신 꺼짐'} tone={link.notifyEnabled ? 'success' : 'neutral'} />
              <Pressable
                disabled={busyId === link.studentId}
                onPress={() => handleToggleParentNotify(link)}
                style={[styles.smallOutline, { borderColor: border }]}>
                <ThemedText style={styles.smallOutlineLabel}>{link.notifyEnabled ? '알림 끄기' : '알림 켜기'}</ThemedText>
              </Pressable>
              <Pressable
                disabled={busyId === link.studentId}
                onPress={() => handleReissueParentLink(link)}
                style={styles.registerLink}>
                <ThemedText style={[styles.registerLinkLabel, { color: primary }]}>링크 재발급</ThemedText>
              </Pressable>
            </View>
          ))}
          {links.length === 0 ? (
            <View style={styles.empty}>
              <ThemedText style={[styles.emptyText, { color: textTertiary }]}>학생이 없어요.</ThemedText>
            </View>
          ) : null}
        </Card>
      ) : null}

      <AppModal
        visible={registerFormKind != null}
        title="카카오 템플릿 등록"
        subtitle={registerFormKind ? NOTIFICATION_LABELS[registerFormKind] : undefined}
        onClose={() => setRegisterFormKind(null)}
        onConfirm={handleRegisterTemplate}
        confirmLabel="등록"
        confirmLoading={registering}>
        <TextInput
          style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
          value={templateId}
          onChangeText={setTemplateId}
          placeholder="카카오 알림톡 템플릿 ID"
          placeholderTextColor={textSecondary}
        />
      </AppModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, paddingTop: Spacing.xxxl + 20, paddingBottom: 60, gap: Spacing.md },
  tabRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tabButton: { height: 34, paddingHorizontal: Spacing.lg, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 13, fontWeight: '700' },
  outlineButton: { height: 34, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  outlineButtonLabel: { fontSize: 12.5, fontWeight: '600' },
  listCard: { overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, paddingBottom: Spacing.sm },
  headerCell: { fontSize: 11.5, fontWeight: '600' },
  colLabel: { flex: 1.4, minWidth: 0 },
  colRecipient: { flex: 1, minWidth: 0 },
  colResult: { flex: 1.6, minWidth: 0 },
  templateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  templateInfo: { flex: 1, minWidth: 160, gap: 2 },
  templateMeta: { fontSize: 11.5, fontFamily: 'ui-monospace' },
  rowName: { fontSize: 13.5, fontWeight: '700' },
  rowMeta: { fontSize: 12.5 },
  registerLink: { paddingVertical: Spacing.xs },
  registerLinkLabel: { fontSize: 12, fontWeight: '600' },
  stateLabel: { fontSize: 12, fontWeight: '700' },
  toggleTrack: { width: 46, height: 26, borderRadius: 13, padding: 3, flexDirection: 'row' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  logRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.sm },
  logTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  logLabelCell: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3 },
  logRecipient: { fontSize: 13 },
  logResult: { fontSize: 12.5 },
  smallOutline: { height: 32, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  smallOutlineLabel: { fontSize: 12.5, fontWeight: '600' },
  parentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  parentInfo: { flex: 1, minWidth: 160, gap: 2 },
  empty: { padding: Spacing.xxl, alignItems: 'center' },
  emptyText: { fontSize: 13.5 },
  input: {
    height: 44,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
});
