import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  createChatUploadTicket,
  getChatFileUrl,
  getChatMessages,
  getChatRooms,
  getStudentDetail,
  sendChatMessage,
  uploadWithTicket,
} from '@/lib/management-api';
import {
  CHAT_ALWAYS_ROOM,
  type ChatMessageView,
  type ChatRoomsSummary,
  type LessonSessionFull,
} from '@/lib/management-types';

const POLL_INTERVAL_MS = 5000;

const QUICK_REPLIES: { label: string; text: string }[] = [
  { label: '수업 리마인드', text: '내일 수업 리마인드 드려요 — 시간 꼭 확인해주세요!' },
  { label: '수업 요약 공유', text: '오늘 수업 요약을 정리해서 올려드릴게요.' },
  { label: '생기부 요청', text: '다음 수업 전에 최신 생기부 파일 한 번 올려주실 수 있을까요?' },
  { label: '결제 안내', text: '잔여 회차 안내와 결제 관련해서 말씀드릴게 있어요.' },
];

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; messages: ChatMessageView[] };

/**
 * 컨설턴트 ↔ 학생 채팅방. 학생 본인은 studentId 없이(자기 방) 열고, 컨설턴트/실장은
 * 특정 학생 방을 studentId 로 지목해서 연다.
 *
 * studentId 로 열 때(컨설턴트/실장)는 학생의 StudentChatScreen(2a)과 같은 상시
 * 피드백/회차별 탭을 상단에 보여준다 — 지금까지는 이 탭이 없어 학생이 특정 회차
 * 방에 남긴 메시지가 컨설턴트 화면의 전체 대화 목록에 뒤섞여 보였다.
 */
export function ChatThread({
  studentId,
  keyboardVerticalOffset = 0,
}: {
  studentId?: string;
  /** 이 화면 위에 떠 있는 헤더 높이(있다면). 없으면 0 — 탭 화면처럼 헤더가 없는
   *  곳에 90 같은 고정값을 그대로 쓰면 키보드 위에 불필요한 빈 틈이 생긴다. */
  keyboardVerticalOffset?: number;
}) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [activeRoom, setActiveRoom] = useState<string>(CHAT_ALWAYS_ROOM);
  const [rooms, setRooms] = useState<{ summary: ChatRoomsSummary; sessions: LessonSessionFull[] } | null>(null);
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

  const load = useCallback(async () => {
    try {
      const { messages } = await getChatMessages(studentId, studentId ? activeRoom : undefined);
      setState({ status: 'ready', messages });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : '불러오지 못했습니다.',
      });
    }
  }, [studentId, activeRoom]);

  // 상단 회차 스트립(상시 피드백 + 회차별) — 컨설턴트/실장이 특정 학생 방을 열 때만 있다.
  // 학생 본인 화면은 StudentChatScreen 이 따로 담당한다.
  const loadRooms = useCallback(async () => {
    if (!studentId) return;
    try {
      const [summary, detail] = await Promise.all([getChatRooms(studentId), getStudentDetail(studentId)]);
      setRooms({ summary, sessions: detail.sessions });
    } catch {
      // 스트립 갱신 실패는 조용히 무시하고 다음 폴링에서 다시 시도한다.
    }
  }, [studentId]);

  useEffect(() => {
    setActiveRoom(CHAT_ALWAYS_ROOM);
    setRooms(null);
  }, [studentId]);

  useEffect(() => {
    setState({ status: 'loading' });
    load();
  }, [activeRoom]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      load();
      loadRooms();
      return () => {
        focused.current = false;
      };
    }, [load, loadRooms])
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (focused.current) {
        load();
        loadRooms();
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load, loadRooms]);

  async function handleSend(overrideBody?: string) {
    const body = (overrideBody ?? draft).trim();
    if (!body || sending) return;

    setSending(true);
    setDraft('');
    try {
      await sendChatMessage({ studentId, room: studentId ? activeRoom : undefined, body });
      await load();
      loadRooms();
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
        studentId,
        name: asset.name,
        size: asset.size ?? 0,
        type: asset.mimeType ?? '',
      });
      await uploadWithTicket(ticket, asset.uri);
      await sendChatMessage({
        studentId,
        room: studentId ? activeRoom : undefined,
        filePath: ticket.path,
        fileName: asset.name,
        fileSize: asset.size,
        fileType: asset.mimeType,
      });
      await load();
      loadRooms();
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

  if (state.status === 'error') {
    return <StatusMessage message={state.message} onRetry={load} />;
  }

  const canSend = !!draft.trim() && !sending;

  // 컨설턴트/실장이 특정 학생 방을 열 때만 상단에 상시 피드백/회차별 탭을 보여준다.
  const stripItems =
    studentId && rooms
      ? [
          { key: CHAT_ALWAYS_ROOM, label: '상시 피드백', unread: rooms.summary.always.unreadCount > 0 },
          ...rooms.sessions.map((session) => ({
            key: session.id,
            label: `${session.session_round}회`,
            unread: (rooms.summary.sessions[session.id]?.unreadCount ?? 0) > 0,
          })),
        ]
      : null;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}>
      {stripItems ? (
        <View style={[styles.strip, { backgroundColor: surface, borderBottomColor: border }]}>
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
      ) : null}

      {state.status === 'loading' ? (
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator color={primary} />
        </View>
      ) : (
      <FlatList
        data={[...state.messages].reverse()}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const time = (
            <ThemedText style={[styles.timeText, { color: textTertiary }]}>
              {new Date(item.createdAt).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </ThemedText>
          );

          const bubble = (
            <View
              style={[
                styles.bubble,
                item.isMine
                  ? [styles.bubbleMine, { backgroundColor: primary }]
                  : [styles.bubbleTheirs, { backgroundColor: surfaceSecondary }],
              ]}>
              {item.body ? (
                <ThemedText style={[styles.bubbleText, { color: item.isMine ? '#fff' : text }]}>
                  {item.body}
                </ThemedText>
              ) : null}
              {item.hasFile ? (
                <Pressable style={styles.fileChip} onPress={() => handleOpenFile(item.id)}>
                  <Ionicons
                    name="document-attach-outline"
                    size={15}
                    color={item.isMine ? '#fff' : primary}
                  />
                  <ThemedText
                    style={[styles.bubbleText, styles.fileChipText, { color: item.isMine ? '#fff' : primary }]}>
                    {item.fileName ?? '첨부파일'}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          );

          return (
            <View
              style={[
                styles.row,
                item.isMine ? styles.rowMine : styles.rowTheirs,
              ]}>
              {item.isMine ? (
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
            {activeRoom === CHAT_ALWAYS_ROOM
              ? '아직 대화가 없어요. 먼저 메시지를 보내보세요.'
              : '이 회차에 대한 대화가 아직 없어요.'}
          </ThemedText>
        }
      />
      )}

      <View style={[styles.composer, { backgroundColor: surface, borderTopColor: border }]}>
        {studentId ? (
          <View style={styles.quickReplyRow}>
            {QUICK_REPLIES.map((reply) => (
              <Pressable
                key={reply.label}
                style={[styles.quickReplyChip, { backgroundColor: primaryMuted }]}
                onPress={() => setDraft(reply.text)}>
                <ThemedText style={[styles.quickReplyChipText, { color: primary }]}>{reply.label}</ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.inputRow}>
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
          style={[
            styles.sendButton,
            { backgroundColor: canSend ? primary : primaryMuted },
          ]}
          onPress={() => handleSend()}
          disabled={!canSend}>
          <Ionicons name="arrow-up" size={20} color={canSend ? '#fff' : primary} />
        </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  strip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
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
  list: { padding: Spacing.lg, gap: Spacing.sm, flexGrow: 1, justifyContent: 'flex-end' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    width: '100%',
  },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 4,
  },
  bubbleMine: {
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14.5, lineHeight: 20 },
  timeText: { fontSize: 10 },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fileChipText: { textDecorationLine: 'underline' },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  quickReplyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickReplyChip: { borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  quickReplyChipText: { fontSize: 12.5, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
