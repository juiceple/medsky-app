import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  createChatUploadTicket,
  getChatFileUrl,
  getChatMessages,
  sendChatMessage,
  uploadWithTicket,
} from '@/lib/management-api';
import type { ChatMessageView } from '@/lib/management-types';

const POLL_INTERVAL_MS = 5000;

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; messages: ChatMessageView[] };

/**
 * 컨설턴트 ↔ 학생 채팅방. 학생 본인은 studentId 없이(자기 방) 열고, 컨설턴트/실장은
 * 특정 학생 방을 studentId 로 지목해서 연다.
 */
export function ChatThread({ studentId }: { studentId?: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const focused = useRef(true);
  const textColor = useThemeColor({}, 'text');

  const load = useCallback(async () => {
    try {
      const { messages } = await getChatMessages(studentId);
      setState({ status: 'ready', messages });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : '불러오지 못했습니다.',
      });
    }
  }, [studentId]);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      load();
      return () => {
        focused.current = false;
      };
    }, [load])
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (focused.current) load();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setDraft('');
    try {
      await sendChatMessage({ studentId, body });
      await load();
    } catch (error) {
      Alert.alert('전송 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
      setDraft(body);
    } finally {
      setSending(false);
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
        filePath: ticket.path,
        fileName: asset.name,
        fileSize: asset.size,
        fileType: asset.mimeType,
      });
      await load();
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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <FlatList
        data={[...state.messages].reverse()}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ThemedView
            style={[styles.bubble, item.isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            {item.body ? <ThemedText style={styles.bubbleText}>{item.body}</ThemedText> : null}
            {item.hasFile ? (
              <Pressable onPress={() => handleOpenFile(item.id)}>
                <ThemedText type="link" style={styles.bubbleText}>
                  📎 {item.fileName ?? '첨부파일'}
                </ThemedText>
              </Pressable>
            ) : null}
            <ThemedText style={styles.bubbleTime}>
              {new Date(item.createdAt).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </ThemedText>
          </ThemedView>
        )}
        ListEmptyComponent={
          <ThemedText style={styles.emptyText}>아직 대화가 없어요. 먼저 메시지를 보내보세요.</ThemedText>
        }
      />

      <ThemedView style={styles.inputRow}>
        <Pressable style={styles.attachButton} onPress={handleAttach} disabled={sending}>
          <ThemedText style={styles.attachButtonText}>+</ThemedText>
        </Pressable>
        <TextInput
          style={[styles.input, { color: textColor }]}
          value={draft}
          onChangeText={setDraft}
          placeholder="메시지 입력"
          placeholderTextColor="rgba(128,128,128,0.7)"
          multiline
        />
        <Pressable
          style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!draft.trim() || sending}>
          <ThemedText style={styles.sendButtonText}>전송</ThemedText>
        </Pressable>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 8, flexGrow: 1, justifyContent: 'flex-end' },
  emptyText: { textAlign: 'center', opacity: 0.6, marginTop: 40 },
  bubble: {
    maxWidth: '80%',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(10,126,164,0.15)',
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
  bubbleText: { fontSize: 14 },
  bubbleTime: { fontSize: 10, opacity: 0.5 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.3)',
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.4)',
  },
  attachButtonText: { fontSize: 18, lineHeight: 20 },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: '#fff', fontWeight: '600' },
});
