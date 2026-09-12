import { supabase } from './supabase';

/**
 * medsky_homepage `/api/mobile/*` 공용 클라이언트.
 *
 * management/susi/jungsi 스키마 모두 PostgREST에 노출되지 않아 이 앱이 Supabase를
 * 직접 조회할 수 없다. 대신 medsky_homepage 가 자기 세션 쿠키 대신
 * Authorization: Bearer <supabase access_token> 를 받는 `/api/mobile/*` 를
 * 제공하므로, 매 요청에 로그인한 사용자의 access_token 을 실어 보낸다.
 * lib/management-api.ts · lib/susi-api.ts · lib/jungsi-api.ts 가 이 클라이언트를 쓴다.
 */

const BASE_URL = process.env.EXPO_PUBLIC_HOMEPAGE_API_URL;

export class MobileApiError extends Error {}

async function authHeader(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new MobileApiError('로그인이 필요합니다.');
  return `Bearer ${session.access_token}`;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL) {
    throw new MobileApiError(
      'EXPO_PUBLIC_HOMEPAGE_API_URL 이 설정되어 있지 않습니다. .env 를 확인해주세요.'
    );
  }

  const authorization = await authHeader();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new MobileApiError(body?.message ?? '요청에 실패했습니다.');
  }

  return body as T;
}

export function postJson<T>(path: string, input: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(input) });
}

export function deleteRequest<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}
