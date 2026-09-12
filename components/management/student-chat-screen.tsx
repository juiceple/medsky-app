import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { Badge, lessonStatusTone } from '@/components/ui/badge';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  createChatUploadTicket,
  getChatFileUrl,
  getChatMessages,
  getChatRooms,
  getPortal,
  sendChatMessage,
  uploadWithTicket,
} from '@/lib/management-api';
import {
  CHAT_ALWAYS_ROOM,
  type ChatMessageView,
  type ChatRoomsSummary,
  type StudentPortalData,
  type StudentPortalSession,
} from '@/lib/management-types';

const POLL_INTERVAL_MS = 5000;

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; portal: StudentPortalData; rooms: ChatRoomsSummary };

type FeedItem =
  | { kind: 'message'; at: string; message: ChatMessageView }
  | { kind: 'session-shared'; at: string; session: StudentPortalSession };

/**
 * 학생의 대화 탭 — 2a: 기본은 회차와 무관한 "상시 피드백" 방, 상단 스트립으로
 * 회차별 대화방을 오간다. 홈(진행 현황)의 "이 회차 대화 열기" / "상시 피드백"
 * 카드가 `room` 파라미터로 이 화면을 열면 그 방으로 바로 포커스된다.
 *
 * 회차 기록이 등록된 시점(shared_at)은 상시 피드백 피드에 "N회차 기록이
 * 등록됐어요" 안내줄로 합성해서 끼워 넣는다 — 서버는 시스템 메시지를 따로
 * 저장하지 않는다(medsky_homepage 20260906000000_management_chat_sessions.sql 참고).
 */
export function StudentChatScreen() {
  const { room: roomParam } = useLocalSearchParams<{ room?: string }>();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [activeRoom, setActiveRoom] = useState<string>(CHAT_ALWAYS_ROOM);
  const [messages, setMessages] = useState<ChatMessageView[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const focused = useRef(true);

  const background = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');
  const primaryMuted = useThemeColor({}, 'primaryMuted');
  const danger = useThemeColor({}, 'danger');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');

  useEffect(() => {
    if (roomParam) setActiveRoom(roomParam);
  }, [roomParam]);

  const loadOverview = useCallback(async () => {
    try {
      const [portal, rooms] = await Promise.all([getPortal(), getChatRooms()]);
      setState({ status: 'ready', portal, rooms });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : '불러오지 못했습니다.',
      });
    }
  }, []);

  const loadMessages = useCallback(async (room: string) => {
    try {
      const { messages: nextMessages } = await getChatMessages(undefined, room);
      setMessages(nextMessages);
    } catch {
      // 방 전환 폴링 실패는 조용히 무시하고 다음 폴링에서 다시 시도한다.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      loadOverview();
      return () => {
        focused.current = false;
      };
    }, [loadOverview])
  );

  useEffect(() => {
    setMessages(null);
    loadMessages(activeRoom);
  }, [activeRoom, loadMessages]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (focused.current) {
        loadMessages(activeRoom);
        loadOverview();
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeRoom, loadMessages, loadOverview]);

  async function handleSend(overrideBody?: string) {
    const body = (overrideBody ?? draft).trim();
    if (!body || sending) return;

    setSending(true);
    setDraft('');
    try {
      await sendChatMessage({ room: activeRoom, body });
      await loadMessages(activeRoom);
      loadOverview();
    } catch (error) {
      Alert.alert('전송 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
      setDraft(body);
    } finally {
      setSending(false);
    }
  }

  // 웹(react-native-web)은 실제 keydown 이벤트를 받아 shiftKey 를 구분할 수 있어
  // onKeyPress 로 plain Enter 만 가로채 전송하고 Shift+Enter 는 줄바꿈으로 남긴다.
  // 네이티브(iOS/Android)는 onKeyPress 가 하드웨어 키보드 입력을 안정적으로 주지
  // 않고 shiftKey 도 안 실려 온다 — 대신 TextInput 의 submitBehavior="submit" +
  // onSubmitEditing 을 써서 Return 키(자체 키보드·외장 키보드 모두)를 "전송"으로
  // 다룬다. 예전에는 onChangeText 에 섞여 들어온 개행을 감지해 전송했는데, 그
  // 방식은 여러 줄을 붙여넣기만 해도 확인 없이 바로 전송돼 버리는 문제가 있었다.
  function handleSubmitEditing() {
    if (Platform.OS === 'web') return; // 웹은 handleKeyPress 가 전송을 담당한다.
    void handleSend();
  }

  function handleKeyPress(event: NativeSyntheticEvent<TextInputKeyPressEventData>) {
    if (Platform.OS !== 'web') return;
    const nativeEvent = event.nativeEvent as unknown as {
      key: string;
      shiftKey?: boolean;
      preventDefault?: () => void;
    };
    if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
      nativeEvent.preventDefault?.();
      void handleSend();
    }
  }

  async function handleAttach() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setSending(true);

      const { ticket } = await createChatUploadTicket({
        name: asset.name,
        size: asset.size ?? 0,
        type: asset.mimeType ?? '',
      });
      await uploadWithTicket(ticket, asset.uri);
      await sendChatMessage({
        room: activeRoom,
        filePath: ticket.path,
        fileName: asset.name,
        fileSize: asset.size,
        fileType: asset.mimeType,
      });
      await loadMessages(activeRoom);
      loadOverview();
    } catch (error) {
      Alert.alert('첨부 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSending(false);
    }
  }

  async function handleOpenFile(messageId: string) {
    try {
      const { signedUrl } = await getChatFileUrl(messageId);
      await Linking.openURL(signedUrl);
    } catch (error) {
      Alert.alert('열기 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    }
  }

  const activeSession = useMemo(
    () => (state.status === 'ready' ? state.portal.sessions.find((s) => s.id === activeRoom) ?? null : null),
    [state, activeRoom]
  );

  const feedItems = useMemo<FeedItem[]>(() => {
    if (!messages) return [];

    const items: FeedItem[] = messages.map((message) => ({ kind: 'message', at: message.createdAt, message }));

    if (activeRoom === CHAT_ALWAYS_ROOM && state.status === 'ready') {
      for (const session of state.portal.sessions) {
        if (session.shared_at) {
          items.push({ kind: 'session-shared', at: session.shared_at, session });
        }
      }
    }

    return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [messages, activeRoom, state]);

  if (state.status === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: background }]}>
        <ActivityIndicator color={primary} />
      </View>
    );
  }

  if (state.status === 'error') {
    return <StatusMessage message={state.message} onRetry={loadOverview} />;
  }

  const { portal, rooms } = state;
  const canSend = !!draft.trim() && !sending;
  const isAlways = activeRoom === CHAT_ALWAYS_ROOM;
  const headTitle = isAlways ? '상시 피드백' : activeSession ? `${activeSession.session_round}회차` : '회차 대화';
  const headSubtitle = isAlways
    ? portal.consultant
      ? `${portal.consultant.name} 컨설턴트 · 회차와 무관한 질문`
      : '회차와 무관한 질문·피드백'
    : (activeSession?.lesson_date ?? '');

  const stripItems = [
    { key: CHAT_ALWAYS_ROOM, label: '상시 피드백', unread: rooms.always.unreadCount > 0 },
    ...portal.sessions.map((session) => ({
      key: session.id,
      label: `${session.session_round}회`,
      unread: (rooms.sessions[session.id]?.unreadCount ?? 0) > 0,
    })),
  ];

  const showPlannedPlaceholder =
    !isAlways && activeSession?.status === '예정' && !activeSession.topic && !activeSession.student_summary && messages?.length === 0;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // 이 화면은 탭 안(헤더 없음)에서만 쓰인다 — 헤더가 있는 ChatThread 와 달리
      // 오프셋을 더할 대상이 없다. 예전 고정값 90 은 이 화면엔 불필요한 빈 틈을,
      // 헤더가 있는 다른 화면엔 부족한 오프셋을 만들던 값이었다.
      keyboardVerticalOffset={0}>
      <View style={[styles.head, { backgroundColor: surface, borderBottomColor: border }]}>
        <View style={styles.headRow}>
          {!isAlways ? (
            <Pressable
              style={styles.backButton}
              onPress={() => setActiveRoom(CHAT_ALWAYS_ROOM)}
              hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={primary} />
            </Pressable>
          ) : null}
          <View style={styles.headTexts}>
            <ThemedText style={styles.headTitle}>{headTitle}</ThemedText>
            {headSubtitle ? (
              <ThemedText style={[styles.headSubtitle, { color: textSecondary }]}>{headSubtitle}</ThemedText>
            ) : null}
          </View>
          {!isAlways && activeSession ? (
            <Badge label={activeSession.status} tone={lessonStatusTone(activeSession.status)} />
          ) : null}
        </View>
        <FlatList
          horizontal
          data={stripItems}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripContent}
          renderItem={({ item }) => {
            const selected = item.key === activeRoom;
            return (
              <Pressable
                onPress={() => setActiveRoom(item.key)}
                style={[styles.stripPill, { backgroundColor: selected ? primary : surfaceSecondary }]}>
                <ThemedText style={[styles.stripPillText, { color: selected ? '#fff' : textSecondary }]}>
                  {item.label}
                </ThemedText>
                {item.unread && !selected ? <View style={[styles.stripDot, { backgroundColor: danger }]} /> : null}
              </Pressable>
            );
          }}
        />
      </View>

      {showPlannedPlaceholder ? (
        <View style={styles.plannedContainer}>
          <ThemedText style={[styles.plannedText, { color: textTertiary }]}>
            아직 진행 전 회차입니다.{'\n'}미리 물어볼 내용을 남겨두면 수업 때 함께 봅니다.
          </ThemedText>
        </View>
      ) : messages === null ? (
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator color={primary} />
        </View>
      ) : (
        <FlatList
          style={styles.flex}
          data={[...feedItems].reverse()}
          keyExtractor={(item) => (item.kind === 'message' ? item.message.id : `shared-${item.session.id}`)}
          inverted
          contentContainerStyle={styles.list}
          ListFooterComponent={
            !isAlways && activeSession && (activeSession.topic || activeSession.student_summary) ? (
              <View style={[styles.summaryCard, { backgroundColor: surface }]}>
                <ThemedText style={[styles.summaryLabel, { color: primary }]}>
                  {activeSession.session_round}회차 기록
                </ThemedText>
                {activeSession.topic ? <ThemedText style={styles.summaryTopic}>{activeSession.topic}</ThemedText> : null}
                {activeSession.student_summary ? (
                  <ThemedText style={[styles.summaryBody, { color: textSecondary }]}>
                    {activeSession.student_summary}
                  </ThemedText>
                ) : null}
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.kind === 'session-shared') {
              return (
                <Pressable
                  style={[styles.systemRow, { backgroundColor: surface }]}
                  onPress={() => setActiveRoom(item.session.id)}>
                  <Ionicons name="git-commit-outline" size={17} color={textSecondary} />
                  <ThemedText style={[styles.systemText, { color: textSecondary }]}>
                    {item.session.session_round}회차 수업 기록이 등록됐어요
                  </ThemedText>
                  <ThemedText style={[styles.systemAction, { color: primary }]}>회차 대화 보기</ThemedText>
                </Pressable>
              );
            }

            const message = item.message;
            const time = (
              <ThemedText style={[styles.timeText, { color: textTertiary }]}>
                {new Date(message.createdAt).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </ThemedText>
            );

            const bubble = (
              <View
                style={[
                  styles.bubble,
                  message.isMine
                    ? [styles.bubbleMine, { backgroundColor: primary }]
                    : [styles.bubbleTheirs, { backgroundColor: surfaceSecondary }],
                ]}>
                {message.body ? (
                  <ThemedText style={[styles.bubbleText, { color: message.isMine ? '#fff' : text }]}>
                    {message.body}
                  </ThemedText>
                ) : null}
                {message.hasFile ? (
                  <Pressable style={styles.fileChip} onPress={() => handleOpenFile(message.id)}>
                    <Ionicons
                      name="document-attach-outline"
                      size={15}
                      color={message.isMine ? '#fff' : primary}
                    />
                    <ThemedText
                      style={[styles.bubbleText, styles.fileChipText, { color: message.isMine ? '#fff' : primary }]}>
                      {message.fileName ?? '첨부파일'}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            );

            return (
              <View style={[styles.row, message.isMine ? styles.rowMine : styles.rowTheirs]}>
                {message.isMine ? (
                  <>
                    {time}
                    {bubble}
                  </>
                ) : (
                  <>
                    {bubble}
                    {time}
                  </>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
              {isAlways ? '아직 대화가 없어요. 편하게 질문해보세요.' : '이 회차에 대한 대화가 아직 없어요.'}
            </ThemedText>
          }
        />
      )}

      <View style={[styles.inputRow, { backgroundColor: surface, borderTopColor: border }]}>
        <Pressable
          style={[styles.attachButton, { backgroundColor: surfaceSecondary }]}
          onPress={handleAttach}
          disabled={sending}>
          <Ionicons name="add" size={22} color={textSecondary} />
        </Pressable>
        <TextInput
          style={[styles.input, { color: text, backgroundColor: surfaceSecondary }]}
          value={draft}
          onChangeText={setDraft}
          onKeyPress={handleKeyPress}
          onSubmitEditing={handleSubmitEditing}
          submitBehavior={Platform.OS === 'web' ? 'newline' : 'submit'}
          placeholder="메시지 입력"
          placeholderTextColor={textTertiary}
          multiline
        />
        <Pressable
          style={[styles.sendButton, { backgroundColor: canSend ? primary : primaryMuted }]}
          onPress={() => handleSend()}
          disabled={!canSend}>
          <Ionicons name="arrow-up" size={20} color={canSend ? '#fff' : primary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 10, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headTexts: { flex: 1, gap: 1 },
  headTitle: { fontSize: 15.5, fontWeight: '700' },
  headSubtitle: { fontSize: 11.5 },
  stripContent: { gap: 6, paddingRight: 12 },
  stripPill: {
    height: 28,
    minWidth: 44,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  stripPillText: { fontSize: 12, fontWeight: '700' },
  stripDot: { width: 6, height: 6, borderRadius: 3 },
  plannedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  plannedText: { fontSize: 12.5, lineHeight: 20, textAlign: 'center' },
  list: { padding: Spacing.lg, gap: Spacing.sm, flexGrow: 1, justifyContent: 'flex-end' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  summaryCard: { borderRadius: Radius.lg, padding: 14, gap: 8, marginBottom: Spacing.sm },
  summaryLabel: { fontSize: 11.5, fontWeight: '700' },
  summaryTopic: { fontSize: 14.5, fontWeight: '700' },
  summaryBody: { fontSize: 13.5, lineHeight: 20 },
  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.lg,
    padding: 12,
    marginBottom: Spacing.sm,
  },
  systemText: { flex: 1, fontSize: 13, lineHeight: 18 },
  systemAction: { fontSize: 12.5, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, width: '100%' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: Radius.lg, padding: Spacing.md, gap: 4 },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleTheirs: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14.5, lineHeight: 20 },
  timeText: { fontSize: 10 },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fileChipText: { textDecorationLine: 'underline' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachButton: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    fontSize: 15,
  },
  sendButton: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
