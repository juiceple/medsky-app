import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
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

/** 실장 전용: 학생 초대 발급/재발급/취소. */
export function StudentInvitationsScreen() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [grantedSessions, setGrantedSessions] = useState('4');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const text = useThemeColor({}, 'text');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');

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
    if (!studentName.trim()) {
      Alert.alert('입력 필요', '학생 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const result = await createStudentInvitation({
        studentName: studentName.trim(),
        studentPhone: studentPhone.trim() || null,
        parentName: parentName.trim() || null,
        parentPhone: parentPhone.trim() || null,
        grantedSessions: Number(grantedSessions) || 0,
      });
      setFormOpen(false);
      setStudentName('');
      setStudentPhone('');
      setParentName('');
      setParentPhone('');
      load();
      Share.share({ message: `${studentName.trim()} 학생 초대 링크: ${result.url}` });
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
      <ScreenHeader title="학생 초대" subtitle={`${state.invitations.length}건`} />

      <Button label={formOpen ? '취소' : '새 초대 발급'} variant={formOpen ? 'secondary' : 'primary'} onPress={() => setFormOpen((prev) => !prev)} />

      {formOpen ? (
        <Card style={styles.formCard}>
          <TextInput
            style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
            value={studentName}
            onChangeText={setStudentName}
            placeholder="학생 이름"
            placeholderTextColor={textSecondary}
          />
          <TextInput
            style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
            value={studentPhone}
            onChangeText={setStudentPhone}
            placeholder="학생 연락처"
            placeholderTextColor={textSecondary}
            keyboardType="phone-pad"
          />
          <TextInput
            style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
            value={parentName}
            onChangeText={setParentName}
            placeholder="학부모 이름"
            placeholderTextColor={textSecondary}
          />
          <TextInput
            style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
            value={parentPhone}
            onChangeText={setParentPhone}
            placeholder="학부모 연락처"
            placeholderTextColor={textSecondary}
            keyboardType="phone-pad"
          />
          <TextInput
            style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
            value={grantedSessions}
            onChangeText={setGrantedSessions}
            placeholder="지급 회차"
            placeholderTextColor={textSecondary}
            keyboardType="number-pad"
          />
          <Button label="초대 링크 발급" loading={saving} onPress={handleCreate} />
        </Card>
      ) : null}

      <View style={{ gap: Spacing.md }}>
        {state.invitations.map((invitation) => (
          <Card key={invitation.id} style={styles.row}>
            <View style={styles.rowHeader}>
              <ThemedText style={styles.rowName}>{invitation.student_name ?? '이름 없음'}</ThemedText>
              <Badge label={invitation.status} tone={invitationTone(invitation.status)} />
            </View>
            <ThemedText style={[styles.rowMeta, { color: textSecondary }]}>
              {invitation.service_type ?? '상품 미지정'} · {invitation.granted_sessions}회 지급
            </ThemedText>
            {invitation.status === '발송 대기' || invitation.status === '발송 완료' ? (
              <View style={styles.rowButtons}>
                <Button
                  label="재발급"
                  size="sm"
                  variant="secondary"
                  fullWidth={false}
                  loading={busyId === invitation.id}
                  onPress={() => handleReissue(invitation)}
                />
                <Button
                  label="취소"
                  size="sm"
                  variant="ghost"
                  fullWidth={false}
                  loading={busyId === invitation.id}
                  onPress={() => handleCancel(invitation)}
                />
              </View>
            ) : null}
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, paddingTop: Spacing.xxxl + 20, paddingBottom: 60, gap: Spacing.md },
  formCard: { gap: Spacing.sm },
  input: {
    height: 44,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
  row: { gap: Spacing.xs },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 13 },
  rowButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
});
