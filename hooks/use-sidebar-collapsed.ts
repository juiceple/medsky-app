import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'medsky:sidebar-collapsed';

// 탭 내비게이터(adaptive-tab-bar.tsx)와 그 밖의 스택 화면(detail-nav-shell.tsx)이
// 각자 자기 컴포넌트 트리를 가지고 있어 React state를 공유할 수 없다. 두 사이드바가
// 같은 접힘 상태를 보여주도록 모듈 스코프 캐시 + AsyncStorage로 동기화한다.
let cachedCollapsed: boolean | null = null;
const listeners = new Set<(collapsed: boolean) => void>();

function setCollapsedEverywhere(collapsed: boolean) {
  cachedCollapsed = collapsed;
  for (const listener of listeners) listener(collapsed);
  AsyncStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0').catch(() => {});
}

/** PC 사이드바(라벨 있는 넓은 사이드바)의 접힘 상태. 앱을 껐다 켜도 유지된다. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(cachedCollapsed ?? false);

  useEffect(() => {
    listeners.add(setCollapsed);
    if (cachedCollapsed === null) {
      AsyncStorage.getItem(STORAGE_KEY)
        .then((value) => {
          if (value != null) setCollapsedEverywhere(value === '1');
        })
        .catch(() => {});
    }
    return () => {
      listeners.delete(setCollapsed);
    };
  }, []);

  const toggle = useCallback(() => setCollapsedEverywhere(!(cachedCollapsed ?? false)), []);

  return { collapsed, toggle };
}
