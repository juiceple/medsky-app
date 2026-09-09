import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getStudents } from '@/lib/management-api';
import type { StudentSummary } from '@/lib/management-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; students: StudentSummary[] };

/** 컨설턴트(담당 학생) / 실장(전체 학생) 명부. 실장이면 헤더에 콘솔 진입 버튼을 붙인다. */
export function StudentRosterScreen({ isManager = false }: { isManager?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');

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
      data={state.students}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primary} />}
      ListHeaderComponent={
        <ScreenHeader
          title="담당 학생"
          subtitle={`${state.students.length}명을 관리하고 있어요`}
          trailing={
            isManager ? (
              <Pressable onPress={() => router.push('/admin')} style={styles.consoleButton} hitSlop={8}>
                <Ionicons name="settings-outline" size={22} color={textSecondary} />
              </Pressable>
            ) : undefined
          }
        />
      }
      ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/student/[id]', params: { id: item.id } })}>
          {({ pressed }) => (
            <Card style={[styles.card, pressed && styles.cardPressed]}>
              <Avatar name={item.student_name} size={44} />
              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <ThemedText style={styles.name}>{item.student_name}</ThemedText>
                  {item.service_type ? <Badge label={item.service_type} tone="primary" /> : null}
                </View>
                <ThemedText style={[styles.meta, { color: textSecondary }]} numberOfLines={1}>
                  잔여 {item.balance.remaining}회
                  {item.consultantName ? ` · 담당 ${item.consultantName}` : ''}
                  {item.lastLessonDate ? ` · 최근 수업 ${item.lastLessonDate}` : ''}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={textTertiary} />
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
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  consoleButton: { padding: 4 },
});
