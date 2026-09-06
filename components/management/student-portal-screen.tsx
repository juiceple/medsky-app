import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Badge, lessonStatusTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  confirmRecordUpload,
  createRecordUploadTicket,
  getPortal,
  getRecord,
  setNextActionChecked,
  uploadWithTicket,
} from '@/lib/management-api';
import type {
  RecordSubmissionView,
  StudentPortalData,
  StudentPortalSession,
} from '@/lib/management-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; portal: StudentPortalData; record: RecordSubmissionView | null };

/** 학생 본인의 종합 생기부 관리 마이페이지. 웹의 /student/management/my 와 같은 데이터를 쓴다. */
export function StudentPortalScreen() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const load = useCallback(async () => {
    try {
      const [portal, recordResult] = await Promise.all([getPortal(), getRecord()]);
      setState({ status: 'ready', portal, record: recordResult.submission });
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

  async function handleToggleNextAction(sessionId: string, itemKey: string, done: boolean) {
    if (state.status !== 'ready') return;
    const previous = state;

    setState({
      ...state,
      portal: {
        ...state.portal,
        sessions: state.portal.sessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                next_actions: session.next_actions.map((item) =>
                  item.key === itemKey ? { ...item, done } : item
                ),
              }
            : session
        ),
      },
    });

    try {
      await setNextActionChecked({ sessionId, itemKey, done });
    } catch (error) {
      setState(previous);
      Alert.alert('저장 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
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
      await load();
      Alert.alert('업로드 완료', '생활기록부 파일을 담당 컨설턴트에게 전달했어요.');
    } catch (error) {
      Alert.alert('업로드 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setUploading(false);
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

  const { portal, record } = state;
  const progress = portal.balance.granted > 0 ? portal.balance.used / portal.balance.granted : 0;

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primary} />}>
      <ScreenHeader title="종합 생기부 관리" subtitle="담당 컨설턴트와 함께 준비 현황을 확인하세요" />

      <Card style={styles.row}>
        <Avatar name={portal.consultant?.name ?? '?'} size={48} />
        <View style={styles.rowText}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>담당 컨설턴트</ThemedText>
          <ThemedText style={styles.rowTitle}>
            {portal.consultant
              ? `${portal.consultant.name}${portal.consultant.track ? ` · ${portal.consultant.track}` : ''}`
              : '아직 배정되지 않았어요'}
          </ThemedText>
        </View>
      </Card>

      <Card>
        <View style={styles.balanceHeader}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>잔여 회차</ThemedText>
          <ThemedText style={styles.balanceValue}>
            <ThemedText style={[styles.balanceValue, { color: primary }]}>
              {portal.balance.remaining}
            </ThemedText>
            회 남음
          </ThemedText>
        </View>
        <ProgressBar progress={progress} />
        <ThemedText style={[styles.cardMeta, { color: textSecondary }]}>
          총 {portal.balance.granted}회 중 {portal.balance.used}회 사용
        </ThemedText>
      </Card>

      <Card>
        <ThemedText type="defaultSemiBold">생활기록부 제출</ThemedText>
        {record ? (
          <View style={styles.fileRow}>
            <Ionicons name="document-text-outline" size={20} color={primary} />
            <View style={styles.rowText}>
              <ThemedText style={styles.cardBody}>{record.file_name}</ThemedText>
              <ThemedText style={[styles.cardMeta, { color: textSecondary }]}>
                {new Date(record.uploaded_at).toLocaleString('ko-KR')} 업로드
              </ThemedText>
            </View>
          </View>
        ) : (
          <ThemedText style={[styles.cardBody, { color: textSecondary }]}>아직 제출한 파일이 없어요.</ThemedText>
        )}
        {record?.signedUrl ? (
          <Pressable onPress={() => Linking.openURL(record.signedUrl as string)} hitSlop={4}>
            <ThemedText type="link" style={styles.linkText}>
              내가 올린 파일 열기
            </ThemedText>
          </Pressable>
        ) : null}
        <Button
          label={uploading ? '업로드 중...' : record ? '다시 올리기' : '생활기록부 올리기'}
          onPress={handleUploadRecord}
          disabled={uploading}
          loading={uploading}
          size="sm"
          icon={!uploading ? <Ionicons name="cloud-upload-outline" size={16} color="#fff" /> : undefined}
          style={styles.uploadButton}
        />
      </Card>

      {portal.upcoming.length > 0 ? (
        <Card>
          <ThemedText type="defaultSemiBold">다음 수업</ThemedText>
          {portal.upcoming.map((item) => (
            <View key={item.id} style={styles.upcomingRow}>
              <Ionicons name="calendar-outline" size={16} color={textSecondary} />
              <ThemedText style={styles.cardBody}>
                {item.lesson_date} · {item.topic ?? '주제 미정'}
              </ThemedText>
            </View>
          ))}
        </Card>
      ) : null}

      <ThemedText type="subtitle" style={styles.sectionTitle}>
        회차 기록
      </ThemedText>

      {portal.sessions.length === 0 ? (
        <ThemedText style={[styles.cardBody, { color: textSecondary }]}>아직 공개된 회차 기록이 없어요.</ThemedText>
      ) : (
        portal.sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onToggleNextAction={handleToggleNextAction}
          />
        ))
      )}
    </ScrollView>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const track = useThemeColor({}, 'surfaceSecondary');
  const fill = useThemeColor({}, 'primary');
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={[styles.progressTrack, { backgroundColor: track }]}>
      <View style={[styles.progressFill, { backgroundColor: fill, width: `${clamped * 100}%` }]} />
    </View>
  );
}

function SessionCard({
  session,
  onToggleNextAction,
}: {
  session: StudentPortalSession;
  onToggleNextAction: (sessionId: string, itemKey: string, done: boolean) => void;
}) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'primary');
  const border = useThemeColor({}, 'border');

  return (
    <Card>
      <View style={styles.sessionHeader}>
        <ThemedText type="defaultSemiBold">{session.session_round}회차 · {session.lesson_date}</ThemedText>
        <Badge label={session.status} tone={lessonStatusTone(session.status)} />
      </View>
      {session.topic ? <ThemedText style={styles.cardBody}>{session.topic}</ThemedText> : null}
      {session.student_summary ? (
        <ThemedText style={[styles.cardBody, { color: textSecondary }]}>{session.student_summary}</ThemedText>
      ) : null}

      {session.materials.length > 0 ? (
        <View style={[styles.subsection, { borderTopColor: border }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>수업 자료</ThemedText>
          {session.materials.map((material) => (
            <Pressable
              key={material.id}
              disabled={!material.url}
              onPress={() => material.url && Linking.openURL(material.url)}
              style={styles.materialRow}>
              <Ionicons
                name="document-attach-outline"
                size={16}
                color={material.url ? primary : textSecondary}
              />
              <ThemedText
                type={material.url ? 'link' : 'default'}
                style={[styles.cardBody, !material.url && { color: textSecondary }]}>
                {material.title}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}

      {session.next_actions.length > 0 ? (
        <View style={[styles.subsection, { borderTopColor: border }]}>
          <ThemedText style={[styles.label, { color: textSecondary }]}>다음 수업까지 할 일</ThemedText>
          {session.next_actions.map((item) => (
            <Pressable
              key={item.key}
              style={styles.checkRow}
              onPress={() => onToggleNextAction(session.id, item.key, !item.done)}>
              <View
                style={[
                  styles.checkbox,
                  { borderColor: item.done ? primary : border },
                  item.done && { backgroundColor: primary },
                ]}>
                {item.done ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
              </View>
              <ThemedText
                style={[
                  styles.cardBody,
                  styles.checkLabel,
                  item.done && { color: textSecondary, textDecorationLine: 'line-through' },
                ]}>
                {item.text}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, paddingTop: Spacing.xxxl + 20, gap: Spacing.lg, paddingBottom: 60 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rowText: { flexShrink: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 12, fontWeight: '600' },
  cardBody: { fontSize: 14 },
  cardMeta: { fontSize: 12 },
  linkText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { marginTop: Spacing.xs },
  subsection: { marginTop: Spacing.xs, gap: Spacing.xs, paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  materialRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: { flexShrink: 1 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  uploadButton: { marginTop: Spacing.xs, alignSelf: 'flex-start', paddingHorizontal: Spacing.lg },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balanceHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  balanceValue: { fontSize: 15, fontWeight: '700' },
  progressTrack: {
    height: 8,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
});
