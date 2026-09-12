import { postJson, request } from './mobile-api-client';
import type {
  SusiApplicationDetail,
  SusiApplicationSummary,
  SusiStudent,
} from './susi-types';

/**
 * medsky_homepage 의 수시 원서 컨설팅 데이터를 쓰는 클라이언트.
 * lib/management-api.ts 와 같은 방식으로 `/api/mobile/susi/*` 를 부른다.
 */

export function getSusiStudents(): Promise<{ students: SusiStudent[] }> {
  return request('/api/mobile/susi/students');
}

export function getSusiStudent(studentId: string): Promise<SusiStudent> {
  return request(`/api/mobile/susi/students/${studentId}`);
}

export function getSusiApplications(): Promise<{ applications: SusiApplicationSummary[] }> {
  return request('/api/mobile/susi/applications');
}

export function getSusiApplication(applicationId: string): Promise<SusiApplicationDetail> {
  return request(`/api/mobile/susi/applications/${applicationId}`);
}

export function verifySusiSubmissionItem(input: {
  applicationId: string;
  itemKey: string;
}): Promise<{ ok: true; message: string }> {
  return postJson(`/api/mobile/susi/applications/${input.applicationId}/verify`, {
    item_key: input.itemKey,
  });
}

export function saveSusiApplicationMemo(input: {
  applicationId: string;
  internalMemo: string;
}): Promise<{ ok: true; message: string }> {
  return postJson(`/api/mobile/susi/applications/${input.applicationId}/memo`, {
    internal_memo: input.internalMemo,
  });
}

export function requestSusiLessonScheduleChange(input: {
  applicationId: string;
  lessonDate: string;
  lessonTime: string;
  note?: string;
}): Promise<{ ok: true; message: string }> {
  return postJson(
    `/api/mobile/susi/applications/${input.applicationId}/lesson-schedule-request`,
    { lesson_date: input.lessonDate, lesson_time: input.lessonTime, note: input.note ?? null }
  );
}
