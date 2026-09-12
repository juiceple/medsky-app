import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { DetailNavShell } from '@/components/navigation/detail-nav-shell';
import { ManagerStudentControls } from '@/components/management/manager-student-controls';
import { ReservationCalendar } from '@/components/management/reservation-calendar';
import { StatusMessage } from '@/components/management/status-message';
import { ReservationPanel, type ReservationRecordSlot } from '@/components/management/reservation-panel';
import { SessionRecordPanel } from '@/components/management/session-record-panel';
import { StudentInfoPanel } from '@/components/management/student-info-panel';
import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useBreakpoint, useIsWorkspaceWide } from '@/hooks/use-breakpoint';
import { useManagementViewer } from '@/hooks/use-management-viewer';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  deleteLessonSession,
  getChatRooms,
  getReservations,
  getStudentDetail,
  saveInternalMemo,
  saveLessonSession,
  updateStudentStatus,
} from '@/lib/management-api';
import {
  STUDENT_STATUSES,
  type ChatRoomsSummary,
  type LessonMaterialInput,
  type LessonSessionFull,
  type LessonSessionSaveInput,
  type ReservationStatus,
  type ReservationView,
  type StudentDetail,
  type StudentStatus,
} from '@/lib/management-types';
import { classServiceFromServiceType } from '@/lib/reservation-rules';

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

/** 태블릿/PC 넓은 화면에서 여러 레이아웃이 공유하는 데이터·핸들러 묶음. */
type WideCtx = {
  studentId: string;
  detail: StudentDetail;
  reservations: ReservationView[];
  rooms: ChatRoomsSummary;
  hideStatus: boolean;
  segmentCount: number;
  filledCount: number;
  nextLabel: string | null;
  unsharedSession: LessonSessionFull | null;
  sharingSessionId: string | null;
  onPublish: (session: LessonSessionFull) => void;
  expandedSessionId: string | null;
  onToggleExpand: (id: string) => void;
  selectedSession: LessonSessionFull | null;
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string) => void;
  deletingSessionId: string | null;
  onDeleteSession: (session: LessonSessionFull) => void;
  onEditSession: (session: LessonSessionFull) => void;
  openChat: () => void;
  renderReservationRecord: (reservation: ReservationView) => ReservationRecordSlot;
  reload: () => Promise<void>;
  memo: string;
  onMemoChange: (text: string) => void;
  memoDirty: boolean;
  savingMemo: boolean;
  onSaveMemo: () => void;
  statusSaving: StudentStatus | null;
  onChangeStatus: (status: StudentStatus) => void;
};

/** 컨설턴트/실장이 보는 학생 상세 — 수업 예약(웹의 StudentReservationPanel 과 같은 구성)과 회차 기록 타임라인을 담는다. */
export function StudentTimelineScreen({ studentId }: { studentId: string }) {
  const router = useRouter();
  const breakpoint = useBreakpoint();
  const isWorkspaceWide = useIsWorkspaceWide();
  const viewerState = useManagementViewer();
  // 진행 상태는 어드민이 관리하므로 컨설턴트에게는 숨긴다 (실장은 계속 봄).
  const hideStatus = viewerState.status === 'ready' && viewerState.viewer.role === 'consultant';
  const [state, setState] = useState<State>({ status: 'loading' });
  const [headerOpen, setHeaderOpen] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [sharingSessionId, setSharingSessionId] = useState<string | null>(null);
  const [memoOverride, setMemoOverride] = useState<string | null>(null);
  const [savingMemo, setSavingMemo] = useState(false);
  const [statusSaving, setStatusSaving] = useState<StudentStatus | null>(null);

  const background = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
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
  const nextLabel = nextUpcoming ? `${nextRoundHint}회차 ${shortDate(nextUpcoming.lessonDate)} 예정` : null;

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) ?? sessions[0] ?? null;

  const memo = memoOverride ?? student.internal_memo ?? '';
  const memoDirty = memo.trim() !== (student.internal_memo ?? '').trim();

  async function handleSaveMemo() {
    setSavingMemo(true);
    try {
      await saveInternalMemo(student.id, memo.trim());
      setMemoOverride(null);
      load();
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSavingMemo(false);
    }
  }

  async function handleChangeStatus(status: StudentStatus) {
    if (status === student.status) return;
    setStatusSaving(status);
    try {
      await updateStudentStatus(student.id, status);
      load();
    } catch (error) {
      Alert.alert('변경 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setStatusSaving(null);
    }
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

  /** 예약 목록의 각 항목을 펼쳤을 때 보여줄 회차 기록 영역. 웹의 renderRecord 와 같은 자리다. */
  function renderReservationRecord(reservation: ReservationView): ReservationRecordSlot {
    if (CANCELLED.includes(reservation.status)) {
      return { hasRecord: false, content: null };
    }

    const session = reservation.lessonSessionId
      ? sessions.find((s) => s.id === reservation.lessonSessionId) ?? null
      : null;

    if (session) {
      return {
        hasRecord: true,
        content: (
          <View style={styles.recordSlot}>
            <ThemedText style={[styles.recordSummary, { color: textSecondary }]}>
              {session.topic ?? session.student_summary ?? '아직 작성된 요약이 없어요.'}
            </ThemedText>
            <Button
              label="회차 기록 보기/수정"
              size="sm"
              variant="outline"
              fullWidth={false}
              onPress={() => openSessionEditor(session)}
            />
          </View>
        ),
      };
    }

    return {
      hasRecord: false,
      content: (
        <View style={styles.recordSlot}>
          <ThemedText style={[styles.recordSummary, { color: textSecondary }]}>
            이 수업을 완료 또는 노쇼로 처리하면 회차 기록이 자동으로 만들어집니다.
          </ThemedText>
          <Button
            label="회차 기록 미리 작성"
            size="sm"
            variant="outline"
            fullWidth={false}
            onPress={() => openPrepSession(reservation)}
          />
        </View>
      ),
    };
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
    Alert.alert('예약이 필요해요', '회차 기록을 작성하려면 먼저 위에서 수업 예약을 추가해주세요.');
  }

  if (breakpoint !== 'mobile') {
    const wideCtx: WideCtx = {
      studentId,
      detail,
      reservations,
      rooms,
      hideStatus,
      segmentCount,
      filledCount,
      nextLabel,
      unsharedSession,
      sharingSessionId,
      onPublish: handlePublish,
      expandedSessionId,
      onToggleExpand: (id) => setExpandedSessionId((current) => (current === id ? null : id)),
      selectedSession,
      selectedSessionId: selectedSessionId ?? selectedSession?.id ?? null,
      setSelectedSessionId,
      deletingSessionId,
      onDeleteSession: handleDeleteSession,
      onEditSession: openSessionEditor,
      openChat,
      renderReservationRecord,
      reload: load,
      memo,
      onMemoChange: setMemoOverride,
      memoDirty,
      savingMemo,
      onSaveMemo: handleSaveMemo,
      statusSaving,
      onChangeStatus: handleChangeStatus,
    };

    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <DetailNavShell active="home">
          <View style={[wideStyles.root, { backgroundColor: background }]}>
            <WideHeader
              studentName={student.student_name}
              remaining={student.balance.remaining}
              granted={student.balance.granted}
              serviceType={student.service_type}
              consultantName={student.consultantName}
              onBack={() => router.back()}
              onOpenChat={openChat}
              onQuickRecord={handleQuickRecord}
            />
            {breakpoint === 'desktop' ? (
              <DesktopLayout ctx={wideCtx} />
            ) : isWorkspaceWide ? (
              <TabletLandscapeLayout ctx={wideCtx} />
            ) : (
              <TabletPortraitLayout ctx={wideCtx} />
            )}
          </View>
        </DetailNavShell>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerBackTitle: '학생',
          headerRight: () => (
            <Pressable
              hitSlop={8}
              onPress={() => setHeaderOpen((prev) => !prev)}
              style={styles.headerToggle}>
              <ThemedText style={[styles.headerToggleName, { color: text }]} numberOfLines={1}>
                {student.student_name}{' '}
                <ThemedText style={[styles.headerToggleCount, { color: textSecondary }]}>
                  (<ThemedText style={[styles.headerToggleCount, { color: primary }]}>
                    {student.balance.remaining}
                  </ThemedText>
                  /
                  <ThemedText style={[styles.headerToggleCount, { color: primary }]}>
                    {student.balance.granted}
                  </ThemedText>
                  )
                </ThemedText>
              </ThemedText>
              <Ionicons name={headerOpen ? 'chevron-up' : 'chevron-down'} size={14} color={textSecondary} />
            </Pressable>
          ),
        }}
      />
      <View style={[styles.flex, { backgroundColor: background }]}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
          {headerOpen ? (
            <View style={[styles.headerDetail, { backgroundColor: surface, borderColor: border }]}>
              <View style={styles.headerBadgeRow}>
                <Badge label={student.service_type ?? '상품 미배정'} tone="primary" />
                <Badge label={`총 ${student.balance.granted}회 · 잔여 ${student.balance.remaining}회`} tone="neutral" />
                {hideStatus ? null : <Badge label={student.status ?? '상태 미확인'} tone="neutral" />}
                {student.consultantName ? <Badge label={`담당 ${student.consultantName}`} tone="neutral" /> : null}
              </View>

              <View style={[styles.headerSection, styles.infoGrid, { borderTopColor: border }]}>
                <InfoField label="학년" value={student.grade_level} />
                <InfoField label="계열" value={student.track} />
                <InfoField label="학교" value={student.school_name} />
                <InfoField label="내신" value={student.school_gpa} />
                <InfoField label="모의고사" value={student.mock_exam_grade} />
                <InfoField label="희망 대학" value={student.desired_university} />
                <InfoField label="희망 학과" value={student.desired_major} />
                <InfoField label="학생 연락처" value={student.student_phone} />
                <InfoField label="학부모" value={student.parent_name} />
                <InfoField label="학부모 연락처" value={student.parent_phone} />
              </View>

              {hideStatus ? null : (
                <View style={[styles.headerSection, { borderTopColor: border }]}>
                  <ThemedText type="defaultSemiBold">진행 상태</ThemedText>
                  <View style={styles.chipRow}>
                    {STUDENT_STATUSES.map((option) => {
                      const selected = option === student.status;
                      return (
                        <Pressable
                          key={option}
                          disabled={statusSaving !== null}
                          onPress={() => handleChangeStatus(option)}
                          style={[
                            styles.chip,
                            { backgroundColor: selected ? primary : surfaceSecondary },
                            statusSaving === option && styles.chipBusy,
                          ]}>
                          <ThemedText style={[styles.chipText, { color: selected ? '#fff' : text }]}>
                            {option}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={[styles.headerSection, { borderTopColor: border }]}>
                <View style={styles.noteLabelRow}>
                  <Ionicons name="lock-closed-outline" size={14} color={textSecondary} />
                  <ThemedText type="defaultSemiBold">내부 메모</ThemedText>
                </View>
                <ThemedText style={[styles.hint, { color: textSecondary }]}>학생에게는 보이지 않아요.</ThemedText>
                <TextInput
                  style={[styles.textArea, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
                  value={memo}
                  onChangeText={setMemoOverride}
                  placeholder="이 학생에 대한 메모를 남겨보세요"
                  placeholderTextColor={textSecondary}
                  multiline
                />
                {memoDirty ? (
                  <Button label="메모 저장" size="sm" fullWidth={false} loading={savingMemo} onPress={handleSaveMemo} />
                ) : null}
              </View>
            </View>
          ) : null}

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

          <ReservationPanel
            studentId={studentId}
            service={classServiceFromServiceType(student.service_type)}
            consultantId={student.consultant_id}
            consultantName={student.consultantName}
            reservations={reservations}
            remaining={student.balance.remaining}
            onChanged={load}
            renderRecord={renderReservationRecord}
          />

          <ExpandableTimeline
            sessions={sessions}
            expandedId={expandedSessionId}
            onToggle={(id) => setExpandedSessionId((current) => (current === id ? null : id))}
            rooms={rooms}
            onEdit={openSessionEditor}
            onOpenChat={openChat}
            onDelete={handleDeleteSession}
            deletingSessionId={deletingSessionId}
            recordSubmission={recordSubmission}
          />

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
        </View>
      </View>
    </>
  );
}

type InfoRow = { label: string; value: string | null };

function InfoField({ label, value }: InfoRow) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  return (
    <View style={styles.infoField}>
      <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>{label}</ThemedText>
      <ThemedText style={styles.infoValue}>{value?.trim() ? value : '미입력'}</ThemedText>
    </View>
  );
}

/** 회차 기록이 없는 예약 카드를 눌렀을 때/회차를 눌렀을 때 그 자리에서 펼쳐지는 타임라인 — 모바일·태블릿 세로(1b)용. */
function ExpandableTimeline({
  sessions,
  expandedId,
  onToggle,
  rooms,
  onEdit,
  onOpenChat,
  onDelete,
  deletingSessionId,
  recordSubmission,
}: {
  sessions: LessonSessionFull[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  rooms: ChatRoomsSummary;
  onEdit: (session: LessonSessionFull) => void;
  onOpenChat: () => void;
  onDelete: (session: LessonSessionFull) => void;
  deletingSessionId: string | null;
  recordSubmission: StudentDetail['recordSubmission'];
}) {
  const surface = useThemeColor({}, 'surface');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const borderStrong = useThemeColor({}, 'borderStrong');
  const primary = useThemeColor({}, 'primary');
  const text = useThemeColor({}, 'text');
  const success = useThemeColor({}, 'success');
  const danger = useThemeColor({}, 'danger');
  const textSecondary = useThemeColor({}, 'textSecondary');

  return (
    <View style={styles.timeline}>
      {sessions.map((session) => {
        const open = expandedId === session.id;
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
                onPress={() => onToggle(session.id)}
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
                      onPress={() => onEdit(session)}
                    />
                    <Button
                      label={`대화 ${chatCount}`}
                      size="sm"
                      variant="secondary"
                      fullWidth={false}
                      onPress={onOpenChat}
                    />
                    <Button
                      label="삭제"
                      size="sm"
                      variant="ghost"
                      fullWidth={false}
                      loading={deletingSessionId === session.id}
                      onPress={() => onDelete(session)}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}

      <OriginNode recordSubmission={recordSubmission} />
    </View>
  );
}

/** 회차를 누르면 오른쪽 SessionRecordPanel 이 열리는 타임라인 — 태블릿 가로(2a)·PC(2b)용. */
function SelectableTimeline({
  sessions,
  selectedId,
  onSelect,
  recordSubmission,
}: {
  sessions: LessonSessionFull[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  recordSubmission: StudentDetail['recordSubmission'];
}) {
  const surface = useThemeColor({}, 'surface');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const borderStrong = useThemeColor({}, 'borderStrong');
  const primary = useThemeColor({}, 'primary');
  const primaryMuted = useThemeColor({}, 'primaryMuted');
  const success = useThemeColor({}, 'success');
  const danger = useThemeColor({}, 'danger');
  const textSecondary = useThemeColor({}, 'textSecondary');

  return (
    <View style={styles.timeline}>
      {sessions.map((session) => {
        const selected = selectedId === session.id;
        const shareTone: BadgeTone = session.is_shared_with_student ? 'success' : 'warning';
        const shareLabel = session.is_shared_with_student ? '공개' : '비공개';
        const dotVisual =
          session.status === '노쇼'
            ? { bg: surfaceSecondary, border: danger, icon: 'close' as const, fg: danger }
            : session.status === '취소'
              ? { bg: surfaceSecondary, border: borderStrong, icon: 'close' as const, fg: textSecondary }
              : { bg: success, border: success, icon: 'checkmark' as const, fg: '#fff' };

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
                onPress={() => onSelect(session.id)}
                style={[
                  styles.nodeCard,
                  { backgroundColor: selected ? primaryMuted : surface, borderColor: selected ? primary : border },
                ]}>
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
            </View>
          </View>
        );
      })}

      <OriginNode recordSubmission={recordSubmission} />
    </View>
  );
}

function OriginNode({ recordSubmission }: { recordSubmission: StudentDetail['recordSubmission'] }) {
  const borderStrong = useThemeColor({}, 'borderStrong');
  const success = useThemeColor({}, 'success');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'primary');

  return (
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
  );
}

function ProgressCard({
  segmentCount,
  filledCount,
  nextLabel,
}: {
  segmentCount: number;
  filledCount: number;
  nextLabel: string | null;
}) {
  const surface = useThemeColor({}, 'surface');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');

  return (
    <View style={[styles.card, { backgroundColor: surface }]}>
      <View style={styles.progressHeadRow}>
        <ThemedText style={[styles.progressLabel, { color: textSecondary }]}>
          {segmentCount}회 중 {filledCount}회 진행
        </ThemedText>
        {nextLabel ? <ThemedText style={[styles.progressNext, { color: primary }]}>{nextLabel}</ThemedText> : null}
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
  );
}

function PrivateBanner({
  session,
  onPublish,
  sharing,
}: {
  session: LessonSessionFull;
  onPublish: () => void;
  sharing: boolean;
}) {
  const warningMuted = useThemeColor({}, 'warningMuted');
  const warning = useThemeColor({}, 'warning');
  const textSecondary = useThemeColor({}, 'textSecondary');

  return (
    <View style={[styles.banner, { backgroundColor: warningMuted }]}>
      <View style={styles.bannerText}>
        <ThemedText style={styles.bannerTitle}>{session.session_round}회차 기록이 학생에게 비공개예요</ThemedText>
        <ThemedText style={[styles.bannerMeta, { color: textSecondary }]}>
          {session.lesson_date} 수업 · 요약은 {session.student_summary ? '작성 완료' : '미작성'}
        </ThemedText>
      </View>
      <Pressable style={[styles.bannerButton, { backgroundColor: warning }]} disabled={sharing} onPress={onPublish}>
        {sharing ? <ActivityIndicator color="#fff" size="small" /> : <ThemedText style={styles.bannerButtonText}>공개하기</ThemedText>}
      </Pressable>
    </View>
  );
}

/** 태블릿/PC 상세 화면 맨 위 헤더 — 모바일의 하단 액션바를 여기로 옮겼다. */
function WideHeader({
  studentName,
  remaining,
  granted,
  serviceType,
  consultantName,
  onBack,
  onOpenChat,
  onQuickRecord,
}: {
  studentName: string;
  remaining: number;
  granted: number;
  serviceType: string | null;
  consultantName: string | null;
  onBack: () => void;
  onOpenChat: () => void;
  onQuickRecord: () => void;
}) {
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');

  return (
    <View style={[wideStyles.header, { backgroundColor: surface, borderBottomColor: border }]}>
      <Pressable onPress={onBack} hitSlop={8} style={wideStyles.backRow}>
        <Ionicons name="chevron-back" size={20} color={primary} />
        <ThemedText style={[wideStyles.backLabel, { color: primary }]}>학생</ThemedText>
      </Pressable>
      <View style={[wideStyles.divider, { backgroundColor: border }]} />
      <ThemedText style={wideStyles.studentName} numberOfLines={1}>
        {studentName}
      </ThemedText>
      <ThemedText style={wideStyles.balance}>
        <ThemedText style={[wideStyles.balance, { color: textSecondary }]}>잔여 </ThemedText>
        <ThemedText style={[wideStyles.balance, { color: primary }]}>{remaining}</ThemedText>
        <ThemedText style={[wideStyles.balance, { color: textSecondary }]}>/{granted}회</ThemedText>
      </ThemedText>
      <Badge label={serviceType ?? '상품 미배정'} tone="primary" style={wideStyles.badge} />
      <Badge
        label={consultantName ? `담당 ${consultantName}` : '담당 미배정'}
        tone="neutral"
        style={wideStyles.badge}
      />
      <View style={wideStyles.spacer} />
      <View style={wideStyles.actions}>
        <Button
          label="채팅 열기"
          size="sm"
          fullWidth={false}
          icon={<Ionicons name="chatbubble-ellipses-outline" size={16} color="#fff" />}
          onPress={onOpenChat}
        />
        <Button label="기록 작성" variant="secondary" size="sm" fullWidth={false} onPress={onQuickRecord} />
      </View>
    </View>
  );
}

/** 태블릿 세로(834×1112) — 레일 + 2열: 본문(예약·타임라인) / 학생 정보(항상 표시). */
function TabletPortraitLayout({ ctx }: { ctx: WideCtx }) {
  const background = useThemeColor({}, 'background');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: background }} contentContainerStyle={wideStyles.portraitContent}>
      <View style={wideStyles.portraitCol1}>
        <ProgressCard segmentCount={ctx.segmentCount} filledCount={ctx.filledCount} nextLabel={ctx.nextLabel} />
        {ctx.unsharedSession ? (
          <PrivateBanner
            session={ctx.unsharedSession}
            onPublish={() => ctx.onPublish(ctx.unsharedSession as LessonSessionFull)}
            sharing={ctx.sharingSessionId === ctx.unsharedSession.id}
          />
        ) : null}
        <ReservationPanel
          studentId={ctx.studentId}
          service={classServiceFromServiceType(ctx.detail.student.service_type)}
          consultantId={ctx.detail.student.consultant_id}
          consultantName={ctx.detail.student.consultantName}
          reservations={ctx.reservations}
          remaining={ctx.detail.student.balance.remaining}
          onChanged={ctx.reload}
          renderRecord={ctx.renderReservationRecord}
        />
        <ExpandableTimeline
          sessions={ctx.detail.sessions}
          expandedId={ctx.expandedSessionId}
          onToggle={ctx.onToggleExpand}
          rooms={ctx.rooms}
          onEdit={ctx.onEditSession}
          onOpenChat={ctx.openChat}
          onDelete={ctx.onDeleteSession}
          deletingSessionId={ctx.deletingSessionId}
          recordSubmission={ctx.detail.recordSubmission}
        />
      </View>
      <View style={wideStyles.portraitCol2}>
        <StudentInfoPanel
          student={ctx.detail.student}
          hideStatus={ctx.hideStatus}
          statusSaving={ctx.statusSaving}
          onChangeStatus={ctx.onChangeStatus}
          memo={ctx.memo}
          onMemoChange={ctx.onMemoChange}
          memoDirty={ctx.memoDirty}
          savingMemo={ctx.savingMemo}
          onSaveMemo={ctx.onSaveMemo}
        />
        <ManagerStudentControls student={ctx.detail.student} onSaved={ctx.reload} />
      </View>
    </ScrollView>
  );
}

/** 태블릿 가로(1112×834, 1000px 이상) — 레일 + 3열: 정보(접이식) / 예약·타임라인 / 회차 기록. */
function TabletLandscapeLayout({ ctx }: { ctx: WideCtx }) {
  const background = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const chatCount = ctx.selectedSession ? ctx.rooms.sessions[ctx.selectedSession.id]?.messageCount ?? 0 : 0;
  // 수업 예약·회차 기록이 화면의 중심이 되도록, 학생 정보는 기본적으로 접어 둔다.
  const [infoCollapsed, setInfoCollapsed] = useState(true);

  return (
    <View style={[wideStyles.threeColRow, { backgroundColor: background }]}>
      {infoCollapsed ? (
        <View style={[wideStyles.colCollapsed, { backgroundColor: surface, borderColor: border }]}>
          <Pressable
            hitSlop={8}
            onPress={() => setInfoCollapsed(false)}
            style={wideStyles.collapsedToggle}
            accessibilityLabel="학생 정보 펼치기">
            <Ionicons name="person-outline" size={18} color={textSecondary} />
            <Ionicons name="chevron-forward" size={14} color={textSecondary} />
            <ThemedText style={[wideStyles.collapsedLabel, { color: textSecondary }]}>학생{'\n'}정보</ThemedText>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={wideStyles.col260} contentContainerStyle={wideStyles.colContent}>
          <Pressable hitSlop={8} onPress={() => setInfoCollapsed(true)} style={wideStyles.collapseButton}>
            <Ionicons name="chevron-back" size={14} color={textSecondary} />
            <ThemedText style={[wideStyles.collapseButtonLabel, { color: textSecondary }]}>학생 정보 접기</ThemedText>
          </Pressable>
          <StudentInfoPanel
            student={ctx.detail.student}
            hideStatus={ctx.hideStatus}
            statusSaving={ctx.statusSaving}
            onChangeStatus={ctx.onChangeStatus}
            memo={ctx.memo}
            onMemoChange={ctx.onMemoChange}
            memoDirty={ctx.memoDirty}
            savingMemo={ctx.savingMemo}
            onSaveMemo={ctx.onSaveMemo}
          />
          <ManagerStudentControls student={ctx.detail.student} onSaved={ctx.reload} />
        </ScrollView>
      )}

      <ScrollView style={wideStyles.colFlex} contentContainerStyle={wideStyles.colContent}>
        <ProgressCard segmentCount={ctx.segmentCount} filledCount={ctx.filledCount} nextLabel={ctx.nextLabel} />
        <ReservationPanel
          studentId={ctx.studentId}
          service={classServiceFromServiceType(ctx.detail.student.service_type)}
          consultantId={ctx.detail.student.consultant_id}
          consultantName={ctx.detail.student.consultantName}
          reservations={ctx.reservations}
          remaining={ctx.detail.student.balance.remaining}
          onChanged={ctx.reload}
          renderRecord={ctx.renderReservationRecord}
        />
        <SelectableTimeline
          sessions={ctx.detail.sessions}
          selectedId={ctx.selectedSessionId}
          onSelect={ctx.setSelectedSessionId}
          recordSubmission={ctx.detail.recordSubmission}
        />
      </ScrollView>

      <ScrollView style={wideStyles.col300} contentContainerStyle={wideStyles.colContent}>
        <SessionRecordPanel
          session={ctx.selectedSession}
          chatCount={chatCount}
          onEdit={() => ctx.selectedSession && ctx.onEditSession(ctx.selectedSession)}
          onOpenChat={ctx.openChat}
          onDelete={() => ctx.selectedSession && ctx.onDeleteSession(ctx.selectedSession)}
          deleting={ctx.deletingSessionId === ctx.selectedSession?.id}
        />
      </ScrollView>
    </View>
  );
}

/** PC(1440×900) — 사이드바 + 예약 캘린더 중심 3열: 예약(캘린더+목록) / 배너·타임라인 / 회차 기록·학생 정보. */
function DesktopLayout({ ctx }: { ctx: WideCtx }) {
  const background = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const [calDate, setCalDate] = useState<string | null>(null);
  const chatCount = ctx.selectedSession ? ctx.rooms.sessions[ctx.selectedSession.id]?.messageCount ?? 0 : 0;

  return (
    <View style={[wideStyles.threeColRow, { backgroundColor: background }]}>
      <ScrollView style={wideStyles.col440} contentContainerStyle={wideStyles.colContent}>
        <View style={[styles.card, { backgroundColor: surface }]}>
          <ReservationCalendar reservations={ctx.reservations} selectedDate={calDate} onSelectDate={setCalDate} />
        </View>
        <ReservationPanel
          studentId={ctx.studentId}
          service={classServiceFromServiceType(ctx.detail.student.service_type)}
          consultantId={ctx.detail.student.consultant_id}
          consultantName={ctx.detail.student.consultantName}
          reservations={ctx.reservations}
          remaining={ctx.detail.student.balance.remaining}
          onChanged={ctx.reload}
          renderRecord={ctx.renderReservationRecord}
        />
        <ProgressCard segmentCount={ctx.segmentCount} filledCount={ctx.filledCount} nextLabel={ctx.nextLabel} />
      </ScrollView>

      <ScrollView style={wideStyles.colFlex} contentContainerStyle={wideStyles.colContent}>
        {ctx.unsharedSession ? (
          <PrivateBanner
            session={ctx.unsharedSession}
            onPublish={() => ctx.onPublish(ctx.unsharedSession as LessonSessionFull)}
            sharing={ctx.sharingSessionId === ctx.unsharedSession.id}
          />
        ) : null}
        <View style={wideStyles.timelineHeadRow}>
          <ThemedText style={[wideStyles.timelineHeadLabel, { color: textSecondary }]}>회차 타임라인</ThemedText>
          <ThemedText style={[wideStyles.timelineHeadHint, { color: textTertiary }]}>
            회차를 누르면 오른쪽에 기록이 열립니다.
          </ThemedText>
        </View>
        <SelectableTimeline
          sessions={ctx.detail.sessions}
          selectedId={ctx.selectedSessionId}
          onSelect={ctx.setSelectedSessionId}
          recordSubmission={ctx.detail.recordSubmission}
        />
      </ScrollView>

      <ScrollView style={wideStyles.col320} contentContainerStyle={wideStyles.colContent}>
        <SessionRecordPanel
          session={ctx.selectedSession}
          chatCount={chatCount}
          onEdit={() => ctx.selectedSession && ctx.onEditSession(ctx.selectedSession)}
          onOpenChat={ctx.openChat}
          onDelete={() => ctx.selectedSession && ctx.onDeleteSession(ctx.selectedSession)}
          deleting={ctx.deletingSessionId === ctx.selectedSession?.id}
        />
        <StudentInfoPanel
          student={ctx.detail.student}
          hideStatus={ctx.hideStatus}
          statusSaving={ctx.statusSaving}
          onChangeStatus={ctx.onChangeStatus}
          memo={ctx.memo}
          onMemoChange={ctx.onMemoChange}
          memoDirty={ctx.memoDirty}
          savingMemo={ctx.savingMemo}
          onSaveMemo={ctx.onSaveMemo}
        />
        <ManagerStudentControls student={ctx.detail.student} onSaved={ctx.reload} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  headerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  headerToggleName: { fontSize: 16, fontWeight: '700' },
  headerToggleCount: { fontSize: 15, fontWeight: '700' },
  headerDetail: {
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.sm + 2,
  },
  headerBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  headerSection: { gap: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  infoField: { width: '46%', gap: 2 },
  infoLabel: { fontSize: 11, fontWeight: '600' },
  infoValue: { fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.pill },
  chipBusy: { opacity: 0.6 },
  chipText: { fontSize: 12.5, fontWeight: '700' },
  noteLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hint: { fontSize: 12 },
  textArea: {
    minHeight: 80,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 14,
    textAlignVertical: 'top',
  },
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
  recordSlot: { gap: Spacing.sm },
  recordSummary: { fontSize: 13.5, lineHeight: 19 },
  timeline: { flexDirection: 'column' },
  nodeRow: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  nodeRail: { width: 26, alignItems: 'center', flexShrink: 0, paddingTop: 4 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotDashed: { borderStyle: 'dashed' },
  line: { flex: 1, width: 2, minHeight: 14 },
  nodeBody: { flex: 1, minWidth: 0, paddingBottom: 14 },
  nodeCard: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, gap: 6 },
  nodeCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nodeTitle: { fontSize: 15, fontWeight: '700' },
  nodeTopic: { fontSize: 13.5, lineHeight: 19 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
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
});

const wideStyles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'column' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 60,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backLabel: { fontSize: 15, fontWeight: '600' },
  divider: { width: 1, height: 20 },
  studentName: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  balance: { fontSize: 14, fontWeight: '700' },
  // Badge 는 기본 alignSelf: 'flex-start' 라 이 행의 alignItems: 'center' 를
  // 무시하고 위쪽에 붙는다 — 여기서만 가운데로 되돌린다.
  badge: { alignSelf: 'center' },
  spacer: { flex: 1 },
  actions: { flexDirection: 'row', gap: Spacing.sm },

  portraitContent: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg, padding: Spacing.xl },
  portraitCol1: { flex: 1, minWidth: 0, gap: Spacing.md },
  portraitCol2: { width: 300, flexShrink: 0, gap: Spacing.md },

  threeColRow: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingLeft: Spacing.xl,
    paddingRight: Spacing.xl,
  },
  colContent: { gap: Spacing.md, paddingVertical: Spacing.xl },
  col260: { width: 260, flexShrink: 0 },
  col300: { width: 300, flexShrink: 0 },
  col320: { width: 320, flexShrink: 0 },
  col440: { width: 440, flexShrink: 0 },
  colFlex: { flex: 1, minWidth: 0 },

  colCollapsed: {
    width: 64,
    flexShrink: 0,
    marginVertical: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  collapsedToggle: { alignItems: 'center', gap: 6 },
  collapsedLabel: { fontSize: 10.5, fontWeight: '700', textAlign: 'center', lineHeight: 13 },
  collapseButton: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  collapseButtonLabel: { fontSize: 12.5, fontWeight: '600' },

  timelineHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timelineHeadLabel: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4 },
  timelineHeadHint: { fontSize: 11.5 },
});
