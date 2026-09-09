import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React from 'react';

import { AdaptiveTabBar } from '@/components/navigation/adaptive-tab-bar';
import { useChatUnreadCount } from '@/hooks/use-chat-unread-count';
import { useManagementViewer } from '@/hooks/use-management-viewer';

export const unstable_settings = {
  initialRouteName: 'chat',
};

export default function TabLayout() {
  const viewerState = useManagementViewer();
  const viewer = viewerState.status === 'ready' ? viewerState.viewer : null;
  const unreadCount = useChatUnreadCount(viewer);

  return (
    <Tabs
      // 모바일은 하단 탭바, 태블릿은 아이콘 레일, PC는 라벨 사이드바 — 화면 폭에
      // 따라 AdaptiveTabBar가 알아서 고른다 (hooks/use-breakpoint.ts).
      tabBar={(props) => <AdaptiveTabBar {...props} />}
      screenOptions={{
        headerShown: false,
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
