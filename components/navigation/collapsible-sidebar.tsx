import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Radius, Spacing } from '@/constants/theme';
import { useSidebarCollapsed } from '@/hooks/use-sidebar-collapsed';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/lib/auth-context';

export const SIDEBAR_WIDTH = 236;
export const SIDEBAR_COLLAPSED_WIDTH = 76;

export type SidebarNavItem = {
  key: string;
  label: string;
  focused: boolean;
  badge?: string | number;
  renderIcon: (focused: boolean, color: string, size: number) => ReactNode;
  onPress: () => void;
};

/**
 * PC 폭(desktop breakpoint)에서 쓰는 라벨 사이드바. 탭 내비게이터
 * (adaptive-tab-bar.tsx)와 그 밖의 스택 화면(detail-nav-shell.tsx) 양쪽에서
 * 쓰므로, 각자 다른 형태의 route/item 데이터를 `SidebarNavItem`으로 맞춰서
 * 넘긴다. 접힘 상태는 useSidebarCollapsed로 두 곳이 항상 같이 움직인다.
 */
export function CollapsibleSidebar({ items }: { items: SidebarNavItem[] }) {
  const { collapsed, toggle } = useSidebarCollapsed();
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuth();
  const surface = useThemeColor({}, 'surface');
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');
  const primaryMuted = useThemeColor({}, 'primaryMuted');
  const inactive = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const danger = useThemeColor({}, 'danger');

  return (
    <View
      style={[
        styles.sidebar,
        { width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH },
        { backgroundColor: surface, borderRightColor: border, paddingTop: Spacing.xxl + insets.top },
      ]}>
      <View style={[styles.sidebarBrand, collapsed && styles.sidebarBrandCollapsed]}>
        <View style={styles.sidebarBrandLeft}>
          <View style={[styles.sidebarLogo, { backgroundColor: primary }]}>
            <ThemedText style={styles.sidebarLogoText}>M</ThemedText>
          </View>
          {!collapsed ? <ThemedText style={styles.sidebarBrandText}>메드스카이</ThemedText> : null}
        </View>
        <Pressable
          onPress={toggle}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          style={styles.collapseToggle}>
          <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-back'} size={16} color={inactive} />
        </Pressable>
      </View>

      <View style={styles.sidebarNav}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            style={[
              styles.sidebarItem,
              collapsed && styles.sidebarItemCollapsed,
              item.focused && { backgroundColor: primaryMuted },
            ]}>
            {item.renderIcon(item.focused, item.focused ? primary : inactive, 20)}
            {!collapsed ? (
              <ThemedText
                style={[styles.sidebarItemLabel, { color: item.focused ? primary : inactive }]}
                numberOfLines={1}>
                {item.label}
              </ThemedText>
            ) : null}
            {item.badge != null ? <Badge value={item.badge} color={danger} inline={!collapsed} /> : null}
          </Pressable>
        ))}
      </View>

      <View style={styles.sidebarSpacer} />

      <View
        style={[
          styles.sidebarFooter,
          collapsed && styles.sidebarFooterCollapsed,
          { backgroundColor: background },
        ]}>
        <Avatar name={profile?.name ?? user?.email ?? '?'} size={collapsed ? 32 : 36} />
        {!collapsed ? (
          <View style={styles.sidebarFooterText}>
            <ThemedText style={styles.sidebarFooterName} numberOfLines={1}>
              {profile?.name ?? '이름 미등록'}
            </ThemedText>
            <ThemedText style={[styles.sidebarFooterEmail, { color: textTertiary }]} numberOfLines={1}>
              {user?.email ?? ''}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Badge({ value, color, inline }: { value: string | number; color: string; inline?: boolean }) {
  return (
    <View style={[inline ? styles.badgeInline : styles.badgeFloating, { backgroundColor: color }]}>
      <ThemedText style={styles.badgeText}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'column',
  },
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  sidebarBrandCollapsed: { flexDirection: 'column', gap: Spacing.sm, paddingHorizontal: 0 },
  sidebarBrandLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sidebarLogo: { width: 34, height: 34, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  sidebarLogoText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  sidebarBrandText: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  sidebarNav: { gap: 4 },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    height: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  sidebarItemCollapsed: { paddingHorizontal: 0, justifyContent: 'center' },
  sidebarItemLabel: { flex: 1, fontSize: 14.5, fontWeight: '600' },
  sidebarSpacer: { flex: 1 },
  collapseToggle: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },
  sidebarFooterCollapsed: { paddingHorizontal: 0, justifyContent: 'center' },
  sidebarFooterText: { flex: 1, minWidth: 0 },
  sidebarFooterName: { fontSize: 13.5, fontWeight: '700' },
  sidebarFooterEmail: { fontSize: 11.5 },

  badgeFloating: {
    position: 'absolute',
    top: -4,
    left: 16,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeInline: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
