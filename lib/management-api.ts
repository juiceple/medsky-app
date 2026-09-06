import { supabase } from './supabase';
import type {
  ChatInboxEntry,
  ChatMessageView,
  ChatRoom,
  ChatRoomsSummary,
  ManagementViewer,
  RecordSubmissionView,
  StudentDetail,
  StudentPortalData,
  StudentSummary,
  UploadTicket,
} from './management-types';

/**
 * medsky_homepage 의 종합 생기부 관리 데이터를 쓰는 클라이언트.
 *
 * management 스키마는 PostgREST에 노출되지 않아 이 앱이 Supabase를 직접 조회할 수
 * 없다(lib/database.types.ts 헤더 참고). 대신 medsky_homepage 가 자기 세션 쿠키
 * 대신 Authorization: Bearer <supabase access_token> 를 받는 /api/mobile/management/*
 * 를 제공하므로, 여기서는 매 요청에 로그인한 사용자의 access_token 을 실어 보낸다.
 */

const BASE_URL = process.env.EXPO_PUBLIC_HOMEPAGE_API_URL;

export class ManagementApiError extends Error {}

async function authHeader(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new ManagementApiError('로그인이 필요합니다.');
  return `Bearer ${session.access_token}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL) {
    throw new ManagementApiError(
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
    throw new ManagementApiError(body?.message ?? '요청에 실패했습니다.');
  }

  return body as T;
}

function postJson<T>(path: string, input: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(input) });
}

export function getViewer(): Promise<ManagementViewer> {
  return request('/api/mobile/management/viewer');
}

export function getPortal(): Promise<StudentPortalData> {
  return request('/api/mobile/management/portal');
}

export function getRecord(): Promise<{ submission: RecordSubmissionView | null }> {
  return request('/api/mobile/management/record');
}

export function createRecordUploadTicket(input: {
  name: string;
  size: number;
  type: string;
}): Promise<{ ticket: UploadTicket }> {
  return postJson('/api/mobile/management/record/ticket', input);
}

export function confirmRecordUpload(input: {
  path: string;
  fileName: string;
}): Promise<{ message: string }> {
  return postJson('/api/mobile/management/record/confirm', input);
}

export function setNextActionChecked(input: {
  sessionId: string;
  itemKey: string;
  done: boolean;
}): Promise<{ ok: true }> {
  return postJson('/api/mobile/management/next-action', input);
}

/** `room` 은 'always'(상시 피드백) 또는 lesson_sessions.id 다. 생략하면 학생 전체 대화를 필터 없이 돌려준다. */
export function getChatMessages(
  studentId?: string,
  room?: ChatRoom
): Promise<{ viewerRole: string; messages: ChatMessageView[] }> {
  const params = new URLSearchParams();
  if (studentId) params.set('studentId', studentId);
  if (room) params.set('room', room);
  const query = params.toString();
  return request(`/api/mobile/management/chat${query ? `?${query}` : ''}`);
}

export function sendChatMessage(input: {
  studentId?: string;
  room?: ChatRoom;
  body?: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}): Promise<{ ok: true }> {
  return postJson('/api/mobile/management/chat', input);
}

export function createChatUploadTicket(input: {
  studentId?: string;
  name: string;
  size: number;
  type: string;
}): Promise<{ ticket: UploadTicket }> {
  return postJson('/api/mobile/management/chat/ticket', input);
}

export function getChatFileUrl(messageId: string): Promise<{ signedUrl: string }> {
  return request(`/api/mobile/management/chat/file?id=${encodeURIComponent(messageId)}`);
}

export function getChatInbox(): Promise<{ entries: ChatInboxEntry[] }> {
  return request('/api/mobile/management/chat/inbox');
}

/** 대화 탭 상단 요약 — 상시 피드백 미리보기/안읽음 수와 회차별 메시지 수/안읽음 수. */
export function getChatRooms(studentId?: string): Promise<ChatRoomsSummary> {
  const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
  return request(`/api/mobile/management/chat/rooms${query}`);
}

export function getStudents(): Promise<{ students: StudentSummary[] }> {
  return request('/api/mobile/management/students');
}

export function getStudentDetail(studentId: string): Promise<StudentDetail> {
  return request(`/api/mobile/management/students/${encodeURIComponent(studentId)}`);
}

/**
 * 업로드 티켓(생기부 파일·채팅 첨부 공용)으로 실제 파일 바이트를 Supabase Storage에
 * 올린다. 서버(Vercel 함수 4.5MB 상한)를 거치지 않고 클라이언트가 스토리지로 바로
 * 올리는 이유는 medsky_homepage의 같은 업로드 방식과 같다
 * (features/management/lib/storage.ts 참고).
 */
export async function uploadWithTicket(
  ticket: UploadTicket,
  fileUri: string
): Promise<void> {
  const fileResponse = await fetch(fileUri);
  const blob = await fileResponse.blob();

  const { error } = await supabase.storage
    .from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, blob, { contentType: ticket.contentType });

  if (error) throw new ManagementApiError(error.message);
}
