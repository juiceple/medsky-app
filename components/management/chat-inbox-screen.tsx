import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getChatInbox } from '@/lib/management-api';
import type { ChatInboxEntry } from '@/lib/management-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; entries: ChatInboxEntry[] };

function formatTimestamp(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

/** 컨설턴트/실장의 담당 학생별 채팅 목록. */
export function ChatInboxScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const danger = useThemeColor({}, 'danger');

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
      <View style={[styles.center, { backgroundColor: background }]}>
        <ActivityIndicator color={primary} />
      </View>
    );
  }

  if (state.status === 'error') {
    return <StatusMessage message={state.message} onRetry={load} />;
  }

  return (
    <FlatList
      style={{ backgroundColor: background }}
      data={state.entries}
      keyExtractor={(item) => item.studentId}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primary} />}
      ListHeaderComponent={<ScreenHeader title="채팅" />}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      renderItem={({ item }) => (
        <Pressable
          onPress={() =>
            router.push({ pathname: '/chat/[studentId]', params: { studentId: item.studentId } })
          }>
          {({ pressed }) => (
            <Card style={[styles.card, pressed && styles.cardPressed]}>
              <Avatar name={item.studentName} size={44} />
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <ThemedText style={styles.name}>{item.studentName}</ThemedText>
                  <ThemedText style={[styles.time, { color: textTertiary }]}>
                    {formatTimestamp(item.lastMessageAt)}
                  </ThemedText>
                </View>
                <View style={styles.previewRow}>
                  <ThemedText
                    style={[
                      styles.preview,
                      { color: item.unreadCount > 0 ? undefined : textSecondary },
                      item.unreadCount > 0 && styles.previewUnread,
                    ]}
                    numberOfLines={1}>
                    {item.lastMessagePreview ?? '대화를 시작해보세요.'}
                  </ThemedText>
                  {item.unreadCount > 0 ? (
                    <View style={[styles.badge, { backgroundColor: danger }]}>
                      <ThemedText style={styles.badgeText}>
                        {item.unreadCount > 99 ? '99+' : item.unreadCount}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              </View>
            </Card>
          )}
        </Pressable>
      )}
      ListEmptyComponent={
        <ThemedText style={[styles.empty, { color: textSecondary }]}>담당하는 학생이 아직 없어요.</ThemedText>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, paddingTop: Spacing.xxxl + 20, paddingBottom: 60, flexGrow: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardPressed: { opacity: 0.85 },
  cardBody: { flex: 1, gap: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '700' },
  time: { fontSize: 12 },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  preview: { fontSize: 13.5, flexShrink: 1 },
  previewUnread: { fontWeight: '600' },
  badge: {
    borderRadius: Radius.pill,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
