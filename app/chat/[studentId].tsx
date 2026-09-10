import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ChatStudentInfoPanel } from '@/components/management/chat-student-info-panel';
import { ChatThread } from '@/components/management/chat-thread';
import { useIsWorkspaceWide } from '@/hooks/use-breakpoint';
import { useThemeColor } from '@/hooks/use-theme-color';

/** 컨설턴트/실장이 특정 학생과의 채팅방을 여는 화면. 태블릿 가로·PC에서는 오른쪽에 학생 정보 패널을 붙인다. */
export default function StudentChatScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const isWorkspaceWide = useIsWorkspaceWide();
  const background = useThemeColor({}, 'background');

  return (
    <>
      <Stack.Screen options={{ title: '채팅' }} />
      <View style={[styles.row, { backgroundColor: background }]}>
        <View style={styles.thread}>
          <ChatThread studentId={studentId} />
        </View>
        {isWorkspaceWide ? <ChatStudentInfoPanel studentId={studentId} /> : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  thread: { flex: 1, minWidth: 0 },
});
