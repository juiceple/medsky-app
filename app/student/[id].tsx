import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getStudentDetail } from '@/lib/management-api';
import type { StudentDetail } from '@/lib/management-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; detail: StudentDetail };

/** 컨설턴트/실장이 보는 학생 상세 — 회차 내부 메모까지 포함한다. */
export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    try {
      const detail = await getStudentDetail(id);
      setState({ status: 'ready', detail });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : '불러오지 못했습니다.',
      });
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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

  const { student, sessions, recordSubmission } = state.detail;

  return (
    <>
      <Stack.Screen options={{ title: student.student_name }} />
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title">{student.student_name}</ThemedText>
        <ThemedText style={styles.cardBody}>
          {student.service_type ?? '상품 미배정'} · {student.status ?? '상태 미확인'}
        </ThemedText>
        <ThemedText style={styles.cardBody}>
          잔여 {student.balance.remaining}회 (총 {student.balance.granted}회 중{' '}
          {student.balance.used}회 사용)
        </ThemedText>

        <Pressable
          style={styles.button}
          onPress={() =>
            router.push({ pathname: '/chat/[studentId]', params: { studentId: student.id } })
          }>
          <ThemedText style={styles.buttonText}>채팅 열기</ThemedText>
        </Pressable>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">생활기록부 제출</ThemedText>
          {recordSubmission ? (
            <>
              <ThemedText style={styles.cardBody}>{recordSubmission.fileName}</ThemedText>
              <ThemedText style={styles.cardMeta}>
                {new Date(recordSubmission.uploadedAt).toLocaleString('ko-KR')} 업로드
              </ThemedText>
              {recordSubmission.signedUrl ? (
                <Pressable onPress={() => Linking.openURL(recordSubmission.signedUrl as string)}>
                  <ThemedText type="link">파일 열기</ThemedText>
                </Pressable>
              ) : null}
            </>
          ) : (
            <ThemedText style={styles.cardBody}>아직 제출한 파일이 없어요.</ThemedText>
          )}
        </ThemedView>

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          회차 기록
        </ThemedText>

        {sessions.length === 0 ? (
          <ThemedText style={styles.cardBody}>아직 등록된 회차가 없어요.</ThemedText>
        ) : (
          sessions.map((session) => (
            <ThemedView key={session.id} style={styles.card}>
              <ThemedText type="defaultSemiBold">
                {session.session_round}회차 · {session.lesson_date} · {session.status}
              </ThemedText>
              {session.topic ? (
                <ThemedText style={styles.cardBody}>{session.topic}</ThemedText>
              ) : null}
              {session.student_summary ? (
                <ThemedText style={styles.cardBody}>학생 공유: {session.student_summary}</ThemedText>
              ) : null}
              {session.internal_note ? (
                <ThemedText style={styles.cardBody}>내부 메모: {session.internal_note}</ThemedText>
              ) : null}
              {session.next_action ? (
                <ThemedText style={styles.cardBody}>다음 할 일: {session.next_action}</ThemedText>
              ) : null}
              {!session.is_shared_with_student ? (
                <ThemedText style={styles.cardMeta}>학생에게 비공개</ThemedText>
              ) : null}
            </ThemedView>
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingTop: 20, gap: 12, paddingBottom: 60 },
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
  button: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
