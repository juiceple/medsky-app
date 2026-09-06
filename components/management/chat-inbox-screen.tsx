import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getChatInbox } from '@/lib/management-api';
import type { ChatInboxEntry } from '@/lib/management-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; entries: ChatInboxEntry[] };

/** 컨설턴트/실장의 담당 학생별 채팅 목록. */
export function ChatInboxScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { entries } = await getChatInbox();
      setState({ status: 'ready', entries });
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
    <FlatList
      data={state.entries}
      keyExtractor={(item) => item.studentId}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      ListHeaderComponent={<ThemedText type="title">채팅</ThemedText>}
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() =>
            router.push({ pathname: '/chat/[studentId]', params: { studentId: item.studentId } })
          }>
          <ThemedView style={styles.cardHeader}>
            <ThemedText type="defaultSemiBold">{item.studentName}</ThemedText>
            {item.unreadCount > 0 ? (
              <ThemedView style={styles.badge}>
                <ThemedText style={styles.badgeText}>{item.unreadCount}</ThemedText>
              </ThemedView>
            ) : null}
          </ThemedView>
          <ThemedText style={styles.cardBody} numberOfLines={1}>
            {item.lastMessagePreview ?? '대화를 시작해보세요.'}
          </ThemedText>
        </Pressable>
      )}
      ListEmptyComponent={
        <ThemedText style={styles.cardBody}>담당하는 학생이 아직 없어요.</ThemedText>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingTop: 60, gap: 12 },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.25)',
    borderRadius: 12,
    padding: 16,
    gap: 4,
    marginTop: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardBody: { fontSize: 13, opacity: 0.8 },
  badge: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
