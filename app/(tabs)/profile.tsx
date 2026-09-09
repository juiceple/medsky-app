import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useConsultantOverview } from '@/hooks/use-consultant-overview';
import { useManagementViewer } from '@/hooks/use-management-viewer';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/lib/auth-context';
import {
  confirmRecordUpload,
  createRecordUploadTicket,
  getRecord,
  getSettlements,
  getStudents,
  uploadWithTicket,
} from '@/lib/management-api';
import type { RecordSubmissionView, StudentSummary } from '@/lib/management-types';
import { supabase } from '@/lib/supabase';

const ROWS: { key: 'school' | 'phone'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'school', label: '학교', icon: 'school-outline' },
  { key: 'phone', label: '연락처', icon: 'call-outline' },
];

const ROLE_LABEL: Record<string, string> = {
  consultant: '컨설턴트',
  manager: '실장',
  student: '학생',
};

function StatTile({ label, value, stacked }: { label: string; value: string; stacked?: boolean }) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  return (
    <Card style={[styles.statTile, stacked && styles.statTileStacked]}>
      <ThemedText style={[styles.statLabel, { color: textSecondary }]}>{label}</ThemedText>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
    </Card>
  );
}

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const viewerState = useManagementViewer();
  const breakpoint = useBreakpoint();
  const [record, setRecord] = useState<RecordSubmissionView | null>(null);
  const [uploading, setUploading] = useState(false);
  const [students, setStudents] = useState<StudentSummary[] | null>(null);
  const [pendingSettlement, setPendingSettlement] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: '', school: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const background = useThemeColor({}, 'background');
  const iconColor = useThemeColor({}, 'primary');
  const border = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const dangerColor = useThemeColor({}, 'danger');
  const warningColor = useThemeColor({}, 'warning');
  const successColor = useThemeColor({}, 'success');

  const viewer = viewerState.status === 'ready' ? viewerState.viewer : null;
  const isStudent = viewer?.role === 'student';
  const isConsultantLike = viewer?.role === 'consultant' || viewer?.role === 'manager';
  const overview = useConsultantOverview(isConsultantLike ? students : null);
  const isWide = breakpoint !== 'mobile';

  const loadRecord = useCallback(async () => {
    try {
      const { submission } = await getRecord();
      setRecord(submission);
    } catch {
      // 마이페이지 부가 정보라 실패해도 나머지 화면은 그대로 보여준다.
    }
  }, []);

  const loadConsultantStats = useCallback(async () => {
    if (!viewer || !isConsultantLike) return;
    try {
      const { students } = await getStudents();
      setStudents(students);
    } catch {
      // 통계 카드는 부가 정보라 실패해도 무시한다.
    }
    try {
      const { rows } = await getSettlements();
      const own = rows.find((row) => row.consultant.id === viewer.consultantId);
      setPendingSettlement(own ? own.pendingAmount : null);
    } catch {
      setPendingSettlement(null);
    }
  }, [viewer, isConsultantLike]);

  useFocusEffect(
    useCallback(() => {
      if (isStudent) loadRecord();
      loadConsultantStats();
    }, [isStudent, loadRecord, loadConsultantStats])
  );

  function startEditing() {
    setDraft({
      name: profile?.name ?? '',
      school: profile?.school ?? '',
      phone: profile?.phone ?? '',
    });
    setEditing(true);
  }

  async function handleSaveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: draft.name.trim() || null, school: draft.school.trim() || null, phone: draft.phone.trim() || null })
        .eq('user_id', user.id);
      if (error) throw error;
      await refreshProfile();
      setEditing(false);
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadRecord() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploading(true);

      const { ticket } = await createRecordUploadTicket({
        name: asset.name,
        size: asset.size ?? 0,
        type: asset.mimeType ?? '',
      });
      await uploadWithTicket(ticket, asset.uri);
      await confirmRecordUpload({ path: ticket.path, fileName: asset.name });
      await loadRecord();
      Alert.alert('업로드 완료', '생활기록부 파일을 담당 컨설턴트에게 전달했어요.');
    } catch (error) {
      Alert.alert('업로드 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  }

  const hasEmptyProfile = !profile?.school && !profile?.phone;
  const roleLabel = viewer ? ROLE_LABEL[viewer.role] : null;

  const identityBlock = (
    <>
      <View style={styles.header}>
        <Avatar name={profile?.name ?? user?.email ?? '?'} size={60} />
        <View style={styles.headerText}>
          <View style={styles.headerNameRow}>
            <ThemedText style={styles.name}>{profile?.name ?? '이름 미등록'}</ThemedText>
            {roleLabel ? (
              <ThemedText style={[styles.roleBadge, { color: iconColor, backgroundColor: `${iconColor}1A` }]}>
                {roleLabel}
              </ThemedText>
            ) : null}
          </View>
          <ThemedText style={[styles.email, { color: textSecondary }]}>{user?.email ?? '-'}</ThemedText>
        </View>
        {!editing ? (
          <Pressable onPress={startEditing} style={styles.editChip} hitSlop={8}>
            <ThemedText style={[styles.editChipText, { color: textSecondary }]}>수정</ThemedText>
          </Pressable>
        ) : null}
      </View>

      {hasEmptyProfile && !editing ? (
        <View style={[styles.warningBanner, { backgroundColor: `${warningColor}17` }]}>
          <Ionicons name="alert-circle" size={18} color={warningColor} />
          <ThemedText style={[styles.warningText, { color: warningColor }]}>
            프로필이 비어 있어요. 학교·연락처를 등록하면 학생에게 표시됩니다.
          </ThemedText>
        </View>
      ) : null}
    </>
  );

  const infoBlock = (
    <>
      {editing ? (
        <Card style={styles.editCard}>
          <EditField label="이름" value={draft.name} onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))} />
          <EditField label="학교" value={draft.school} onChangeText={(v) => setDraft((d) => ({ ...d, school: v }))} />
          <EditField label="연락처" value={draft.phone} onChangeText={(v) => setDraft((d) => ({ ...d, phone: v }))} keyboardType="phone-pad" />
          <View style={styles.editActions}>
            <Button label="취소" variant="secondary" onPress={() => setEditing(false)} disabled={saving} style={styles.editActionButton} />
            <Button label="저장" onPress={handleSaveProfile} loading={saving} style={styles.editActionButton} />
          </View>
        </Card>
      ) : (
        <Card style={styles.infoCard} padded={false}>
          {ROWS.map((row, index) => (
            <View
              key={row.key}
              style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}>
              <View style={[styles.rowIcon, { backgroundColor: `${iconColor}14` }]}>
                <Ionicons name={row.icon} size={18} color={iconColor} />
              </View>
              <View style={styles.rowText}>
                <ThemedText style={[styles.label, { color: textSecondary }]}>{row.label}</ThemedText>
                <ThemedText style={styles.value}>{profile?.[row.key] ?? '-'}</ThemedText>
              </View>
              {!profile?.[row.key] ? (
                <Pressable onPress={startEditing} hitSlop={8}>
                  <ThemedText style={[styles.rowAction, { color: iconColor }]}>등록하기</ThemedText>
                </Pressable>
              ) : null}
            </View>
          ))}
        </Card>
      )}

      {isStudent ? (
        <Card style={styles.recordCard}>
          <ThemedText style={[styles.recordTitle, { color: textSecondary }]}>생활기록부 제출</ThemedText>
          {record ? (
            <View style={styles.recordRow}>
              <Ionicons name="checkmark-circle" size={18} color={successColor} />
              <ThemedText style={styles.recordFileName} numberOfLines={1}>
                {record.file_name}
              </ThemedText>
              <Pressable onPress={handleUploadRecord} disabled={uploading} hitSlop={8}>
                <ThemedText style={[styles.recordAction, { color: iconColor }]}>
                  {uploading ? '업로드 중…' : '교체'}
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={handleUploadRecord} disabled={uploading} style={styles.recordRow}>
              <Ionicons name="cloud-upload-outline" size={18} color={iconColor} />
              <ThemedText style={[styles.recordFileName, { color: iconColor }]}>
                {uploading ? '업로드 중…' : '생활기록부 올리기'}
              </ThemedText>
            </Pressable>
          )}
        </Card>
      ) : null}
    </>
  );

  const statsBlock = isConsultantLike ? (
    <View style={isWide ? styles.statColumn : styles.statRow}>
      <StatTile
        label="이번 달 진행 회차"
        value={overview.status === 'ready' ? `${overview.data.roundsThisMonth}회` : '-'}
        stacked={isWide}
      />
      {pendingSettlement != null ? (
        <StatTile label="정산 예정" value={`${pendingSettlement.toLocaleString('ko-KR')}원`} stacked={isWide} />
      ) : (
        <StatTile label="담당 학생" value={students ? `${students.length}명` : '-'} stacked={isWide} />
      )}
    </View>
  ) : null;

  const logoutButton = (
    <Button
      label="로그아웃"
      variant="ghost"
      onPress={signOut}
      icon={<Ionicons name="log-out-outline" size={18} color={dangerColor} />}
      fullWidth={!isWide}
      style={isWide ? styles.logoutButtonWide : undefined}
    />
  );

  const showSplitColumns = isWide && statsBlock != null;

  return (
    <ScrollView style={{ backgroundColor: background }} contentContainerStyle={styles.container}>
      <View style={isWide ? [styles.wideInner, !showSplitColumns && styles.wideInnerNarrow] : undefined}>
        {identityBlock}

        {showSplitColumns ? (
          <View style={styles.wideRow}>
            <View style={styles.wideMain}>
              {infoBlock}
              <View style={styles.spacerSm} />
              {logoutButton}
            </View>
            <View style={styles.wideRail}>{statsBlock}</View>
          </View>
        ) : (
          <>
            {statsBlock}
            {infoBlock}
            <View style={isWide ? styles.spacerSm : styles.spacer} />
            {logoutButton}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function EditField({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'phone-pad';
}) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const text = useThemeColor({}, 'text');
  return (
    <View style={styles.editField}>
      <ThemedText style={[styles.editFieldLabel, { color: textSecondary }]}>{label}</ThemedText>
      <TextInput
        style={[styles.editFieldInput, { backgroundColor: surfaceSecondary, color: text }]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={label}
        placeholderTextColor={textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Spacing.xl,
    paddingTop: Spacing.xxxl + 20,
  },
  wideInner: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
  },
  wideInnerNarrow: { maxWidth: 560 },
  wideRow: { flexDirection: 'row', gap: Spacing.xl, alignItems: 'flex-start' },
  wideMain: { flex: 1.5, minWidth: 0 },
  wideRail: { flex: 1, maxWidth: 280 },
  spacerSm: { height: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  headerText: { gap: 2, flexShrink: 1, flex: 1, minWidth: 0 },
  headerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  name: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  roleBadge: { fontSize: 11, fontWeight: '700', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  email: { fontSize: 14 },
  editChip: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  editChipText: { fontSize: 13, fontWeight: '700' },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    padding: 13,
    marginBottom: Spacing.lg,
  },
  warningText: { flex: 1, fontSize: 13, fontWeight: '600' },

  statRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  statColumn: { gap: 10 },
  statTile: { flex: 1, gap: 5 },
  statTileStacked: { flex: undefined },
  statLabel: { fontSize: 11.5, fontWeight: '600' },
  statValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },

  editCard: { gap: Spacing.md, marginBottom: Spacing.lg },
  editField: { gap: 6 },
  editFieldLabel: { fontSize: 12, fontWeight: '700' },
  editFieldInput: { borderRadius: Radius.md, paddingHorizontal: Spacing.md, height: 44, fontSize: 15 },
  editActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  editActionButton: { flex: 1 },

  infoCard: { overflow: 'hidden', marginBottom: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2, minWidth: 0 },
  label: { fontSize: 12 },
  value: { fontSize: 15, fontWeight: '600' },
  rowAction: { fontSize: 13.5, fontWeight: '700' },
  recordCard: { gap: Spacing.sm, marginBottom: Spacing.lg },
  recordTitle: { fontSize: 12, fontWeight: '700' },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  recordFileName: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '600' },
  recordAction: { fontSize: 13, fontWeight: '700' },
  spacer: { flex: 1, minHeight: Spacing.xxl },
  logoutButtonWide: { alignSelf: 'flex-start', minWidth: 200 },
});
