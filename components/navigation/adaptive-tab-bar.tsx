import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Radius, Spacing } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/lib/auth-context';

const TAB_BAR_CONTENT_HEIGHT = 52;
const TAB_BAR_TOP_PADDING = 8;
const MIN_BOTTOM_PADDING = 8;

const RAIL_WIDTH = 88;
const SIDEBAR_WIDTH = 236;

/**
 * 화면 폭에 따라 하단 탭바(모바일) / 아이콘 레일(태블릿) / 라벨 사이드바(PC)로
 * 바뀌는 내비게이션 셸. `Tabs`의 `tabBar` prop으로 꽂는다 — 라우트 구조는 그대로
 * 두고 크롬(chrome)만 화면 크기에 맞춰 바꾼다.
 */
export function AdaptiveTabBar(props: BottomTabBarProps) {
  const breakpoint = useBreakpoint();

  if (breakpoint === 'desktop') return <Sidebar {...props} />;
  if (breakpoint === 'tablet') return <IconRail {...props} />;
  return <BottomBar {...props} />;
}

function useRouteItems({ state, descriptors }: BottomTabBarProps) {
  return state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const focused = state.index === index;
    const badge = options.tabBarBadge;
    return { route, options, focused, badge, index };
  });
}

function BottomBar(props: BottomTabBarProps) {
  const { navigation } = props;
  const items = useRouteItems(props);
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, MIN_BOTTOM_PADDING);
  const background = useThemeColor({}, 'tabBarBackground');
  const border = useThemeColor({}, 'tabBarBorder');
  const active = useThemeColor({}, 'tabIconSelected');
  const inactive = useThemeColor({}, 'tabIconDefault');
  const danger = useThemeColor({}, 'danger');

  return (
    <View
      style={[
        styles.bottomBar,
        {
          backgroundColor: background,
          borderTopColor: border,
          height: TAB_BAR_TOP_PADDING + TAB_BAR_CONTENT_HEIGHT + bottomPadding,
          paddingTop: TAB_BAR_TOP_PADDING,
          paddingBottom: bottomPadding,
        },
      ]}>
      {items.map(({ route, options, focused, badge }) => {
        const color = focused ? active : inactive;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <HapticTab
            key={route.key}
            onPress={onPress}
            style={styles.bottomBarItem}
            accessibilityRole="button"
            accessibilityLabel={String(options.title ?? route.name)}>
            <View style={styles.bottomBarIconWrap}>
              {options.tabBarIcon?.({ focused, color, size: 24 })}
              {badge != null ? <Badge value={badge} color={danger} /> : null}
            </View>
          </HapticTab>
        );
      })}
    </View>
  );
}

function IconRail(props: BottomTabBarProps) {
  const { navigation } = props;
  const items = useRouteItems(props);
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');
  const primaryMuted = useThemeColor({}, 'primaryMuted');
  const inactive = useThemeColor({}, 'textSecondary');
  const danger = useThemeColor({}, 'danger');

  return (
    <View
      style={[
        styles.rail,
        { backgroundColor: surface, borderRightColor: border, paddingTop: Spacing.xxl + insets.top },
      ]}>
      <View style={[styles.railLogo, { backgroundColor: primary }]}>
        <ThemedText style={styles.railLogoText}>M</ThemedText>
      </View>
      {items.map(({ route, options, focused, badge }) => {
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={[styles.railItem, focused && { backgroundColor: primaryMuted }]}>
            <View style={styles.railIconWrap}>
              {options.tabBarIcon?.({ focused, color: focused ? primary : inactive, size: 23 })}
              {badge != null ? <Badge value={badge} color={danger} /> : null}
            </View>
            <ThemedText style={[styles.railLabel, { color: focused ? primary : inactive }]}>
              {String(options.title ?? route.name).slice(0, 2)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function Sidebar(props: BottomTabBarProps) {
  const { navigation } = props;
  const items = useRouteItems(props);
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
        { backgroundColor: surface, borderRightColor: border, paddingTop: Spacing.xxl + insets.top },
      ]}>
      <View style={styles.sidebarBrand}>
        <View style={[styles.sidebarLogo, { backgroundColor: primary }]}>
          <ThemedText style={styles.sidebarLogoText}>M</ThemedText>
        </View>
        <ThemedText style={styles.sidebarBrandText}>메드스카이</ThemedText>
      </View>

      <View style={styles.sidebarNav}>
        {items.map(({ route, options, focused, badge }) => {
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[styles.sidebarItem, focused && { backgroundColor: primaryMuted }]}>
              {options.tabBarIcon?.({ focused, color: focused ? primary : inactive, size: 20 })}
              <ThemedText style={[styles.sidebarItemLabel, { color: focused ? primary : inactive }]}>
                {String(options.title ?? route.name)}
              </ThemedText>
              {badge != null ? <Badge value={badge} color={danger} inline /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sidebarSpacer} />

      <View style={[styles.sidebarFooter, { backgroundColor: background }]}>
        <Avatar name={profile?.name ?? user?.email ?? '?'} size={36} />
        <View style={styles.sidebarFooterText}>
          <ThemedText style={styles.sidebarFooterName} numberOfLines={1}>
            {profile?.name ?? '이름 미등록'}
          </ThemedText>
          <ThemedText style={[styles.sidebarFooterEmail, { color: textTertiary }]} numberOfLines={1}>
            {user?.email ?? ''}
          </ThemedText>
        </View>
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
  bottomBar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  bottomBarItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottomBarIconWrap: { position: 'relative' },

  rail: {
    width: RAIL_WIDTH,
    borderRightWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  railLogo: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  railLogoText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  railItem: {
    width: 64,
    paddingVertical: 11,
    borderRadius: Radius.lg,
    alignItems: 'center',
    gap: 4,
  },
  railIconWrap: { position: 'relative' },
  railLabel: { fontSize: 11, fontWeight: '600' },

  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'column',
  },
  sidebarBrand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.sm, marginBottom: Spacing.xxl },
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
  sidebarItemLabel: { flex: 1, fontSize: 14.5, fontWeight: '600' },
  sidebarSpacer: { flex: 1 },
  sidebarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },
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
