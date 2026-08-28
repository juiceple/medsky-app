import { useCallback, useEffect, useState } from 'react';

import { ApiError, apiGet, apiGetPublic } from '@/lib/api';

/**
 * 조회 화면이 공통으로 쓰는 상태.
 *
 * 화면마다 loading / error / refreshing 을 따로 들고 있으면 "당겨서 새로고침 중에는
 * 전체 로딩을 띄우지 않는다" 같은 규칙이 화면마다 달라진다. 한 곳에 모아둔다.
 */
export type ApiState<T> = {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  refreshing: boolean;
  reload: () => void;
  refresh: () => void;
};

function useApiState<T>(
  load: (() => Promise<T>) | null,
  deps: unknown[]
): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(load !== null);
  const [refreshing, setRefreshing] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!load) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    // 응답이 늦게 도착한 이전 조회가 새 화면의 결과를 덮어쓰지 않게 한다.
    let active = true;

    load()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err : new ApiError('데이터를 불러오지 못했습니다.', 500)
        );
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => {
    setLoading(true);
    setNonce((value) => value + 1);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setNonce((value) => value + 1);
  }, []);

  return { data, error, loading, refreshing, reload, refresh };
}

/**
 * 조회가 없는 화면이 쓰는 빈 상태.
 *
 * 목록·상세와 같은 껍데기(`ConsoleScroll`)를 쓰되 부를 것이 없는 화면 — 링크 연결
 * 화면이나 "연결된 링크가 없습니다" 안내 — 이 넘긴다.
 */
export const IDLE_API_STATE: ApiState<null> = {
  data: null,
  error: null,
  loading: false,
  refreshing: false,
  reload: () => {},
  refresh: () => {},
};

/** 로그인 상태로 여는 조회. `path` 가 null 이면 아무것도 부르지 않는다. */
export function useApi<T>(path: string | null): ApiState<T> {
  return useApiState<T>(path ? () => apiGet<T>(path) : null, [path]);
}

/** 토큰 링크로 여는 조회(수시·정시 고객, 생기부 학부모). */
export function usePublicApi<T>(path: string | null): ApiState<T> {
  return useApiState<T>(path ? () => apiGetPublic<T>(path) : null, [path]);
}
