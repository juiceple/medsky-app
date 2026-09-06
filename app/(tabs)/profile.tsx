import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useManagementViewer } from '@/hooks/use-management-viewer';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/lib/auth-context';
import { confirmRecordUpload, createRecordUploadTicket, getRecord, uploadWithTicket } from '@/lib/management-api';
import type { RecordSubmissionView } from '@/lib/management-types';

const ROWS: { key: 'school' | 'phone'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'school', label: '학교', icon: 'school-outline' },
  { key: 'phone', label: '연락처', icon: 'call-outline' },
];

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth();
  const viewerState = useManagementViewer();
  const [record, setRecord] = useState<RecordSubmissionView | null>(null);
  const [uploading, setUploading] = useState(false);
  const background = useThemeColor({}, 'background');
  const iconColor = useThemeColor({}, 'primary');
  const border = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const dangerColor = useThemeColor({}, 'danger');
  const successColor = useThemeColor({}, 'success');

  const isStudent = viewerState.status === 'ready' && viewerState.viewer.role === 'student';

  const loadRecord = useCallback(async () => {
    try {
      const { submission } = await getRecord();
      setRecord(submission);
    } catch {
      // 마이페이지 부가 정보라 실패해도 나머지 화면은 그대로 보여준다.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isStudent) loadRecord();
    }, [isStudent, loadRecord])
  );

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

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Avatar name={profile?.name ?? user?.email ?? '?'} size={64} />
        <View style={styles.headerText}>
          <ThemedText style={styles.name}>{profile?.name ?? '이름 미등록'}</ThemedText>
          <ThemedText style={[styles.email, { color: textSecondary }]}>{user?.email ?? '-'}</ThemedText>
        </View>
      </View>

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
          </View>
        ))}
      </Card>

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

      <View style={styles.spacer} />

      <Button
        label="로그아웃"
        variant="ghost"
        onPress={signOut}
        icon={<Ionicons name="log-out-outline" size={18} color={dangerColor} />}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Spacing.xl,
    paddingTop: Spacing.xxxl + 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  headerText: { gap: 2, flexShrink: 1 },
  name: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  email: { fontSize: 14 },
  infoCard: { overflow: 'hidden' },
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
  rowText: { gap: 2, flexShrink: 1 },
  label: { fontSize: 12 },
  value: { fontSize: 15, fontWeight: '600' },
  recordCard: { marginTop: Spacing.lg, gap: Spacing.sm },
  recordTitle: { fontSize: 12, fontWeight: '700' },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  recordFileName: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '600' },
  recordAction: { fontSize: 13, fontWeight: '700' },
  spacer: { flex: 1, minHeight: Spacing.xxl },
});
