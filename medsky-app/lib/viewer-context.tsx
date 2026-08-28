import { createContext, useContext, type ReactNode } from 'react';

import type { MobileMe, MobileSection } from '@/lib/api-types';
import { useAuth } from '@/lib/auth-context';
import { useApi, type ApiState } from '@/lib/use-api';

/**
 * 이 앱이 무엇을 보여줄지 정하는 단 하나의 근거.
 *
 * 역할과 담당 서비스는 앱이 판단하지 않는다. `/api/mobile/me` 가 내려주는
 * `sections` 가 곧 탭 구성이다. 판단을 앱에 두면 권한 규칙을 고칠 때마다 앱을 새로
 * 배포해야 하고, 두 판단이 갈리는 순간 "탭은 보이는데 열면 403" 이 된다.
 *
 * 여러 화면이 각자 부르면 탭을 옮길 때마다 같은 조회가 반복되므로 한 번만 부르고
 * 공유한다.
 */

type ViewerContextValue = ApiState<MobileMe> & {
  can: (section: MobileSection) => boolean;
};

const ViewerContext = createContext<ViewerContextValue | undefined>(undefined);

export function ViewerProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  // 로그아웃 상태에서는 부르지 않는다. 토큰 링크로 여는 화면은 로그인과 무관하다.
  const state = useApi<MobileMe>(session ? '/api/mobile/me' : null);

  const value: ViewerContextValue = {
    ...state,
    can: (section) => state.data?.sections.includes(section) ?? false,
  };

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewer(): ViewerContextValue {
  const context = useContext(ViewerContext);
  if (!context) {
    throw new Error('useViewer must be used within a ViewerProvider');
  }
  return context;
}
