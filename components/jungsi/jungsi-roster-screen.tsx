import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getJungsiOnboardings } from '@/lib/jungsi-api';
import type { JungsiOnboardingWithFiles } from '@/lib/jungsi-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; onboardings: JungsiOnboardingWithFiles[] };

const CLOSED_STATUSES = new Set(['종료', '취소']);

function statusTone(status: string): BadgeTone {
  if (CLOSED_STATUSES.has(status)) return 'neutral';
  if (status === '리포트 전달') return 'success';
  if (status === '자료 대기' || status === '배정 대기') return 'warning';
  return 'primary';
}

function OnboardingRow({
  onboarding,
  onPress,
}: {
  onboarding: JungsiOnboardingWithFiles;
  onPress: () => void;
}) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  const name = onboarding.student_name ?? onboarding.buyer_name ?? '이름 미입력';
  const missingFiles = onboarding.files.filter((file) => file.check_result === '재발급 필요').length;

  return (
    <Pressable onPress={onPress} style={styles.rowWrap}>
      {({ pressed }) => (
        <Card style={[styles.row, pressed && styles.rowPressed]}>
          <Avatar name={name} size={40} />
          <View style={styles.rowBody}>
            <View style={styles.rowTitleLine}>
              <ThemedText style={styles.rowTitle}>{name}</ThemedText>
              <Badge label={onboarding.status} tone={statusTone(onboarding.status)} />
            </View>
            <ThemedText style={[styles.rowMeta, { color: textSecondary }]} numberOfLines={1}>
              {onboarding.lesson_date
                ? `수업 ${onboarding.lesson_date} ${onboarding.lesson_time ?? ''}`.trim()
                : '수업 일정 미정'}
            </ThemedText>
          </View>
          {missingFiles > 0 ? <Badge label={`재발급 ${missingFiles}`} tone="danger" /> : null}
        </Card>
      )}
    </Pressable>
  );
}

/** 컨설턴트/실장의 정시 원서 컨설팅 명부 — 웹 /consultant/jungsi 와 같은 화면이다. */
export function JungsiRosterScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const textSecondary = useThemeColor({}, 'textSecondary');

  const load = useCallback(async () => {
    try {
      const { onboardings } = await getJungsiOnboardings();
      setState({ status: 'ready', onboardings });
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

  const { open, closed } = useMemo(() => {
    if (state.status !== 'ready') return { open: [], closed: [] };
    const open: JungsiOnboardingWithFiles[] = [];
    const closed: JungsiOnboardingWithFiles[] = [];
    for (const row of state.onboardings) {
      (CLOSED_STATUSES.has(row.status) ? closed : open).push(row);
    }
    return { open, closed };
  }, [state]);

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <ThemedText style={styles.sectionTitle}>진행 중</ThemedText>
      {open.length === 0 ? (
        <ThemedText style={[styles.emptyText, { color: textSecondary }]}>
          진행 중인 건이 없어요.
        </ThemedText>
      ) : (
        open.map((onboarding) => (
          <OnboardingRow
            key={onboarding.id}
            onboarding={onboarding}
            onPress={() =>
              router.push({ pathname: '/jungsi-onboarding/[id]', params: { id: onboarding.id } })
            }
          />
        ))
      )}

      {closed.length > 0 ? (
        <>
          <ThemedText style={[styles.sectionTitle, styles.sectionTitleSpaced]}>종료·취소</ThemedText>
          {closed.map((onboarding) => (
            <OnboardingRow
              key={onboarding.id}
              onboarding={onboarding}
              onPress={() =>
                router.push({ pathname: '/jungsi-onboarding/[id]', params: { id: onboarding.id } })
              }
            />
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: Spacing.xs },
  sectionTitleSpaced: { marginTop: Spacing.lg },
  emptyText: { fontSize: 13, marginBottom: Spacing.sm },
  rowWrap: { marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  rowPressed: { opacity: 0.7 },
  rowBody: { flex: 1, gap: 2 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 12 },
});
