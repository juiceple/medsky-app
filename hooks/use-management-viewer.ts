import { useCallback, useEffect, useState } from 'react';

import { getViewer } from '@/lib/management-api';
import type { ManagementViewer } from '@/lib/management-types';

type ViewerState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; viewer: ManagementViewer };

/**
 * 로그인한 계정이 종합 생기부 관리에서 어떤 역할(학생/컨설턴트/실장/해당없음)인지.
 * 홈 탭과 채팅 탭이 똑같이 이 판정으로 화면을 가르므로 훅으로 뺐다.
 */
export function useManagementViewer() {
  const [state, setState] = useState<ViewerState>({ status: 'loading' });

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    getViewer()
      .then((viewer) => setState({ status: 'ready', viewer }))
      .catch((error) =>
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        })
      );
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}
