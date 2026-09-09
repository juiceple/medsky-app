import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerPushToken, unregisterPushToken } from '@/lib/management-api';

/**
 * 채팅 푸시 알림.
 *
 * 등록 자체는 medsky_homepage 의 /api/mobile/management/push-token 이 처리한다
 * (features/management/lib/push.ts 참고) — 이 파일은 기기에서 Expo 푸시 토큰을 얻어
 * 그 엔드포인트로 넘기는 것까지만 맡는다. 실기기가 아니거나 권한을 거부하면 채팅
 * 기능 자체는 폴링으로 계속 동작해야 하므로 조용히 넘어간다.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type ChatPushData = {
  type: 'chat';
  studentId: string;
  recipientRole: 'student' | 'consultant';
};

let registeredToken: string | null = null;

export async function registerForChatPushNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    if (!Device.isDevice) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token || token === registeredToken) return;

    await registerPushToken({ token, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
    registeredToken = token;
  } catch {
    // 알림 권한/토큰 발급 실패는 채팅 기능 자체를 막을 이유가 아니다.
  }
}

/** 로그아웃 시 부른다. 서버에서 이 기기의 토큰을 지워 로그아웃 후 알림이 오지 않게 한다. */
export async function unregisterChatPushNotifications(): Promise<void> {
  if (!registeredToken) return;

  const token = registeredToken;
  registeredToken = null;
  try {
    await unregisterPushToken(token);
  } catch {
    // 로그아웃 자체는 이 실패와 무관하게 계속 진행되어야 한다.
  }
}
