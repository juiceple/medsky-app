import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { AppModal } from '@/components/ui/app-modal';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  cancelStudentInvitation,
  createStudentInvitation,
  getStudentInvitations,
  reissueStudentInvitation,
} from '@/lib/management-api';
import type { StudentInvitation } from '@/lib/management-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; invitations: StudentInvitation[] };

const FILTERS = ['전체', '발송 대기', '발송 완료', '수락 완료', '만료'] as const;

function invitationTone(status: StudentInvitation['status']): BadgeTone {
  switch (status) {
    case '수락 완료':
      return 'success';
    case '발송 대기':
    case '발송 완료':
      return 'primary';
    case '만료':
    case '취소':
    default:
      return 'neutral';
  }
}

const EMPTY_FORM = { studentName: '', studentPhone: '', parentName: '', parentPhone: '', grantedSessions: '4' };

/** 실장 전용: 학생 초대 발급/재발급/취소. */
export function StudentInvitationsScreen() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('전체');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const text = useThemeColor({}, 'text');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const danger = useThemeColor({}, 'danger');
  const dangerMuted = useThemeColor({}, 'dangerMuted');

  const load = useCallback(async () => {
    try {
      const { invitations } = await getStudentInvitations();
      setState({ status: 'ready', invitations });
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

  async function handleCreate() {
    if (!form.studentName.trim()) {
      Alert.alert('입력 필요', '학생 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const result = await createStudentInvitation({
        studentName: form.studentName.trim(),
        studentPhone: form.studentPhone.trim() || null,
        parentName: form.parentName.trim() || null,
        parentPhone: form.parentPhone.trim() || null,
        grantedSessions: Number(form.grantedSessions) || 0,
      });
      setFormOpen(false);
      setForm(EMPTY_FORM);
      load();
      Share.share({ message: `${form.studentName.trim()} 학생 초대 링크: ${result.url}` });
    } catch (error) {
      Alert.alert('발급 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReissue(invitation: StudentInvitation) {
    setBusyId(invitation.id);
    try {
      const result = await reissueStudentInvitation(invitation.id);
      load();
      Share.share({ message: `${invitation.student_name ?? '학생'} 초대 링크(재발급): ${result.url}` });
    } catch (error) {
      Alert.alert('재발급 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(invitation: StudentInvitation) {
    setBusyId(invitation.id);
    try {
      await cancelStudentInvitation(invitation.id);
      load();
    } catch (error) {
      Alert.alert('취소 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    if (state.status !== 'ready') return [];
    if (filter === '전체') return state.invitations;
    return state.invitations.filter((invitation) => invitation.status === filter);
  }, [state, filter]);

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

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primary} />}>
      <ScreenHeader title="학생 초대" subtitle={`발급 ${state.invitations.length}건`} />

      <View style={styles.topRow}>
        <Button label="새 초대 발급" size="sm" fullWidth={false} onPress={() => setFormOpen(true)} />
        <View style={{ flex: 1 }} />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((label) => {
          const selected = label === filter;
          return (
            <Pressable
              key={label}
              onPress={() => setFilter(label)}
              style={[styles.filterChip, { backgroundColor: selected ? primary : surfaceSecondary }]}>
              <ThemedText style={[styles.filterChipText, { color: selected ? '#fff' : text }]}>{label}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Card padded={false} style={styles.tableCard}>
        <View style={styles.headerRow}>
          <ThemedText style={[styles.headerCell, styles.colName, { color: textTertiary }]}>학생</ThemedText>
          <ThemedText style={[styles.headerCell, styles.colService, { color: textTertiary }]}>상품</ThemedText>
          <ThemedText style={[styles.headerCell, styles.colSessions, { color: textTertiary }]}>회차</ThemedText>
          <ThemedText style={[styles.headerCell, styles.colStatus, { color: textTertiary }]}>상태</ThemedText>
        </View>
        {filtered.map((invitation) => {
          const actionable = invitation.status === '발송 대기' || invitation.status === '발송 완료';
          return (
            <View key={invitation.id} style={[styles.row, { borderTopColor: border }]}>
              <View style={styles.rowTop}>
                <View style={[styles.rowInfo, styles.colName]}>
                  <ThemedText style={styles.rowName}>{invitation.student_name ?? '이름 없음'}</ThemedText>
                  {invitation.student_phone ? (
                    <ThemedText style={[styles.rowPhone, { color: textTertiary }]}>{invitation.student_phone}</ThemedText>
                  ) : null}
                </View>
                <ThemedText style={[styles.rowService, styles.colService, { color: textSecondary }]} numberOfLines={1}>
                  {invitation.service_type ?? '상품 미지정'}
                </ThemedText>
                <ThemedText style={[styles.rowSessions, styles.colSessions]}>{invitation.granted_sessions}회</ThemedText>
                <View style={styles.colStatus}>
                  <Badge label={invitation.status} tone={invitationTone(invitation.status)} />
                </View>
              </View>
              {actionable ? (
                <View style={styles.rowButtons}>
                  <Button
                    label="재발급"
                    size="sm"
                    variant="secondary"
                    fullWidth={false}
                    loading={busyId === invitation.id}
                    onPress={() => handleReissue(invitation)}
                  />
                  <Pressable
                    disabled={busyId === invitation.id}
                    onPress={() => handleCancel(invitation)}
                    style={[styles.cancelButton, { backgroundColor: dangerMuted }]}>
                    <ThemedText style={[styles.cancelButtonLabel, { color: danger }]}>취소</ThemedText>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText style={[styles.emptyText, { color: textTertiary }]}>해당하는 초대가 없어요.</ThemedText>
            <Button label="새 초대 발급" size="sm" variant="outline" fullWidth={false} onPress={() => setFormOpen(true)} />
          </View>
        ) : null}
      </Card>

      <AppModal
        visible={formOpen}
        title="새 학생 초대 발급"
        subtitle="발급 후 알림톡으로 링크가 전송됩니다"
        onClose={() => setFormOpen(false)}
        onConfirm={handleCreate}
        confirmLabel="초대 링크 발급"
        confirmLoading={saving}>
        <TextInput
          style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
          value={form.studentName}
          onChangeText={(studentName) => setForm((prev) => ({ ...prev, studentName }))}
          placeholder="학생 이름"
          placeholderTextColor={textSecondary}
        />
        <TextInput
          style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
          value={form.studentPhone}
          onChangeText={(studentPhone) => setForm((prev) => ({ ...prev, studentPhone }))}
          placeholder="학생 연락처"
          placeholderTextColor={textSecondary}
          keyboardType="phone-pad"
        />
        <TextInput
          style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
          value={form.parentName}
          onChangeText={(parentName) => setForm((prev) => ({ ...prev, parentName }))}
          placeholder="학부모 이름"
          placeholderTextColor={textSecondary}
        />
        <TextInput
          style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
          value={form.parentPhone}
          onChangeText={(parentPhone) => setForm((prev) => ({ ...prev, parentPhone }))}
          placeholder="학부모 연락처"
          placeholderTextColor={textSecondary}
          keyboardType="phone-pad"
        />
        <TextInput
          style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
          value={form.grantedSessions}
          onChangeText={(grantedSessions) => setForm((prev) => ({ ...prev, grantedSessions }))}
          placeholder="지급 회차"
          placeholderTextColor={textSecondary}
          keyboardType="number-pad"
        />
      </AppModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, paddingTop: Spacing.xxxl + 20, paddingBottom: 60, gap: Spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  filterChip: { height: 32, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  filterChipText: { fontSize: 12.5, fontWeight: '700' },
  tableCard: { overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.lg, paddingBottom: Spacing.sm },
  headerCell: { fontSize: 11.5, fontWeight: '600' },
  colName: { flex: 1.2, minWidth: 0 },
  colService: { flex: 1.3, minWidth: 0 },
  colSessions: { width: 48 },
  colStatus: { width: 82 },
  row: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowInfo: { gap: 2 },
  rowName: { fontSize: 13.5, fontWeight: '700' },
  rowPhone: { fontSize: 11.5 },
  rowService: { fontSize: 13 },
  rowSessions: { fontSize: 13, fontWeight: '600' },
  rowButtons: { flexDirection: 'row', gap: Spacing.sm },
  cancelButton: { height: 36, paddingHorizontal: Spacing.md, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  cancelButtonLabel: { fontSize: 12.5, fontWeight: '700' },
  empty: { padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'transparent' },
  emptyText: { fontSize: 13.5 },
  input: {
    height: 44,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
});
