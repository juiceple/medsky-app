import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getStudents } from '@/lib/management-api';
import type { StudentSummary } from '@/lib/management-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; students: StudentSummary[] };

/** 컨설턴트(담당 학생) / 실장(전체 학생) 명부. */
export function StudentRosterScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { students } = await getStudents();
      setState({ status: 'ready', students });
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
      data={state.students}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      ListHeaderComponent={<ThemedText type="title">담당 학생</ThemedText>}
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => router.push({ pathname: '/student/[id]', params: { id: item.id } })}>
          <ThemedText type="defaultSemiBold">{item.student_name}</ThemedText>
          <ThemedText style={styles.cardBody}>
            {item.service_type ?? '상품 미배정'} · {item.status ?? '상태 미확인'}
          </ThemedText>
          <ThemedText style={styles.cardMeta}>
            잔여 {item.balance.remaining}회
            {item.consultantName ? ` · 담당 ${item.consultantName}` : ''}
            {item.lastLessonDate ? ` · 최근 수업 ${item.lastLessonDate}` : ''}
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
  cardBody: { fontSize: 13, opacity: 0.8 },
  cardMeta: { fontSize: 12, opacity: 0.5 },
});
