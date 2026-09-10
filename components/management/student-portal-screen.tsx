import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Badge, lessonStatusTone } from '@/components/ui/badge';
import { Radius, Spacing } from '@/constants/theme';
import { useIsWorkspaceWide } from '@/hooks/use-breakpoint';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  confirmRecordUpload,
  createRecordUploadTicket,
  getChatRooms,
  getPortal,
  getRecord,
  setNextActionChecked,
  uploadWithTicket,
} from '@/lib/management-api';
import {
  CHAT_ALWAYS_ROOM,
  type ChatRoomsSummary,
  type LessonStatus,
  type RecordSubmissionView,
  type StudentPortalData,
  type StudentPortalSession,
} from '@/lib/management-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      portal: StudentPortalData;
      record: RecordSubmissionView | null;
      rooms: ChatRoomsSummary;
    };

/**
 * 학생 본인의 종합 생기부 관리 홈 — "진행 현황" 타임라인.
 *
 * 12회차 전체를 시간순으로 보여주고, 회차를 탭하면 그 자리에서 요약·자료가
 * 펼쳐진다. 대화는 여기서 직접 하지 않고 "이 회차 대화 열기" / "상시 피드백"
 * 카드로 대화 탭의 해당 방을 열어준다 (components/management/student-chat-screen.tsx).
 */
export function StudentPortalScreen() {
  const router = useRouter();
  const isWorkspaceWide = useIsWorkspaceWide();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const borderStrong = useThemeColor({}, 'borderStrong');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const danger = useThemeColor({}, 'danger');
  const success = useThemeColor({}, 'success');
  const primaryMuted = useThemeColor({}, 'primaryMuted');

  const load = useCallback(async () => {
    try {
      const [portal, recordResult, rooms] = await Promise.all([getPortal(), getRecord(), getChatRooms()]);
      setState({ status: 'ready', portal, record: recordResult.submission, rooms });
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

  function openRoom(room: string) {
    router.push({ pathname: '/chat', params: { room } });
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

  const { portal, record, rooms } = state;
  const segmentCount = Math.max(1, Math.round(portal.balance.granted));
  const filledCount = Math.max(0, Math.min(segmentCount, Math.round(portal.balance.used)));
  const nextUpcoming = portal.upcoming[0] ?? null;
  const todoSession = portal.sessions.find((session) => session.next_actions.length > 0) ?? null;
  const todoLeft = todoSession ? todoSession.next_actions.filter((item) => !item.done).length : 0;

  const header = (
    <View style={styles.header}>
      <View style={styles.headerTexts}>
        <ThemedText style={styles.hd}>진행 현황</ThemedText>
        <ThemedText style={[styles.hs, { color: textSecondary }]}>
          {portal.student.student_name}
          {portal.consultant ? ` · ${portal.consultant.name} 컨설턴트` : ''} · 잔여 {portal.balance.remaining}회
        </ThemedText>
      </View>
      <Avatar name={portal.student.student_name} size={44} />
    </View>
  );

  const progressCard = (
    <View style={[styles.card, { backgroundColor: surface }]}>
      <View style={styles.progressHeadRow}>
        <ThemedText style={[styles.progressLabel, { color: textSecondary }]}>
          {segmentCount}회 중 {Math.round(portal.balance.used)}회 진행
        </ThemedText>
        {nextUpcoming ? (
          <ThemedText style={[styles.progressNext, { color: primary }]}>
            {nextUpcoming.session_round}회차{' '}
            {new Date(nextUpcoming.lesson_date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} 예정
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
  );

  const todoCard = todoSession ? (
    <View style={[styles.card, { backgroundColor: surface }]}>
      <View style={styles.todoHeadRow}>
        <ThemedText style={[styles.progressLabel, { color: textSecondary }]}>
          {nextUpcoming ? `${nextUpcoming.session_round}회차까지 할 일` : '다음 수업까지 할 일'}
        </ThemedText>
        <ThemedText style={[styles.progressNext, { color: primary }]}>{todoLeft}개 남음</ThemedText>
      </View>
      {todoSession.next_actions.map((item) => (
        <Pressable
          key={item.key}
          style={styles.checkRow}
          onPress={() => handleToggleNextAction(todoSession.id, item.key, !item.done)}>
          <View
            style={[
              styles.checkbox,
              { borderColor: item.done ? primary : borderStrong },
              item.done && { backgroundColor: primary },
            ]}>
            {item.done ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
          </View>
          <ThemedText
            style={[styles.checkLabel, item.done && { color: textSecondary, textDecorationLine: 'line-through' }]}>
            {item.text}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  ) : null;

  const alwaysCard = (
    <Pressable onPress={() => openRoom(CHAT_ALWAYS_ROOM)}>
      {({ pressed }) => (
        <View style={[styles.card, styles.alwaysCard, { backgroundColor: surface }, pressed && styles.pressed]}>
          <Avatar name={portal.consultant?.name ?? '?'} size={38} />
          <View style={styles.alwaysTexts}>
            <ThemedText style={styles.alwaysTitle}>상시 피드백</ThemedText>
            <ThemedText style={[styles.alwaysPreview, { color: textSecondary }]} numberOfLines={1}>
              {rooms.always.lastMessagePreview || '회차와 무관한 질문은 여기로 편하게 보내세요.'}
            </ThemedText>
          </View>
          {rooms.always.unreadCount > 0 ? (
            <View style={[styles.unreadBadge, { backgroundColor: danger }]}>
              <ThemedText style={styles.unreadBadgeText}>
                {rooms.always.unreadCount > 99 ? '99+' : rooms.always.unreadCount}
              </ThemedText>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );

  const timeline = (
    <View style={styles.timeline}>
      {portal.sessions.map((session) => (
        <TimelineNode
          key={session.id}
          session={session}
          expanded={expandedId === session.id}
          chatCount={rooms.sessions[session.id]?.messageCount ?? 0}
          onToggle={() => setExpandedId((current) => (current === session.id ? null : session.id))}
          onOpenChat={() => openRoom(session.id)}
          colors={{ surface, surfaceSecondary, border, borderStrong, textSecondary, primary, primaryMuted, success, danger }}
        />
      ))}

      <View style={styles.nodeRow}>
        <View style={styles.nodeRail}>
          <View style={[styles.dashedDot, { borderColor: borderStrong }]} />
        </View>
        <View style={styles.nodeBody}>
          <View style={[styles.originCard, { borderColor: borderStrong }]}>
            <ThemedText style={styles.originTitle}>시작 · 생활기록부 제출</ThemedText>
            {record ? (
              <View style={styles.originRow}>
                <Ionicons name="checkmark-circle" size={17} color={success} />
                <ThemedText style={[styles.originFile, { color: textSecondary }]} numberOfLines={1}>
                  {record.file_name}
                </ThemedText>
                <Pressable onPress={handleUploadRecord} disabled={uploading} hitSlop={8}>
                  <ThemedText style={[styles.originAction, { color: primary }]}>
                    {uploading ? '업로드 중…' : '교체'}
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={handleUploadRecord} disabled={uploading} style={styles.originRow}>
                <Ionicons name="cloud-upload-outline" size={17} color={primary} />
                <ThemedText style={[styles.originFile, { color: primary }]}>
                  {uploading ? '업로드 중…' : '생활기록부 올리기'}
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={[styles.container, isWorkspaceWide && styles.containerWide]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primary} />}>
      {header}
      {isWorkspaceWide ? (
        <View style={styles.wideRow}>
          <View style={styles.wideRail}>
            {progressCard}
            {todoCard}
            {alwaysCard}
          </View>
          <View style={styles.wideMain}>{timeline}</View>
        </View>
      ) : (
        <>
          {progressCard}
          {todoCard}
          {alwaysCard}
          {timeline}
        </>
      )}
    </ScrollView>
  );
}

function nodeVisual(
  status: LessonStatus,
  colors: { primary: string; success: string; danger: string; surface: string; surfaceSecondary: string; borderStrong: string; textSecondary: string }
): { bg: string; border: string; icon: keyof typeof Ionicons.glyphMap; fg: string } {
  switch (status) {
    case '완료':
      return { bg: colors.success, border: colors.success, icon: 'checkmark', fg: '#fff' };
    case '예정':
      return { bg: colors.surface, border: colors.primary, icon: 'time-outline', fg: colors.primary };
    case '노쇼':
      return { bg: colors.surfaceSecondary, border: colors.danger, icon: 'close', fg: colors.danger };
    case '취소':
    default:
      return { bg: colors.surfaceSecondary, border: colors.borderStrong, icon: 'close', fg: colors.textSecondary };
  }
}

function TimelineNode({
  session,
  expanded,
  chatCount,
  onToggle,
  onOpenChat,
  colors,
}: {
  session: StudentPortalSession;
  expanded: boolean;
  chatCount: number;
  onToggle: () => void;
  onOpenChat: () => void;
  colors: {
    surface: string;
    surfaceSecondary: string;
    border: string;
    borderStrong: string;
    textSecondary: string;
    primary: string;
    primaryMuted: string;
    success: string;
    danger: string;
  };
}) {
  const visual = nodeVisual(session.status, colors);

  return (
    <View style={styles.nodeRow}>
      <View style={styles.nodeRail}>
        <View style={[styles.dot, { backgroundColor: visual.bg, borderColor: visual.border }]}>
          <Ionicons name={visual.icon} size={13} color={visual.fg} />
        </View>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>
      <View style={styles.nodeBody}>
        <Pressable
          onPress={onToggle}
          style={[styles.nodeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.nodeCardHead}>
            <ThemedText style={styles.nodeTitle}>
              {session.session_round}회차 · {session.lesson_date}
            </ThemedText>
            <Badge label={session.status} tone={lessonStatusTone(session.status)} />
          </View>
          <ThemedText style={[styles.nodeTopic, { color: colors.textSecondary }]}>
            {session.topic ?? session.student_summary ?? '아직 등록된 요약이 없어요.'}
          </ThemedText>
        </Pressable>

        {expanded ? (
          <View style={[styles.expandCard, { backgroundColor: colors.surface }]}>
            {session.student_summary ? (
              <View style={styles.expandSection}>
                <ThemedText style={[styles.expandLabel, { color: colors.textSecondary }]}>수업 요약</ThemedText>
                <ThemedText style={styles.expandBody}>{session.student_summary}</ThemedText>
              </View>
            ) : null}

            {session.materials.length > 0 ? (
              <View style={[styles.expandSection, styles.expandSectionBordered, { borderTopColor: colors.border }]}>
                <ThemedText style={[styles.expandLabel, { color: colors.textSecondary }]}>수업 자료</ThemedText>
                {session.materials.map((material) => (
                  <View key={material.id} style={[styles.materialRow, { backgroundColor: colors.surfaceSecondary }]}>
                    <Ionicons name="document-attach-outline" size={17} color={colors.primary} />
                    <ThemedText style={[styles.materialText, { color: colors.primary }]} numberOfLines={1}>
                      {material.title}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable
              onPress={onOpenChat}
              style={[styles.openChatButton, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={17} color={colors.primary} />
              <ThemedText style={[styles.openChatText, { color: colors.primary }]}>
                이 회차 대화 열기 · {chatCount}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, paddingTop: Spacing.xxxl + 20, paddingBottom: 60 },
  containerWide: { paddingHorizontal: Spacing.xxxl },
  wideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xl },
  wideRail: { width: 360, flexShrink: 0 },
  wideMain: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.md, marginBottom: 14 },
  headerTexts: { flexShrink: 1, gap: 2 },
  hd: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  hs: { fontSize: 14 },
  card: { borderRadius: Radius.lg, padding: 14, gap: 10, marginBottom: 16 },
  progressHeadRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, fontWeight: '600' },
  progressNext: { fontSize: 13, fontWeight: '700' },
  segments: { flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 8, borderRadius: Radius.pill },
  todoHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.6, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { fontSize: 13.5, flexShrink: 1 },
  alwaysCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  pressed: { opacity: 0.85 },
  alwaysTexts: { flex: 1, minWidth: 0, gap: 2 },
  alwaysTitle: { fontSize: 13.5, fontWeight: '700' },
  alwaysPreview: { fontSize: 12.5 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  timeline: { flexDirection: 'column' },
  nodeRow: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  nodeRail: { width: 26, alignItems: 'center', flexShrink: 0, paddingTop: 4 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dashedDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderStyle: 'dashed' },
  line: { flex: 1, width: 2, minHeight: 14 },
  nodeBody: { flex: 1, minWidth: 0, paddingBottom: 14 },
  nodeCard: { borderWidth: 1, borderRadius: Radius.lg, padding: 14, gap: 6 },
  nodeCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nodeTitle: { fontSize: 15, fontWeight: '700' },
  nodeTopic: { fontSize: 13.5, lineHeight: 19 },
  expandCard: { borderRadius: Radius.lg, padding: 14, marginTop: 8, gap: 12 },
  expandSection: { gap: 4 },
  expandSectionBordered: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 6 },
  expandLabel: { fontSize: 11.5, fontWeight: '700' },
  expandBody: { fontSize: 14, lineHeight: 21 },
  materialRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12 },
  materialText: { fontSize: 13.5, fontWeight: '600', flexShrink: 1 },
  openChatButton: { height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  openChatText: { fontSize: 13.5, fontWeight: '700' },
  originCard: { borderWidth: 1, borderStyle: 'dashed', borderRadius: Radius.lg, padding: 14, gap: 8 },
  originTitle: { fontSize: 13, fontWeight: '700' },
  originRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  originFile: { flex: 1, minWidth: 0, fontSize: 13 },
  originAction: { fontSize: 12, fontWeight: '600' },
});
