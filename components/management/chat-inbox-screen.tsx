import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import { ChatStudentInfoPanel } from '@/components/management/chat-student-info-panel';
import { ChatThread } from '@/components/management/chat-thread';
import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Radius, Spacing } from '@/constants/theme';
import { useBreakpoint, useIsWorkspaceWide } from '@/hooks/use-breakpoint';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getChatInbox } from '@/lib/management-api';
import type { ChatInboxEntry } from '@/lib/management-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; entries: ChatInboxEntry[] };

type Filter = 'all' | 'unread';

function formatTimestamp(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function SearchBar({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const surface = useThemeColor({}, 'surface');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const text = useThemeColor({}, 'text');
  return (
    <View style={[styles.searchBar, { backgroundColor: surface }]}>
      <Ionicons name="search" size={17} color={textTertiary} />
      <TextInput
        style={[styles.searchInput, { color: text }]}
        value={value}
        onChangeText={onChange}
        placeholder="학생 · 메시지 검색"
        placeholderTextColor={textTertiary}
      />
    </View>
  );
}

function FilterChips({
  filter,
  onChange,
  unreadCount,
  totalCount,
}: {
  filter: Filter;
  onChange: (f: Filter) => void;
  unreadCount: number;
  totalCount: number;
}) {
  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: `전체 ${totalCount}` },
    { key: 'unread', label: `안 읽음 ${unreadCount}` },
  ];
  return (
    <View style={styles.filterRow}>
      {chips.map((chip) => {
        const active = filter === chip.key;
        return (
          <Pressable
            key={chip.key}
            onPress={() => onChange(chip.key)}
            style={[styles.filterChip, { backgroundColor: active ? primary : surface }]}>
            <ThemedText style={[styles.filterChipText, { color: active ? '#fff' : textSecondary }]}>
              {chip.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function InboxRow({
  entry,
  selected,
  onPress,
}: {
  entry: ChatInboxEntry;
  selected?: boolean;
  onPress: () => void;
}) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const primary = useThemeColor({}, 'primary');
  const danger = useThemeColor({}, 'danger');

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <Card
          style={[
            styles.card,
            pressed && styles.cardPressed,
            selected ? { borderLeftWidth: 3, borderLeftColor: primary } : null,
          ]}>
          <Avatar name={entry.studentName} size={44} />
          <View style={styles.cardBody}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.name}>{entry.studentName}</ThemedText>
              <ThemedText style={[styles.time, { color: entry.unreadCount > 0 ? primary : textTertiary }]}>
                {formatTimestamp(entry.lastMessageAt)}
              </ThemedText>
            </View>
            <View style={styles.previewRow}>
              <ThemedText
                style={[
                  styles.preview,
                  { color: entry.unreadCount > 0 ? undefined : textSecondary },
                  entry.unreadCount > 0 && styles.previewUnread,
                ]}
                numberOfLines={1}>
                {entry.lastMessagePreview ?? '대화를 시작해보세요.'}
              </ThemedText>
              {entry.unreadCount > 0 ? (
                <View style={[styles.badge, { backgroundColor: danger }]}>
                  <ThemedText style={styles.badgeText}>{entry.unreadCount > 99 ? '99+' : entry.unreadCount}</ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        </Card>
      )}
    </Pressable>
  );
}

/** 컨설턴트/실장의 담당 학생별 채팅 목록. 태블릿/PC에서는 목록+대화창 2단(master-detail)으로 넓힌다. */
export function ChatInboxScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const breakpoint = useBreakpoint();
  const isWide = breakpoint !== 'mobile';
  const isWorkspaceWide = useIsWorkspaceWide();

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

  useEffect(() => {
    if (state.status !== 'ready' || !isWide) return;
    if (selectedStudentId && state.entries.some((e) => e.studentId === selectedStudentId)) return;
    setSelectedStudentId(state.entries[0]?.studentId ?? null);
  }, [state, isWide, selectedStudentId]);

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

  const unreadCount = state.entries.filter((e) => e.unreadCount > 0).length;
  const filtered = state.entries.filter((entry) => {
    if (filter === 'unread' && entry.unreadCount === 0) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      entry.studentName.toLowerCase().includes(q) ||
      (entry.lastMessagePreview ?? '').toLowerCase().includes(q)
    );
  });

  function openEntry(entry: ChatInboxEntry) {
    if (isWide) {
      setSelectedStudentId(entry.studentId);
    } else {
      router.push({ pathname: '/chat/[studentId]', params: { studentId: entry.studentId } });
    }
  }

  const list = (
    <FlatList
      style={{ backgroundColor: background, flex: 1 }}
      data={filtered}
      keyExtractor={(item) => item.studentId}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primary} />}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <ScreenHeader
            title="채팅"
            subtitle={unreadCount > 0 ? `안 읽음 ${unreadCount}` : undefined}
          />
          <SearchBar value={query} onChange={setQuery} />
          <FilterChips filter={filter} onChange={setFilter} unreadCount={unreadCount} totalCount={state.entries.length} />
        </View>
      }
      ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      renderItem={({ item }) => (
        <InboxRow
          entry={item}
          selected={isWide && item.studentId === selectedStudentId}
          onPress={() => openEntry(item)}
        />
      )}
      ListEmptyComponent={
        <ThemedText style={[styles.empty, { color: textSecondary }]}>
          {query || filter === 'unread' ? '조건에 맞는 대화가 없어요.' : '담당하는 학생이 아직 없어요.'}
        </ThemedText>
      }
    />
  );

  if (!isWide) return list;

  const selectedEntry = state.entries.find((e) => e.studentId === selectedStudentId) ?? null;

  return (
    <View style={[styles.desktopRow, { backgroundColor: background }]}>
      <View style={styles.desktopList}>{list}</View>
      <View style={[styles.desktopThread, { backgroundColor: background }]}>
        {selectedEntry ? (
          <>
            <View style={[styles.threadHeader, { backgroundColor: background }]}>
              <Avatar name={selectedEntry.studentName} size={36} />
              <ThemedText style={styles.threadHeaderName}>{selectedEntry.studentName}</ThemedText>
            </View>
            <ChatThread key={selectedEntry.studentId} studentId={selectedEntry.studentId} />
          </>
        ) : (
          <View style={styles.center}>
            <Ionicons name="chatbubbles-outline" size={32} color={textTertiary} />
            <ThemedText style={[styles.empty, { color: textSecondary }]}>왼쪽에서 대화를 선택하세요.</ThemedText>
          </View>
        )}
      </View>
      {isWorkspaceWide && selectedEntry ? (
        <ChatStudentInfoPanel key={selectedEntry.studentId} studentId={selectedEntry.studentId} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  container: { padding: Spacing.xl, paddingTop: Spacing.xxxl + 20, paddingBottom: 60, flexGrow: 1 },
  headerBlock: { gap: Spacing.md, marginBottom: Spacing.md },
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

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.md,
    height: 42,
    paddingHorizontal: Spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14, height: '100%' },
  filterRow: { flexDirection: 'row', gap: 6 },
  filterChip: { borderRadius: Radius.pill, paddingHorizontal: 13, paddingVertical: 7 },
  filterChipText: { fontSize: 13, fontWeight: '700' },

  desktopRow: { flex: 1, flexDirection: 'row' },
  desktopList: { flex: 1, maxWidth: 420, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(17,24,39,0.08)' },
  desktopThread: { flex: 1.4 },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(17,24,39,0.08)',
  },
  threadHeaderName: { fontSize: 16, fontWeight: '700' },
});
