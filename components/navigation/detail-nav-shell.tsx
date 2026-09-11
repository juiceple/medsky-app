import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Radius, Spacing } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useChatUnreadCount } from '@/hooks/use-chat-unread-count';
import { useManagementViewer } from '@/hooks/use-management-viewer';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/lib/auth-context';

const RAIL_WIDTH = 88;
const SIDEBAR_WIDTH = 236;

type DetailNavActive = 'home' | 'chat' | 'profile';

/**
 * 탭 내비게이터(components/navigation/adaptive-tab-bar.tsx) 밖에 있는 스택 화면
 * (학생 상세 등)에서도 태블릿 아이콘 레일 / PC 사이드바를 유지하기 위한 셸.
 * BottomTabBarProps를 못 받으므로 route 목록을 직접 들고 있다 — 탭 3개
 * (홈/채팅/마이페이지) 구성이 바뀌면 adaptive-tab-bar.tsx와 같이 고쳐야 한다.
 */
export function DetailNavShell({ active, children }: { active: DetailNavActive; children: ReactNode }) {
  const breakpoint = useBreakpoint();
  const background = useThemeColor({}, 'background');

  if (breakpoint === 'mobile') return <>{children}</>;

  return (
    <View style={[styles.row, { backgroundColor: background }]}>
      {breakpoint === 'desktop' ? <Sidebar active={active} /> : <Rail active={active} />}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

function useNavItems(active: DetailNavActive) {
  const router = useRouter();
  const viewerState = useManagementViewer();
  const viewer = viewerState.status === 'ready' ? viewerState.viewer : null;
  const unreadCount = useChatUnreadCount(viewer);

  return [
    {
      key: 'home' as const,
      label: '홈',
      focused: active === 'home',
      badge: undefined as string | number | undefined,
      icon: active === 'home' ? ('home' as const) : ('home-outline' as const),
      onPress: () => router.push('/'),
    },
    {
      key: 'chat' as const,
      label: '채팅',
      focused: active === 'chat',
      badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
      icon: active === 'chat' ? ('chatbubbles' as const) : ('chatbubbles-outline' as const),
      onPress: () => router.push('/chat'),
    },
    {
      key: 'profile' as const,
      label: '마이페이지',
      focused: active === 'profile',
      badge: undefined as string | number | undefined,
      icon: active === 'profile' ? ('person' as const) : ('person-outline' as const),
      onPress: () => router.push('/profile'),
    },
  ];
}

function Rail({ active }: { active: DetailNavActive }) {
  const items = useNavItems(active);
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
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={item.onPress}
          style={[styles.railItem, item.focused && { backgroundColor: primaryMuted }]}>
          <View style={styles.railIconWrap}>
            <Ionicons name={item.icon} size={23} color={item.focused ? primary : inactive} />
            {item.badge != null ? <Badge value={item.badge} color={danger} /> : null}
          </View>
          <ThemedText style={[styles.railLabel, { color: item.focused ? primary : inactive }]}>
            {item.label.slice(0, 2)}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

function Sidebar({ active }: { active: DetailNavActive }) {
  const items = useNavItems(active);
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
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            style={[styles.sidebarItem, item.focused && { backgroundColor: primaryMuted }]}>
            <Ionicons name={item.icon} size={20} color={item.focused ? primary : inactive} />
            <ThemedText style={[styles.sidebarItemLabel, { color: item.focused ? primary : inactive }]}>
              {item.label}
            </ThemedText>
            {item.badge != null ? <Badge value={item.badge} color={danger} inline /> : null}
          </Pressable>
        ))}
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
  row: { flex: 1, flexDirection: 'row' },
  content: { flex: 1, minWidth: 0 },

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
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
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
