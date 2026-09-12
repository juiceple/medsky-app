import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useManagementViewer } from '@/hooks/use-management-viewer';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { registerForChatPushNotifications, type ChatPushData } from '@/lib/push-notifications';

export const unstable_settings = {
  anchor: '(tabs)',
};

const LightNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.primary,
    background: Colors.light.background,
    card: Colors.light.surface,
    text: Colors.light.text,
    border: Colors.light.border,
  },
};

const DarkNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.primary,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.border,
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();
  const router = useRouter();
  const viewerState = useManagementViewer();
  const isManager = viewerState.status === 'ready' && viewerState.viewer.role === 'manager';
  const isAdmin = viewerState.status === 'ready' && viewerState.viewer.isAdmin;

  // useManagementViewer 는 마운트 시 한 번만 조회한다. 이 컴포넌트는 로그인 전부터
  // 떠 있으므로, 세션이 생기는 시점(로그인 완료)에 다시 불러와야 실장 여부를 알 수 있다.
  useEffect(() => {
    if (session) {
      viewerState.reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (session) {
      registerForChatPushNotifications();
    }
  }, [session]);

  // 채팅 푸시 알림을 탭했을 때 그 대화방으로 이동한다. 컨설턴트/실장은 학생별
  // 채팅방(app/chat/[studentId])을, 학생은 자기 채팅 탭으로 연다.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Partial<ChatPushData>;
      if (data.type !== 'chat' || !data.studentId) return;

      if (data.recipientRole === 'student') {
        router.push({ pathname: '/chat' });
      } else {
        router.push({ pathname: '/chat/[studentId]', params: { studentId: data.studentId } });
      }
    });

    return () => subscription.remove();
  }, [router]);

  if (loading) {
    // Session is still being resolved from secure storage.
    return null;
  }

  const navTheme = colorScheme === 'dark' ? DarkNavTheme : LightNavTheme;

  return (
    <ThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: navTheme.colors.card },
          headerTintColor: navTheme.colors.primary,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="student/[id]" options={{ title: '' }} />
          <Stack.Screen name="chat/[studentId]" options={{ title: '' }} />
          <Stack.Screen name="session/[sessionId]" options={{ title: '', presentation: 'modal' }} />
        </Stack.Protected>
        {/* 실장 전용 화면 — 종합 생기부 관리의 운영 콘솔 중 컨설턴트 명부·학생 초대.
            세션이 있어도 실장이 아니면 접근할 수 없다(서버 API도 동일하게 막지만,
            여기서도 직접 진입을 막아 화면이 깨지지 않게 한다). */}
        <Stack.Protected guard={!!session && isManager}>
          <Stack.Screen name="admin/index" options={{ title: '실장 콘솔' }} />
          <Stack.Screen name="admin/consultants" options={{ title: '컨설턴트 관리' }} />
          <Stack.Screen name="admin/invitations" options={{ title: '학생 초대' }} />
        </Stack.Protected>
        {/* 어드민 전용 화면 — 정산·단가, 피드백·설문, 알림 관리. 실장이라도 어드민이
            아니면 admin/index 의 관리 메뉴에 노출되지 않고, 여기서도 직접 진입을
            막는다. 웹의 /admin/management(어드민) vs /manager/management(실장)
            분리와 같다. */}
        <Stack.Protected guard={!!session && isAdmin}>
          <Stack.Screen name="admin/settlements" options={{ title: '정산' }} />
          <Stack.Screen name="admin/feedback" options={{ title: '피드백 · 설문' }} />
          <Stack.Screen name="admin/notifications" options={{ title: '알림 관리' }} />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
