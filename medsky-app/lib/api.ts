import { supabase } from '@/lib/supabase';

/**
 * medsky_homepage 의 /api/mobile/** 를 부르는 클라이언트.
 *
 * 이 앱은 Supabase 를 직접 읽지 않는다. 종합 생기부 관리 · 수시 원서 컨설팅 ·
 * 정시 원서 컨설팅이 쓰는 management / susi / jungsi 스키마는 anon 키에 권한이
 * 없기 때문이다(서비스 롤 키는 서버에만 있다). 그래서 모든 조회는 홈페이지가
 * 권한을 확인하고 내려주는 이 API 를 거친다.
 *
 * 화면은 응답을 그대로 그린다. 진행률 · SLA · 환불 비율 같은 판정은 서버가 이미
 * 계산해 보내므로 여기서 다시 계산하지 않는다 — 규정이 앱과 웹으로 갈라지면
 * 앱을 새로 배포하기 전까지 두 값이 계속 어긋난다.
 */

const DEFAULT_BASE_URL = 'https://medsky.co.kr';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL
).replace(/\/$/, '');

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }

  /** 권한이 없어 막힌 것인지. 화면은 이때 "재시도" 대신 안내를 보여준다. */
  get isForbidden(): boolean {
    return this.status === 401 || this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

type ApiEnvelope<T> = { data?: T; error?: string };

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    // 네트워크가 끊겼거나 주소가 틀렸다. 어느 쪽이든 사용자가 할 일은 같다.
    throw new ApiError('서버에 연결하지 못했습니다. 네트워크를 확인해주세요.', 0);
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    body = null;
  }

  if (!response.ok || !body || body.data === undefined) {
    throw new ApiError(
      body?.error ?? '데이터를 불러오지 못했습니다.',
      response.ok ? 500 : response.status
    );
  }

  return body.data;
}

/**
 * 로그인이 필요한 조회.
 *
 * 액세스 토큰은 매번 세션에서 꺼낸다. 보관해 두면 자동 갱신된 뒤에도 옛 토큰을
 * 계속 보내게 되고, 그러면 앱을 다시 켜기 전까지 전부 401 이 된다.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new ApiError('로그인이 필요합니다.', 401);
  }

  return request<T>(path, {
    headers: { Authorization: `Bearer ${session.access_token}`, Accept: 'application/json' },
  });
}

/**
 * 토큰 링크로 여는 조회(수시·정시 고객, 생기부 학부모).
 *
 * 이 고객들은 계정을 만들지 않는다. 알림톡으로 받은 링크의 토큰 자체가 자격증명이라
 * 로그인 헤더를 붙이지 않는다.
 */
export async function apiGetPublic<T>(path: string): Promise<T> {
  return request<T>(path, { headers: { Accept: 'application/json' } });
}
