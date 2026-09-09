import { useEffect, useState } from 'react';

import { getChatInbox, getChatRooms } from '@/lib/management-api';
import type { ManagementViewer } from '@/lib/management-types';

const POLL_INTERVAL_MS = 20000;

/** 탭바 채팅 배지용 총 안읽음 수. 역할별로 안읽음 수 출처가 다르다(명부 vs 내 방들). */
export function useChatUnreadCount(viewer: ManagementViewer | null) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!viewer) return;
    let cancelled = false;

    async function load() {
      try {
        if (viewer!.role === 'consultant' || viewer!.role === 'manager') {
          const { entries } = await getChatInbox();
          if (!cancelled) setCount(entries.reduce((sum, entry) => sum + entry.unreadCount, 0));
        } else if (viewer!.role === 'student') {
          const rooms = await getChatRooms();
          const sessionsUnread = Object.values(rooms.sessions).reduce((sum, room) => sum + room.unreadCount, 0);
          if (!cancelled) setCount(rooms.always.unreadCount + sessionsUnread);
        } else if (!cancelled) {
          setCount(0);
        }
      } catch {
        // 배지는 부가 정보라 실패해도 조용히 무시한다.
      }
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [viewer]);

  return count;
}
