import { Link } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IDLE_API_STATE, type ApiState } from '@/lib/use-api';

/**
 * 콘솔 화면(생기부 · 수시 · 정시)이 공유하는 조각들.
 *
 * 세 서비스는 데이터가 다르지만 화면이 하는 일은 같다 — 목록을 보여주고, 하나를
 * 열고, 상태 배지를 붙인다. 서비스마다 카드와 배지를 따로 만들면 색과 여백이 조금씩
 * 어긋나 결국 다른 앱처럼 보인다.
 */

export type Tone = 'slate' | 'rose' | 'amber' | 'emerald' | 'blue';

const TONE_COLORS: Record<Tone, { background: string; text: string }> = {
  slate: { background: 'rgba(100,116,139,0.14)', text: '#475569' },
  rose: { background: 'rgba(225,29,72,0.14)', text: '#be123c' },
  amber: { background: 'rgba(217,119,6,0.16)', text: '#b45309' },
  emerald: { background: 'rgba(5,150,105,0.14)', text: '#047857' },
  blue: { background: 'rgba(10,126,164,0.14)', text: '#0a7ea4' },
};

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: Tone }) {
  const colors = TONE_COLORS[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      <ThemedText style={[styles.badgeText, { color: colors.text }]}>{children}</ThemedText>
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

/** 눌러서 상세로 넘어가는 카드. */
export function CardLink({
  href,
  children,
}: {
  href: ComponentProps<typeof Link>['href'];
  children: ReactNode;
}) {
  return (
    <Link href={href} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
        {children}
      </Pressable>
    </Link>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <ThemedText type="subtitle">{children}</ThemedText>
      {hint ? <ThemedText style={styles.muted}>{hint}</ThemedText> : null}
    </View>
  );
}

/** 라벨 + 값 한 줄. 값이 없으면 아무것도 그리지 않는다. */
export function Field({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;

  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <ThemedText style={styles.fieldValue}>{value}</ThemedText>
    </View>
  );
}

/** 숫자 지표 한 칸. 대시보드에서 격자로 깔린다. */
export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <View style={styles.stat}>
      <ThemedText style={[styles.statValue, tone ? { color: TONE_COLORS[tone].text } : null]}>
        {value}
      </ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <View style={styles.statGrid}>{children}</View>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.empty}>
      <ThemedText style={styles.muted}>{message}</ThemedText>
    </View>
  );
}

/**
 * 조회 상태를 화면으로 바꾼다.
 *
 * 권한이 없어 막힌 것(401/403)은 재시도 버튼을 주지 않는다. 다시 눌러도 결과가
 * 같은데 버튼이 있으면 사용자는 앱이 고장 난 것으로 읽는다.
 */
export function ApiStateView<T>({
  state,
  children,
  emptyMessage,
  isEmpty,
}: {
  state: ApiState<T>;
  children: (data: T) => ReactNode;
  emptyMessage?: string;
  isEmpty?: (data: T) => boolean;
}) {
  if (state.loading && !state.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (state.error && !state.data) {
    return (
      <View style={styles.center}>
        <ThemedText style={styles.errorText}>{state.error.message}</ThemedText>
        {state.error.isForbidden ? null : (
          <Pressable
            onPress={state.reload}
            style={({ pressed }) => [styles.retry, pressed && styles.cardPressed]}>
            <ThemedText style={styles.retryText}>다시 시도</ThemedText>
          </Pressable>
        )}
      </View>
    );
  }

  if (!state.data) return null;
  if (isEmpty?.(state.data) && emptyMessage) return <EmptyState message={emptyMessage} />;

  return <>{children(state.data)}</>;
}

/** 당겨서 새로고침이 붙은 스크롤 화면. */
export function ConsoleScroll<T>({
  state,
  children,
}: {
  state: ApiState<T>;
  children: ReactNode;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refresh} />}>
      {children}
    </ScrollView>
  );
}

/**
 * 진행 링크가 아직 연결되지 않은 고객 화면.
 *
 * 세 상품이 모두 같은 상황을 만나므로 화면마다 따로 쓰지 않는다.
 */
export function NoLinkNotice() {
  return (
    <ConsoleScroll state={IDLE_API_STATE}>
      <Card>
        <ThemedText style={styles.cardTitle}>연결된 링크가 없습니다</ThemedText>
        <ThemedText style={styles.muted}>
          알림톡으로 받은 진행 링크를 먼저 연결해 주세요.
        </ThemedText>
        <Link href="/progress/connect" asChild>
          <Pressable style={({ pressed }) => pressed && styles.cardPressed}>
            <ThemedText type="link">링크 연결하기</ThemedText>
          </Pressable>
        </Link>
      </Card>
    </ConsoleScroll>
  );
}

export const styles = StyleSheet.create({
  screen: {
    padding: 20,
    paddingBottom: 48,
    gap: 14,
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.25)',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  cardPressed: {
    opacity: 0.6,
  },
  /** 카드 묶음. ConsoleScroll 이 이미 바깥 여백을 주므로 간격만 준다. */
  stack: {
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  sectionTitle: {
    marginTop: 10,
    gap: 2,
  },
  field: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldLabel: {
    fontSize: 13,
    opacity: 0.5,
    width: 92,
    lineHeight: 20,
  },
  fieldValue: {
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.25)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 100,
    flexGrow: 1,
    flexBasis: '30%',
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.55,
  },
  muted: {
    fontSize: 13,
    opacity: 0.55,
    lineHeight: 19,
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
  },
  center: {
    padding: 40,
    alignItems: 'center',
    gap: 14,
  },
  empty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  retry: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.4)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
