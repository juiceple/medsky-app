import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { JungsiRosterScreen } from '@/components/jungsi/jungsi-roster-screen';
import { StudentRosterScreen } from '@/components/management/student-roster-screen';
import { SusiRosterScreen } from '@/components/susi/susi-roster-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { ConsultantService, ManagementViewer } from '@/lib/management-types';

const PRODUCTS: ConsultantService[] = ['종합 생기부 관리', '수시 원서 컨설팅', '정시 원서 컨설팅'];

/** 담당 서비스와 무관하게 실장은 전부 본다 — services 는 컨설턴트에게만 의미 있다. */
function availableProducts(viewer: ManagementViewer): ConsultantService[] {
  if (viewer.role === 'manager') return PRODUCTS;
  return PRODUCTS.filter((product) => viewer.services.includes(product));
}

/**
 * 컨설턴트/실장 홈 — 담당 서비스가 하나면 그 명부를 바로 보여주고, 여럿이면 위에
 * 전환 탭을 둔다. 웹의 컨설턴트 워크스페이스 내비게이션(CONSULTANT_WORKSPACE_SECTIONS)
 * 과 같은 서비스 3종을 다룬다.
 */
export function WorkspaceHomeScreen({ viewer }: { viewer: ManagementViewer }) {
  const products = availableProducts(viewer);
  const [selected, setSelected] = useState<ConsultantService | null>(products[0] ?? null);
  const isManager = viewer.role === 'manager';

  if (products.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>
          담당하는 서비스가 없어요. 실장에게 문의해주세요.
        </ThemedText>
      </ThemedView>
    );
  }

  const current = selected && products.includes(selected) ? selected : products[0];

  return (
    <ThemedView style={styles.container}>
      {products.length > 1 ? (
        <ProductSwitcher products={products} current={current} onSelect={setSelected} />
      ) : null}

      {current === '종합 생기부 관리' ? <StudentRosterScreen isManager={isManager} /> : null}
      {current === '수시 원서 컨설팅' ? <SusiRosterScreen /> : null}
      {current === '정시 원서 컨설팅' ? <JungsiRosterScreen /> : null}
    </ThemedView>
  );
}

function ProductSwitcher({
  products,
  current,
  onSelect,
}: {
  products: ConsultantService[];
  current: ConsultantService;
  onSelect: (product: ConsultantService) => void;
}) {
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.switcherScroll}
      contentContainerStyle={[styles.switcher, { backgroundColor: surfaceSecondary }]}>
      {products.map((product) => {
        const active = product === current;
        return (
          <Pressable
            key={product}
            onPress={() => onSelect(product)}
            style={[styles.switcherItem, active && { backgroundColor: surface }]}>
            <ThemedText
              style={[styles.switcherLabel, { color: active ? text : textSecondary }, active && styles.switcherLabelActive]}>
              {product}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  emptyText: { textAlign: 'center', opacity: 0.7, fontSize: 14 },
  // react-native-web 은 ScrollView 에 기본 flexGrow: 1 을 준다 — 명시하지 않으면
  // 이 가로 스크롤 탭이 아래 명부 화면과 세로 공간을 나눠 가지면서 화면 절반을 차지한다.
  switcherScroll: { flexGrow: 0, flexShrink: 0 },
  switcher: {
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.xs,
    margin: Spacing.lg,
    marginBottom: 0,
    borderRadius: Radius.md,
  },
  switcherItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  switcherLabel: { fontSize: 13, fontWeight: '600' },
  switcherLabelActive: { fontWeight: '700' },
});
