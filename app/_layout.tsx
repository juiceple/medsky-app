import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, loading } = useAuth();
  const router = useRouter();

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
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
