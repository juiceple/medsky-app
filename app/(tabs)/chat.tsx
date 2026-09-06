import { ActivityIndicator, StyleSheet } from 'react-native';

import { ChatInboxScreen } from '@/components/management/chat-inbox-screen';
import { ChatThread } from '@/components/management/chat-thread';
import { StatusMessage } from '@/components/management/status-message';
import { ThemedView } from '@/components/themed-view';
import { useManagementViewer } from '@/hooks/use-management-viewer';

/** 학생은 담당 컨설턴트와의 채팅방을, 컨설턴트/실장은 담당 학생별 채팅 목록을 본다. */
export default function ChatScreen() {
  const viewerState = useManagementViewer();

  if (viewerState.status === 'loading') {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (viewerState.status === 'error') {
    return <StatusMessage message={viewerState.message} onRetry={viewerState.reload} />;
  }

  const { viewer } = viewerState;

  if (viewer.role === 'student' && viewer.studentId) {
    return <ChatThread studentId={viewer.studentId} />;
  }

  if (viewer.role === 'consultant' || viewer.role === 'manager') {
    return <ChatInboxScreen />;
  }

  return <StatusMessage message="이 계정은 채팅을 이용할 수 없어요." />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
