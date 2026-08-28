import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useViewer } from '@/lib/viewer-context';

/**
 * 탭 구성은 서버가 정한다.
 *
 * `/api/mobile/me` 의 `sections` 에 없는 콘솔은 `href: null` 로 숨긴다. 라우트 자체는
 * 남겨 둔다 — 주소로 직접 들어가더라도 각 화면과 API 가 다시 권한을 확인하므로,
 * 탭을 숨기는 것은 보안이 아니라 "쓸 수 없는 메뉴를 보여주지 않는" 목적이다.
 *
 * 아직 `me` 를 못 받은 동안에는 콘솔 탭을 감춰 둔다. 잠깐 보였다가 사라지는 탭은
 * 권한이 회수된 것처럼 읽힌다.
 */
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { can } = useViewer();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="management"
        options={{
          title: '생기부',
          href: can('management') ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="folder.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="susi"
        options={{
          title: '수시',
          href: can('susi') ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="doc.text.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="jungsi"
        options={{
          title: '정시',
          href: can('jungsi') ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '마이페이지',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
