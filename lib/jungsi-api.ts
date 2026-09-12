import { postJson, request } from './mobile-api-client';
import type { JungsiOnboardingStatus, JungsiOnboardingWithFiles } from './jungsi-types';

/**
 * medsky_homepage 의 정시 원서 컨설팅 데이터를 쓰는 클라이언트.
 * lib/management-api.ts 와 같은 방식으로 `/api/mobile/jungsi/*` 를 부른다.
 */

export function getJungsiOnboardings(): Promise<{ onboardings: JungsiOnboardingWithFiles[] }> {
  return request('/api/mobile/jungsi/onboardings');
}

export function getJungsiOnboarding(onboardingId: string): Promise<JungsiOnboardingWithFiles> {
  return request(`/api/mobile/jungsi/onboardings/${onboardingId}`);
}

export function updateJungsiProgress(input: {
  onboardingId: string;
  status: JungsiOnboardingStatus;
}): Promise<{ ok: true; message: string }> {
  return postJson(`/api/mobile/jungsi/onboardings/${input.onboardingId}/progress`, {
    status: input.status,
  });
}

export function markJungsiReportSent(input: {
  onboardingId: string;
  reportUrl: string;
}): Promise<{ ok: true; message: string }> {
  return postJson(`/api/mobile/jungsi/onboardings/${input.onboardingId}/report`, {
    report_url: input.reportUrl,
  });
}

export function consumeJungsiFeedback(
  onboardingId: string
): Promise<{ ok: true; message: string }> {
  return postJson(`/api/mobile/jungsi/onboardings/${onboardingId}/feedback`, {});
}
