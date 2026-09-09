import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ManagerStudentControls } from '@/components/management/manager-student-controls';
import { StatusMessage } from '@/components/management/status-message';
import { StudentInfoCard } from '@/components/management/student-info-card';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  bookReservation,
  deleteLessonSession,
  deleteReservation,
  getChatRooms,
  getReservations,
  getStudentDetail,
  saveLessonSession,
  settleReservation,
} from '@/lib/management-api';
import type {
  ChatRoomsSummary,
  LessonMaterialInput,
  LessonSessionFull,
  LessonSessionSaveInput,
  ReservationSaveInput,
  ReservationStatus,
  ReservationView,
  StudentDetail,
} from '@/lib/management-types';

const CANCELLED: ReservationStatus[] = ['취소', '예약자 취소'];
const SETTLED: ReservationStatus[] = ['완료', '노쇼'];
const WEEKDAY_KR = ['일', '월', '화', '수', '목', '금', '토'];

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; detail: StudentDetail; reservations: ReservationView[]; rooms: ChatRoomsSummary };

function shortDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAY_KR[d.getDay()]})`;
}

function toSaveInput(session: LessonSessionFull, patch: Partial<LessonSessionSaveInput>): LessonSessionSaveInput {
  return {
    studentId: session.student_id,
    sessionId: session.id,
    lessonDate: session.lesson_date,
    sessionRound: session.session_round,
    deductedRound: session.deducted_round,
    status: session.status,
    topic: session.topic,
    studentSummary: session.student_summary,
    internalNote: session.internal_note,
    nextAction: session.next_action,
    isSharedWithStudent: session.is_shared_with_student,
    displayName: session.display_name,
    materials: session.materials.map<LessonMaterialInput>((material) => ({
      title: material.title,
      url: material.url,
      description: material.description,
      isSharedWithStudent: material.is_shared_with_student,
    })),
    ...patch,
  };
}

/** 컨설턴트/실장이 보는 학생 상세 — 예약과 회차 기록을 하나의 타임라인으로 합치고, 학생 정보는 접어 넣었다. */
export function StudentTimelineScreen({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [sharingSessionId, setSharingSessionId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [lessonDate, setLessonDate] = useState('');
  const [lessonTime, setLessonTime] = useState('');
  const [deductedRound, setDeductedRound] = useState('1');
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [submittingReservation, setSubmittingReservation] = useState(false);
  const [busyReservationId, setBusyReservationId] = useState<string | null>(null);

  const background = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const borderStrong = useThemeColor({}, 'borderStrong');
  const primary = useThemeColor({}, 'primary');
  const primaryMuted = useThemeColor({}, 'primaryMuted');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const success = useThemeColor({}, 'success');
  const danger = useThemeColor({}, 'danger');
  const warning = useThemeColor({}, 'warning');
  const warningMuted = useThemeColor({}, 'warningMuted');

  const load = useCallback(async () => {
    try {
      const [detail, { reservations }, rooms] = await Promise.all([
        getStudentDetail(studentId),
        getReservations(studentId),
        getChatRooms(studentId),
      ]);
      setState({ status: 'ready', detail, reservations, rooms });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : '불러오지 못했습니다.',
      });
    }
  }, [studentId]);

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

  const { detail, reservations, rooms } = state;
  const { student, sessions, recordSubmission } = detail;

  const nextRoundHint = sessions.length > 0 ? Math.max(...sessions.map((s) => s.session_round)) + 1 : 1;
  const upcoming = reservations
    .filter((r) => !CANCELLED.includes(r.status) && !SETTLED.includes(r.status))
    .sort((a, b) => a.lessonDate.localeCompare(b.lessonDate));
  const nextUpcoming = upcoming[0] ?? null;
  const unsharedSession = sessions.find((s) => !s.is_shared_with_student) ?? null;

  const segmentCount = Math.max(1, Math.round(student.balance.granted));
  const filledCount = Math.max(0, Math.min(segmentCount, Math.round(student.balance.used)));

  function resetForm() {
    setEditingReservationId(null);
    setLessonDate('');
    setLessonTime('');
    setDeductedRound('1');
    setTitle('');
    setMemo('');
  }

  function openNewForm() {
    resetForm();
    setFormOpen(true);
  }

  function openEditForm(reservation: ReservationView) {
    setEditingReservationId(reservation.id);
    setLessonDate(reservation.lessonDate);
    setLessonTime(reservation.lessonTime ?? '');
    setDeductedRound(String(reservation.deductedRound));
    setTitle(reservation.title ?? '');
    setMemo(reservation.memo ?? '');
    setFormOpen(true);
  }

  async function handleSubmitReservation() {
    if (!lessonDate.trim() || !lessonTime.trim()) {
      Alert.alert('수업 날짜와 시간을 입력해주세요.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('수업 주제를 입력해주세요.');
      return;
    }
    const deducted = Number(deductedRound);
    if (!Number.isFinite(deducted) || deducted < 0) {
      Alert.alert('차감 회차는 0 이상이어야 합니다.');
      return;
    }

    const input: ReservationSaveInput = {
      reservationId: editingReservationId,
      lessonDate: lessonDate.trim(),
      lessonTime: lessonTime.trim(),
      deductedRound: deducted,
      title: title.trim(),
      memo: memo.trim() || null,
    };

    setSubmittingReservation(true);
    try {
      await bookReservation(studentId, input);
      setFormOpen(false);
      resetForm();
      await load();
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSubmittingReservation(false);
    }
  }

  function handleSettle(reservation: ReservationView, status: '완료' | '노쇼' | '취소') {
    const verb = status === '취소' ? '취소' : `${status} 처리`;
    Alert.alert(`이 수업을 ${verb}할까요?`, status !== '취소' ? '회차가 차감됩니다.' : undefined, [
      { text: '아니요', style: 'cancel' },
      {
        text: '네',
        style: status === '취소' ? 'destructive' : 'default',
        onPress: async () => {
          setBusyReservationId(reservation.id);
          try {
            await settleReservation(studentId, reservation.id, status);
            await load();
          } catch (error) {
            Alert.alert('처리 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
          } finally {
            setBusyReservationId(null);
          }
        },
      },
    ]);
  }

  function handleDeleteReservation(reservation: ReservationView) {
    Alert.alert('이 예약을 삭제할까요?', '되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setBusyReservationId(reservation.id);
          try {
            await deleteReservation(studentId, reservation.id);
            await load();
          } catch (error) {
            Alert.alert('삭제 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
          } finally {
            setBusyReservationId(null);
          }
        },
      },
    ]);
  }

  function openPrepSession(reservation: ReservationView) {
    router.push({
      pathname: '/session/[sessionId]',
      params: {
        sessionId: 'new',
        studentId,
        reservationId: reservation.id,
        lessonDate: reservation.lessonDate,
        sessionRound: String(nextRoundHint),
        deductedRound: String(reservation.deductedRound),
        status: '예정',
        topic: reservation.title ?? '',
      },
    });
  }

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
          setDeletingSessionId(session.id);
          try {
            await deleteLessonSession(student.id, session.id);
            await load();
          } catch (error) {
            Alert.alert('삭제 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
          } finally {
            setDeletingSessionId(null);
          }
        },
      },
    ]);
  }

  async function handlePublish(session: LessonSessionFull) {
    setSharingSessionId(session.id);
    try {
      await saveLessonSession(toSaveInput(session, { isSharedWithStudent: true }));
      await load();
    } catch (error) {
      Alert.alert('공개 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSharingSessionId(null);
    }
  }

  function openChat() {
    router.push({ pathname: '/chat/[studentId]', params: { studentId: student.id } });
  }

  function handleQuickRecord() {
    const pending = upcoming.find((r) => !r.lessonSessionId);
    if (pending) {
      openPrepSession(pending);
      return;
    }
    const linkedSessionId = upcoming[0]?.lessonSessionId;
    const linked = linkedSessionId ? sessions.find((s) => s.id === linkedSessionId) : null;
    if (linked) {
      openSessionEditor(linked);
      return;
    }
    Alert.alert('예약이 필요해요', '회차 기록을 작성하려면 먼저 수업 예약을 추가해주세요.', [
      { text: '취소', style: 'cancel' },
      { text: '예약 추가', onPress: openNewForm },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: student.student_name, headerBackTitle: '학생' }} />
      <View style={[styles.flex, { backgroundColor: background }]}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <ThemedText style={styles.name}>{student.student_name}</ThemedText>
              <ThemedText style={[styles.headerMeta, { color: textSecondary }]}>
                {student.service_type ?? '상품 미배정'} {student.balance.granted}회 · 잔여 {student.balance.remaining}
                회 · {student.status ?? '상태 미확인'}
              </ThemedText>
            </View>
            <Avatar name={student.student_name} size={44} />
          </View>

          <View style={[styles.card, { backgroundColor: surface }]}>
            <View style={styles.progressHeadRow}>
              <ThemedText style={[styles.progressLabel, { color: textSecondary }]}>
                {segmentCount}회 중 {filledCount}회 진행
              </ThemedText>
              {nextUpcoming ? (
                <ThemedText style={[styles.progressNext, { color: primary }]}>
                  {nextRoundHint}회차 {shortDate(nextUpcoming.lessonDate)} 예정
                </ThemedText>
              ) : null}
            </View>
            <View style={styles.segments}>
              {Array.from({ length: segmentCount }).map((_, index) => (
                <View
                  key={index}
                  style={[styles.segment, { backgroundColor: index < filledCount ? primary : surfaceSecondary }]}
                />
              ))}
            </View>
          </View>

          {unsharedSession ? (
            <View style={[styles.banner, { backgroundColor: warningMuted }]}>
              <View style={styles.bannerText}>
                <ThemedText style={styles.bannerTitle}>
                  {unsharedSession.session_round}회차 기록이 학생에게 비공개예요
                </ThemedText>
                <ThemedText style={[styles.bannerMeta, { color: textSecondary }]}>
                  {unsharedSession.lesson_date} 수업 · 요약은 {unsharedSession.student_summary ? '작성 완료' : '미작성'}
                </ThemedText>
              </View>
              <Pressable
                style={[styles.bannerButton, { backgroundColor: warning }]}
                disabled={sharingSessionId === unsharedSession.id}
                onPress={() => handlePublish(unsharedSession)}>
                {sharingSessionId === unsharedSession.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText style={styles.bannerButtonText}>공개하기</ThemedText>
                )}
              </Pressable>
            </View>
          ) : null}

          {formOpen ? (
            <Card style={styles.formCard}>
              <View style={styles.row2}>
                <View style={styles.field}>
                  <ThemedText style={styles.label}>날짜</ThemedText>
                  <TextInput
                    style={[styles.input, { color: text, backgroundColor: surfaceSecondary }]}
                    value={lessonDate}
                    onChangeText={setLessonDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={textSecondary}
                  />
                </View>
                <View style={styles.field}>
                  <ThemedText style={styles.label}>시간</ThemedText>
                  <TextInput
                    style={[styles.input, { color: text, backgroundColor: surfaceSecondary }]}
                    value={lessonTime}
                    onChangeText={setLessonTime}
                    placeholder="HH:MM"
                    placeholderTextColor={textSecondary}
                  />
                </View>
              </View>
              <View style={styles.field}>
                <ThemedText style={styles.label}>차감 회차 (0.5 단위)</ThemedText>
                <TextInput
                  style={[styles.input, { color: text, backgroundColor: surfaceSecondary }]}
                  value={deductedRound}
                  onChangeText={setDeductedRound}
                  placeholder="예: 1"
                  keyboardType="decimal-pad"
                  placeholderTextColor={textSecondary}
                />
              </View>
              <View style={styles.field}>
                <ThemedText style={styles.label}>수업 주제</ThemedText>
                <TextInput
                  style={[styles.input, { color: text, backgroundColor: surfaceSecondary }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="예: 3회차 - 자기소개서 첨삭"
                  placeholderTextColor={textSecondary}
                />
              </View>
              <View style={styles.field}>
                <ThemedText style={styles.label}>메모 (선택)</ThemedText>
                <TextInput
                  style={[styles.input, { color: text, backgroundColor: surfaceSecondary }]}
                  value={memo}
                  onChangeText={setMemo}
                  placeholder="내부 메모"
                  placeholderTextColor={textSecondary}
                />
              </View>
              <View style={styles.formActions}>
                <Button
                  label="취소"
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => {
                    setFormOpen(false);
                    resetForm();
                  }}
                />
                <Button
                  label={editingReservationId ? '일정 변경' : '예약하기'}
                  size="sm"
                  fullWidth={false}
                  loading={submittingReservation}
                  onPress={handleSubmitReservation}
                />
              </View>
            </Card>
          ) : null}

          <View style={styles.timeline}>
            {upcoming.map((reservation, index) => (
              <View key={reservation.id} style={styles.nodeRow}>
                <View style={styles.nodeRail}>
                  <View style={[styles.dot, styles.dotDashed, { borderColor: primary, backgroundColor: surface }]}>
                    <Ionicons name="add" size={15} color={primary} />
                  </View>
                  <View style={[styles.line, { backgroundColor: border }]} />
                </View>
                <View style={styles.nodeBody}>
                  <View style={[styles.nodeCard, styles.upcomingCard, { borderColor: primary, backgroundColor: primaryMuted }]}>
                    <View style={styles.nodeCardHead}>
                      <ThemedText style={styles.nodeTitle}>
                        {nextRoundHint + index}회차 · {shortDate(reservation.lessonDate)}{' '}
                        {reservation.lessonTime ?? ''}
                      </ThemedText>
                      <Badge label={reservation.status} tone="primary" />
                    </View>
                    {reservation.title ? (
                      <ThemedText style={[styles.nodeTopic, { color: textSecondary }]}>{reservation.title}</ThemedText>
                    ) : null}
                    <ThemedText style={[styles.nodeMeta, { color: textSecondary }]}>
                      차감 {reservation.deductedRound}회 · {reservation.durationMinutes}분
                    </ThemedText>
                    <View style={styles.actionsRow}>
                      <Button
                        label="완료 처리"
                        size="sm"
                        fullWidth={false}
                        loading={busyReservationId === reservation.id}
                        onPress={() => handleSettle(reservation, '완료')}
                      />
                      <Button
                        label="노쇼"
                        size="sm"
                        variant="secondary"
                        fullWidth={false}
                        loading={busyReservationId === reservation.id}
                        onPress={() => handleSettle(reservation, '노쇼')}
                      />
                      <Button
                        label="일정 변경"
                        size="sm"
                        variant="outline"
                        fullWidth={false}
                        onPress={() => openEditForm(reservation)}
                      />
                    </View>
                    <View style={styles.actionsRow}>
                      {!reservation.lessonSessionId ? (
                        <Button
                          label="회차 기록 미리 작성"
                          size="sm"
                          variant="outline"
                          fullWidth={false}
                          onPress={() => openPrepSession(reservation)}
                        />
                      ) : null}
                      <Button
                        label="취소 처리"
                        size="sm"
                        variant="ghost"
                        fullWidth={false}
                        loading={busyReservationId === reservation.id}
                        onPress={() => handleSettle(reservation, '취소')}
                      />
                      {!reservation.lessonSessionId ? (
                        <Pressable onPress={() => handleDeleteReservation(reservation)} style={styles.deleteIcon}>
                          <Ionicons name="trash-outline" size={16} color={danger} />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            ))}

            {sessions.map((session) => {
              const open = expandedSessionId === session.id;
              const shareTone: BadgeTone = session.is_shared_with_student ? 'success' : 'warning';
              const shareLabel = session.is_shared_with_student ? '공개' : '비공개';
              const dotVisual =
                session.status === '노쇼'
                  ? { bg: surfaceSecondary, border: danger, icon: 'close' as const, fg: danger }
                  : session.status === '취소'
                    ? { bg: surfaceSecondary, border: borderStrong, icon: 'close' as const, fg: textSecondary }
                    : { bg: success, border: success, icon: 'checkmark' as const, fg: '#fff' };
              const chatCount = rooms.sessions[session.id]?.messageCount ?? 0;

              return (
                <View key={session.id} style={styles.nodeRow}>
                  <View style={styles.nodeRail}>
                    <View style={[styles.dot, { backgroundColor: dotVisual.bg, borderColor: dotVisual.border }]}>
                      <Ionicons name={dotVisual.icon} size={13} color={dotVisual.fg} />
                    </View>
                    <View style={[styles.line, { backgroundColor: border }]} />
                  </View>
                  <View style={styles.nodeBody}>
                    <Pressable
                      onPress={() => setExpandedSessionId((current) => (current === session.id ? null : session.id))}
                      style={[styles.nodeCard, { backgroundColor: surface, borderColor: border }]}>
                      <View style={styles.nodeCardHead}>
                        <ThemedText style={styles.nodeTitle}>
                          {session.display_name || `${session.session_round}회차`} · {session.lesson_date}
                        </ThemedText>
                        <Badge label={shareLabel} tone={shareTone} />
                      </View>
                      <ThemedText style={[styles.nodeTopic, { color: textSecondary }]}>
                        {session.topic ?? session.student_summary ?? '아직 작성된 요약이 없어요.'}
                      </ThemedText>
                    </Pressable>

                    {open ? (
                      <View style={[styles.expandCard, { backgroundColor: surface }]}>
                        <View style={styles.expandSection}>
                          <ThemedText style={[styles.expandLabel, { color: textSecondary }]}>학생 공개 요약</ThemedText>
                          <ThemedText style={styles.expandBody}>
                            {session.student_summary ?? '아직 작성된 요약이 없어요.'}
                          </ThemedText>
                        </View>

                        {session.internal_note ? (
                          <View style={[styles.expandSection, styles.expandSectionBordered, { borderTopColor: border }]}>
                            <ThemedText style={[styles.expandLabel, { color: textSecondary }]}>
                              🔒 내부 메모 · 학생에게 안 보임
                            </ThemedText>
                            <View style={[styles.noteBox, { backgroundColor: `${primary}0D` }]}>
                              <ThemedText style={styles.expandBody}>{session.internal_note}</ThemedText>
                            </View>
                          </View>
                        ) : null}

                        {session.materials.length > 0 ? (
                          <View style={[styles.expandSection, styles.expandSectionBordered, { borderTopColor: border }]}>
                            {session.materials.map((material) => (
                              <Pressable
                                key={material.id}
                                style={[styles.materialRow, { backgroundColor: surfaceSecondary }]}
                                disabled={!material.url}
                                onPress={() => material.url && Linking.openURL(material.url)}>
                                <Ionicons
                                  name="document-attach-outline"
                                  size={15}
                                  color={material.url ? primary : textSecondary}
                                />
                                <ThemedText
                                  style={[styles.materialText, { color: material.url ? primary : text }]}
                                  numberOfLines={1}>
                                  {material.title}
                                </ThemedText>
                              </Pressable>
                            ))}
                          </View>
                        ) : null}

                        <View style={styles.actionsRow}>
                          <Button
                            label="기록 수정"
                            size="sm"
                            variant="outline"
                            fullWidth={false}
                            onPress={() => openSessionEditor(session)}
                          />
                          <Button
                            label={`대화 ${chatCount}`}
                            size="sm"
                            variant="secondary"
                            fullWidth={false}
                            onPress={openChat}
                          />
                          <Button
                            label="삭제"
                            size="sm"
                            variant="ghost"
                            fullWidth={false}
                            loading={deletingSessionId === session.id}
                            onPress={() => handleDeleteSession(session)}
                          />
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}

            <View style={styles.nodeRow}>
              <View style={styles.nodeRail}>
                <View style={[styles.dot, styles.dotDashed, { borderColor: borderStrong }]} />
              </View>
              <View style={styles.nodeBody}>
                <View style={[styles.originCard, { borderColor: borderStrong }]}>
                  <ThemedText style={styles.originTitle}>시작 · 생활기록부 제출</ThemedText>
                  {recordSubmission ? (
                    <View style={styles.originRow}>
                      <Ionicons name="checkmark-circle" size={17} color={success} />
                      <ThemedText style={[styles.originFile, { color: textSecondary }]} numberOfLines={1}>
                        {recordSubmission.fileName}
                      </ThemedText>
                      {recordSubmission.signedUrl ? (
                        <Pressable onPress={() => Linking.openURL(recordSubmission.signedUrl as string)}>
                          <ThemedText style={[styles.originAction, { color: primary }]}>열기</ThemedText>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : (
                    <ThemedText style={[styles.originFile, { color: textSecondary }]}>
                      아직 제출한 파일이 없어요.
                    </ThemedText>
                  )}
                </View>
              </View>
            </View>
          </View>

          <StudentInfoCard student={student} onSaved={load} />
          <ManagerStudentControls student={student} onSaved={load} />
        </ScrollView>

        <View style={[styles.actionBar, { backgroundColor: surface, borderTopColor: border }]}>
          <Button
            label="채팅 열기"
            icon={<Ionicons name="chatbubble-ellipses-outline" size={17} color="#fff" />}
            onPress={openChat}
            style={styles.flexButton}
          />
          <Button label="기록 작성" variant="secondary" onPress={handleQuickRecord} style={styles.flexButton} />
          <Pressable
            style={[styles.addButton, { borderColor: primary }]}
            onPress={() => (formOpen ? setFormOpen(false) : openNewForm())}>
            <Ionicons name="add" size={22} color={primary} />
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md },
  headerText: { flexShrink: 1, gap: 2 },
  name: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  headerMeta: { fontSize: 13.5 },
  card: { borderRadius: Radius.lg, padding: 14, gap: 10 },
  progressHeadRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, fontWeight: '600' },
  progressNext: { fontSize: 13, fontWeight: '700' },
  segments: { flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 8, borderRadius: Radius.pill },
  banner: {
    borderRadius: Radius.lg,
    padding: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerText: { flex: 1, minWidth: 0 },
  bannerTitle: { fontSize: 13.5, fontWeight: '700' },
  bannerMeta: { fontSize: 12, marginTop: 2 },
  bannerButton: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerButtonText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  formCard: { gap: Spacing.sm },
  row2: { flexDirection: 'row', gap: Spacing.md },
  field: { flex: 1, gap: Spacing.xs },
  label: { fontSize: 13, fontWeight: '700' },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 15,
  },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.xs },
  timeline: { flexDirection: 'column' },
  nodeRow: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  nodeRail: { width: 26, alignItems: 'center', flexShrink: 0, paddingTop: 4 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotDashed: { borderStyle: 'dashed' },
  line: { flex: 1, width: 2, minHeight: 14 },
  nodeBody: { flex: 1, minWidth: 0, paddingBottom: 14 },
  nodeCard: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, gap: 6 },
  upcomingCard: { gap: 8 },
  nodeCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nodeTitle: { fontSize: 15, fontWeight: '700' },
  nodeTopic: { fontSize: 13.5, lineHeight: 19 },
  nodeMeta: { fontSize: 12 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  deleteIcon: { padding: 6 },
  expandCard: { borderRadius: Radius.lg, padding: 14, marginTop: 8, gap: 12 },
  expandSection: { gap: 4 },
  expandSectionBordered: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 6 },
  expandLabel: { fontSize: 11.5, fontWeight: '700' },
  expandBody: { fontSize: 14, lineHeight: 21 },
  noteBox: { borderRadius: 10, padding: 10 },
  materialRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12 },
  materialText: { fontSize: 13.5, fontWeight: '600', flexShrink: 1 },
  originCard: { borderWidth: 1, borderStyle: 'dashed', borderRadius: Radius.lg, padding: 14, gap: 8 },
  originTitle: { fontSize: 13, fontWeight: '700' },
  originRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  originFile: { flex: 1, minWidth: 0, fontSize: 13 },
  originAction: { fontSize: 12, fontWeight: '600' },
  actionBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  flexButton: { flex: 1 },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
