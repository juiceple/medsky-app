import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React from 'react';

import { AdaptiveTabBar } from '@/components/navigation/adaptive-tab-bar';
import { useChatUnreadCount } from '@/hooks/use-chat-unread-count';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useManagementViewer } from '@/hooks/use-management-viewer';

export const unstable_settings = {
  initialRouteName: 'chat',
};

export default function TabLayout() {
  const viewerState = useManagementViewer();
  const viewer = viewerState.status === 'ready' ? viewerState.viewer : null;
  const unreadCount = useChatUnreadCount(viewer);
  const breakpoint = useBreakpoint();

  return (
    <Tabs
      // 모바일은 하단 탭바, 태블릿은 아이콘 레일, PC는 라벨 사이드바 — 화면 폭에
      // 따라 AdaptiveTabBar가 알아서 고른다 (hooks/use-breakpoint.ts).
      //
      // `tabBarPosition`을 안 주면 커스텀 tabBar가 사이드바 모양으로 그려져도
      // 네비게이터가 내용물을 세로(column)로 쌓아서 화면 "아래쪽"에 붙는다 —
      // 태블릿/PC에서 사이드바가 왼쪽이 아니라 하단에 이상하게 보이던 원인.
      // 'left'를 주면 네비게이터가 컨테이너를 row로 바꾸고 탭바를 내용물 앞(왼쪽)에 둔다.
      tabBar={(props) => <AdaptiveTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: breakpoint === 'mobile' ? 'bottom' : 'left',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: '채팅',
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '마이페이지',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
