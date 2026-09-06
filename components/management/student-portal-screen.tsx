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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (state.status === 'error') {
    return <StatusMessage message={state.message} onRetry={load} />;
  }

  const { portal, record } = state;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <ThemedText type="title">종합 생기부 관리</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">담당 컨설턴트</ThemedText>
        <ThemedText style={styles.cardBody}>
          {portal.consultant
            ? `${portal.consultant.name}${portal.consultant.track ? ` · ${portal.consultant.track}` : ''}`
            : '아직 배정되지 않았어요.'}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">잔여 회차</ThemedText>
        <ThemedText style={styles.cardBody}>
          {portal.balance.remaining}회 남음 (총 {portal.balance.granted}회 중 {portal.balance.used}회
          사용)
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">생활기록부 제출</ThemedText>
        {record ? (
          <>
            <ThemedText style={styles.cardBody}>{record.file_name}</ThemedText>
            <ThemedText style={styles.cardMeta}>
              {new Date(record.uploaded_at).toLocaleString('ko-KR')} 업로드
            </ThemedText>
            {record.signedUrl ? (
              <Pressable onPress={() => Linking.openURL(record.signedUrl as string)}>
                <ThemedText type="link">내가 올린 파일 열기</ThemedText>
              </Pressable>
            ) : null}
          </>
        ) : (
          <ThemedText style={styles.cardBody}>아직 제출한 파일이 없어요.</ThemedText>
        )}
        <Pressable
          style={[styles.button, uploading && styles.buttonDisabled]}
          onPress={handleUploadRecord}
          disabled={uploading}>
          <ThemedText style={styles.buttonText}>
            {uploading ? '업로드 중...' : record ? '다시 올리기' : '생활기록부 올리기'}
          </ThemedText>
        </Pressable>
      </ThemedView>

      {portal.upcoming.length > 0 ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">다음 수업</ThemedText>
          {portal.upcoming.map((item) => (
            <ThemedText key={item.id} style={styles.cardBody}>
              {item.lesson_date} · {item.topic ?? '주제 미정'}
            </ThemedText>
          ))}
        </ThemedView>
      ) : null}

      <ThemedText type="subtitle" style={styles.sectionTitle}>
        회차 기록
      </ThemedText>

      {portal.sessions.length === 0 ? (
        <ThemedText style={styles.cardBody}>아직 공개된 회차 기록이 없어요.</ThemedText>
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

function SessionCard({
  session,
  onToggleNextAction,
}: {
  session: StudentPortalSession;
  onToggleNextAction: (sessionId: string, itemKey: string, done: boolean) => void;
}) {
  return (
    <ThemedView style={styles.card}>
      <ThemedText type="defaultSemiBold">
        {session.session_round}회차 · {session.lesson_date} · {session.status}
      </ThemedText>
      {session.topic ? <ThemedText style={styles.cardBody}>{session.topic}</ThemedText> : null}
      {session.student_summary ? (
        <ThemedText style={styles.cardBody}>{session.student_summary}</ThemedText>
      ) : null}

      {session.materials.length > 0 ? (
        <ThemedView style={styles.subsection}>
          <ThemedText style={styles.label}>수업 자료</ThemedText>
          {session.materials.map((material) => (
            <Pressable
              key={material.id}
              disabled={!material.url}
              onPress={() => material.url && Linking.openURL(material.url)}>
              <ThemedText type={material.url ? 'link' : 'default'} style={styles.cardBody}>
                {material.title}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      ) : null}

      {session.next_actions.length > 0 ? (
        <ThemedView style={styles.subsection}>
          <ThemedText style={styles.label}>다음 수업까지 할 일</ThemedText>
          {session.next_actions.map((item) => (
            <Pressable
              key={item.key}
              style={styles.checkRow}
              onPress={() => onToggleNextAction(session.id, item.key, !item.done)}>
              <ThemedText style={styles.checkbox}>{item.done ? '☑' : '☐'}</ThemedText>
              <ThemedText style={[styles.cardBody, item.done && styles.doneText]}>
                {item.text}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingTop: 60, gap: 16, paddingBottom: 60 },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.25)',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  cardBody: { fontSize: 13, opacity: 0.8 },
  cardMeta: { fontSize: 12, opacity: 0.5 },
  sectionTitle: { marginTop: 4 },
  subsection: { marginTop: 6, gap: 4 },
  label: { fontSize: 12, opacity: 0.5 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  checkbox: { fontSize: 16 },
  doneText: { opacity: 0.4, textDecorationLine: 'line-through' },
  button: {
    marginTop: 8,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
