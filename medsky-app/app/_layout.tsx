import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { CustomerLinksProvider } from '@/lib/customer-links';
import { ViewerProvider } from '@/lib/viewer-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* 진행 링크는 로그인과 무관하므로 세션보다 바깥에 둔다. */}
      <CustomerLinksProvider>
        <ViewerProvider>
          <RootLayoutNav />
        </ViewerProvider>
      </CustomerLinksProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();

  if (loading) {
    // Session is still being resolved from secure storage.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="management/[studentId]" options={{ title: '학생 상세' }} />
          <Stack.Screen name="susi/application/[applicationId]" options={{ title: '진행 건' }} />
          <Stack.Screen name="susi/student/[studentId]" options={{ title: '학생 상세' }} />
          <Stack.Screen name="jungsi/[onboardingId]" options={{ title: '온보딩 상세' }} />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>

        {/*
          진행 링크 화면은 계정이 없는 고객(수시·정시 원서 컨설팅, 생기부 학부모)이
          쓰는 곳이다. 로그인 여부와 무관하게 열려야 하므로 Protected 밖에 둔다.
        */}
        <Stack.Screen name="progress/connect" options={{ title: '진행 링크 연결' }} />
        <Stack.Screen name="progress/susi" options={{ title: '수시 원서 컨설팅' }} />
        <Stack.Screen name="progress/jungsi" options={{ title: '정시 원서 컨설팅' }} />
        <Stack.Screen name="progress/management" options={{ title: '종합 생기부 관리' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
