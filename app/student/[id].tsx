import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ReservationPanel } from '@/components/management/reservation-panel';
import { StatusMessage } from '@/components/management/status-message';
import { StudentInfoCard } from '@/components/management/student-info-card';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Badge, lessonStatusTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { deleteLessonSession, getStudentDetail } from '@/lib/management-api';
import type { LessonSessionFull, StudentDetail } from '@/lib/management-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; detail: StudentDetail };

/** 컨설턴트/실장이 보는 학생 상세 — 인적사항·진행 상태·내부 메모·수업 예약·회차 기록까지 전부 다룬다. */
export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');

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
      <View style={[styles.center, { backgroundColor: background }]}>
        <ActivityIndicator color={primary} />
      </View>
    );
  }

  if (state.status === 'error') {
    return <StatusMessage message={state.message} onRetry={load} />;
  }

  const { student, sessions, recordSubmission } = state.detail;

  const nextRoundHint =
    sessions.length > 0 ? Math.max(...sessions.map((s) => s.session_round)) + 1 : 1;

  function openSessionEditor(session: LessonSessionFull) {
    router.push({
      pathname: '/session/[sessionId]',
      params: {
        sessionId: session.id,
        studentId: student.id,
        lessonDate: session.lesson_date,
        sessionRound: String(session.session_round),
        deductedRound: String(session.deducted_round),
        status: session.status,
        topic: session.topic ?? '',
        studentSummary: session.student_summary ?? '',
        internalNote: session.internal_note ?? '',
        nextAction: session.next_action ?? '',
        isSharedWithStudent: session.is_shared_with_student ? '1' : '0',
        displayName: session.display_name ?? '',
        materials: JSON.stringify(session.materials ?? []),
      },
    });
  }

  function handleDeleteSession(session: LessonSessionFull) {
    Alert.alert('회차 기록을 삭제할까요?', '되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(session.id);
          try {
            await deleteLessonSession(student.id, session.id);
            await load();
          } catch (error) {
            Alert.alert('삭제 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: student.student_name }} />
      <ScrollView style={{ backgroundColor: background }} contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Avatar name={student.student_name} size={56} />
          <View style={styles.headerText}>
            <ThemedText style={styles.name}>{student.student_name}</ThemedText>
            <ThemedText style={[styles.cardBody, { color: textSecondary }]}>
              {student.service_type ?? '상품 미배정'} · {student.status ?? '상태 미확인'}
            </ThemedText>
          </View>
        </View>

        <Card style={styles.row}>
          <Ionicons name="wallet-outline" size={20} color={primary} />
          <ThemedText style={styles.cardBody}>
            잔여 <ThemedText style={[styles.cardBody, styles.strong, { color: primary }]}>{student.balance.remaining}</ThemedText>회
            {'  '}(총 {student.balance.granted}회 중 {student.balance.used}회 사용)
          </ThemedText>
        </Card>

        <Button
          label="채팅 열기"
          icon={<Ionicons name="chatbubble-ellipses-outline" size={17} color="#fff" />}
          onPress={() =>
            router.push({ pathname: '/chat/[studentId]', params: { studentId: student.id } })
          }
        />

        <StudentInfoCard student={student} onSaved={load} />

        <Card>
          <ThemedText type="defaultSemiBold">생활기록부 제출</ThemedText>
          {recordSubmission ? (
            <>
              <ThemedText style={styles.cardBody}>{recordSubmission.fileName}</ThemedText>
              <ThemedText style={[styles.cardMeta, { color: textSecondary }]}>
                {new Date(recordSubmission.uploadedAt).toLocaleString('ko-KR')} 업로드
              </ThemedText>
              {recordSubmission.signedUrl ? (
                <Pressable onPress={() => Linking.openURL(recordSubmission.signedUrl as string)}>
                  <ThemedText type="link">파일 열기</ThemedText>
                </Pressable>
              ) : null}
            </>
          ) : (
            <ThemedText style={[styles.cardBody, { color: textSecondary }]}>아직 제출한 파일이 없어요.</ThemedText>
          )}
        </Card>

        <ReservationPanel studentId={student.id} nextRoundHint={nextRoundHint} onChanged={load} />

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          회차 기록
        </ThemedText>

        {sessions.length === 0 ? (
          <ThemedText style={[styles.cardBody, { color: textSecondary }]}>아직 등록된 회차가 없어요.</ThemedText>
        ) : (
          sessions.map((session) => (
            <Card key={session.id}>
              <View style={styles.sessionHeader}>
                <ThemedText type="defaultSemiBold">
                  {session.session_round}회차 · {session.lesson_date}
                </ThemedText>
                <Badge label={session.status} tone={lessonStatusTone(session.status)} />
              </View>
              {session.topic ? <ThemedText style={styles.cardBody}>{session.topic}</ThemedText> : null}
              {session.student_summary ? (
                <ThemedText style={styles.cardBody}>학생 공유: {session.student_summary}</ThemedText>
              ) : null}
              {session.internal_note ? (
                <View style={[styles.noteBox, { backgroundColor: `${primary}0D` }]}>
                  <Ionicons name="lock-closed-outline" size={13} color={primary} />
                  <ThemedText style={[styles.cardBody, styles.noteText]}>
                    내부 메모: {session.internal_note}
                  </ThemedText>
                </View>
              ) : null}
              {session.next_action ? (
                <ThemedText style={styles.cardBody}>다음 할 일: {session.next_action}</ThemedText>
              ) : null}
              {!session.is_shared_with_student ? (
                <View style={styles.privateRow}>
                  <Ionicons name="eye-off-outline" size={13} color={textSecondary} />
                  <ThemedText style={[styles.cardMeta, { color: textSecondary }]}>학생에게 비공개</ThemedText>
                </View>
              ) : null}

              {session.materials.length > 0 ? (
                <View style={styles.materialsBox}>
                  {session.materials.map((material) => (
                    <Pressable
                      key={material.id}
                      style={styles.materialRow}
                      disabled={!material.url}
                      onPress={() => material.url && Linking.openURL(material.url)}>
                      <Ionicons
                        name="document-attach-outline"
                        size={15}
                        color={material.url ? primary : textSecondary}
                      />
                      <View style={styles.materialTextWrap}>
                        <ThemedText
                          type={material.url ? 'link' : 'default'}
                          style={styles.cardBody}>
                          {material.title}
                        </ThemedText>
                        {material.description ? (
                          <ThemedText style={[styles.cardMeta, { color: textSecondary }]}>
                            {material.description}
                          </ThemedText>
                        ) : null}
                      </View>
                      {!material.is_shared_with_student ? (
                        <Ionicons name="eye-off-outline" size={13} color={textSecondary} />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={styles.sessionActions}>
                <Button
                  label="수정"
                  size="sm"
                  variant="outline"
                  fullWidth={false}
                  onPress={() => openSessionEditor(session)}
                />
                <Button
                  label="삭제"
                  size="sm"
                  variant="ghost"
                  fullWidth={false}
                  loading={deletingId === session.id}
                  onPress={() => handleDeleteSession(session)}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerText: { gap: 2, flexShrink: 1 },
  name: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardBody: { fontSize: 14 },
  cardMeta: { fontSize: 12 },
  strong: { fontWeight: '700' },
  sectionTitle: { marginTop: Spacing.xs },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    borderRadius: 10,
    padding: Spacing.sm,
  },
  noteText: { flexShrink: 1 },
  privateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  materialsBox: { gap: Spacing.xs, marginTop: Spacing.xs },
  materialRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  materialTextWrap: { flex: 1, gap: 2 },
  sessionActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
});
