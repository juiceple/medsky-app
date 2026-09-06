import { Stack, useLocalSearchParams } from 'expo-router';

import { ChatThread } from '@/components/management/chat-thread';

/** 컨설턴트/실장이 특정 학생과의 채팅방을 여는 화면. */
export default function StudentChatScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();

  return (
    <>
      <Stack.Screen options={{ title: '채팅' }} />
      <ChatThread studentId={studentId} />
    </>
  );
}
