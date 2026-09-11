import { ActivityIndicator, StyleSheet } from 'react-native';

import { ChatInboxScreen } from '@/components/management/chat-inbox-screen';
import { StatusMessage } from '@/components/management/status-message';
import { StudentChatScreen } from '@/components/management/student-chat-screen';
import { ThemedView } from '@/components/themed-view';
import { useManagementViewer } from '@/hooks/use-management-viewer';

/**
 * 학생은 상시 피드백/회차별 대화방(StudentChatScreen, 2a)을, 컨설턴트/실장은 담당
 * 학생별 채팅 목록을 본다. 컨설턴트가 특정 학생과 나누는 대화는 ChatThread
 * (app/chat/[studentId].tsx)로 여는데, ChatThread 자체도 studentId 가 있을 때는
 * 같은 상시 피드백/회차별 탭을 상단에 보여준다.
 */
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
    return <StudentChatScreen />;
  }

  if (viewer.role === 'consultant' || viewer.role === 'manager') {
    return <ChatInboxScreen />;
  }

  return <StatusMessage message="이 계정은 채팅을 이용할 수 없어요." />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
