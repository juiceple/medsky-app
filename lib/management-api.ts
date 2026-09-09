import { supabase } from './supabase';
import type {
  ChatInboxEntry,
  ChatMessageView,
  ChatRoom,
  ChatRoomsSummary,
  ConsultantInvitation,
  ConsultantPayRate,
  ConsultantSurveyWithName,
  ConsultantWithServices,
  DashboardData,
  FeedbackNoteWithNames,
  FeedbackStatus,
  KakaoTemplateOption,
  LessonSessionSaveInput,
  ManagementViewer,
  NotificationCounts,
  NotificationLogRow,
  NotificationSettingRow,
  ParentLinkRow,
  RecordSubmissionView,
  ReservationSaveInput,
  ReservationStatus,
  ReservationView,
  SettlementRow,
  SettlementSummary,
  StudentDetail,
  StudentInvitation,
  StudentPortalData,
  StudentStatus,
  StudentSummary,
  SurveySummary,
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

function deleteRequest<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
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

/** 채팅 푸시 알림을 받을 이 기기의 Expo 푸시 토큰을 로그인한 계정에 등록한다. */
export function registerPushToken(input: {
  token: string;
  platform: 'ios' | 'android';
}): Promise<{ ok: true }> {
  return postJson('/api/mobile/management/push-token', input);
}

/** 로그아웃 시 이 기기가 더 이상 채팅 푸시를 받지 않도록 토큰을 지운다. */
export function unregisterPushToken(token: string): Promise<{ ok: true }> {
  return deleteRequest(`/api/mobile/management/push-token?token=${encodeURIComponent(token)}`);
}

export function getStudents(): Promise<{ students: StudentSummary[] }> {
  return request('/api/mobile/management/students');
}

export function getStudentDetail(studentId: string): Promise<StudentDetail> {
  return request(`/api/mobile/management/students/${encodeURIComponent(studentId)}`);
}

/** 컨설턴트/실장 전용 내부 메모 저장. 학생에게는 노출되지 않는다. */
export function saveInternalMemo(
  studentId: string,
  internalMemo: string
): Promise<{ ok: true; message: string }> {
  return postJson(
    `/api/mobile/management/students/${encodeURIComponent(studentId)}/memo`,
    { internalMemo }
  );
}

/** 진행 상태(카톡방 개설 등) 변경. */
export function updateStudentStatus(
  studentId: string,
  status: StudentStatus
): Promise<{ ok: true; message: string }> {
  return postJson(
    `/api/mobile/management/students/${encodeURIComponent(studentId)}/status`,
    { status }
  );
}

/** 회차 기록 생성/수정 — 자료 링크, 학생 공개 요약, 다음 할 일, 내부 메모, 회차 원장 동기화까지 한 번에 처리한다. */
export function saveLessonSession(
  input: LessonSessionSaveInput
): Promise<{ ok: true; sessionId: string; message: string }> {
  return postJson('/api/mobile/management/sessions', input);
}

export function deleteLessonSession(
  studentId: string,
  sessionId: string
): Promise<{ ok: true; message: string }> {
  return deleteRequest(
    `/api/mobile/management/sessions/${encodeURIComponent(sessionId)}?studentId=${encodeURIComponent(studentId)}`
  );
}

/** 학생 한 명의 수업 예약(다음 수업 일정) 목록. */
export function getReservations(studentId: string): Promise<{ reservations: ReservationView[] }> {
  return request(
    `/api/mobile/management/students/${encodeURIComponent(studentId)}/reservations`
  );
}

/** 수업 예약 등록/일정 변경(reservationId 를 넘기면 그 예약을 옮긴다). */
export function bookReservation(
  studentId: string,
  input: ReservationSaveInput
): Promise<{ ok: true; message: string }> {
  return postJson(
    `/api/mobile/management/students/${encodeURIComponent(studentId)}/reservations`,
    input
  );
}

/** 예약 결과 처리 — 완료/노쇼면 회차 기록을 만들고 차감하며, 취소면 되돌린다. */
export function settleReservation(
  studentId: string,
  reservationId: string,
  status: ReservationStatus
): Promise<{ ok: true; message: string }> {
  return postJson(
    `/api/mobile/management/students/${encodeURIComponent(studentId)}/reservations/${encodeURIComponent(reservationId)}/settle`,
    { status }
  );
}

/** 예약 삭제. 회차 기록이 이미 붙은 예약은 서버가 거부한다(먼저 취소 처리해야 한다). */
export function deleteReservation(
  studentId: string,
  reservationId: string
): Promise<{ ok: true; message: string }> {
  return deleteRequest(
    `/api/mobile/management/students/${encodeURIComponent(studentId)}/reservations/${encodeURIComponent(reservationId)}`
  );
}

/**
 * 업로드 티켓(생기부 파일·채팅 첨부 공용)으로 실제 파일 바이트를 Supabase Storage에
 * 올린다. 서버(Vercel 함수 4.5MB 상한)를 거치지 않고 클라이언트가 스토리지로 바로
 * 올리는 이유는 medsky_homepage의 같은 업로드 방식과 같다
 * (features/management/lib/storage.ts 참고).
 */
// ── 실장(관리자) 전용 ────────────────────────────────────────────────────────

/** 학생을 컨설턴트에게 배정/재배정(consultantId 지정) 또는 배정 해제(null). */
export function assignConsultant(
  studentId: string,
  consultantId: string | null
): Promise<{ ok: true; message: string }> {
  return postJson(`/api/mobile/management/students/${encodeURIComponent(studentId)}/assign`, {
    consultantId,
  });
}

/** 회차 수동 보정(결제 누락/환불/추가지급/수동조정). */
export function adjustCredits(
  studentId: string,
  input: { amount: number; kind: string; memo?: string | null }
): Promise<{ ok: true; message: string }> {
  return postJson(`/api/mobile/management/students/${encodeURIComponent(studentId)}/credits`, input);
}

export function getConsultants(): Promise<{ consultants: ConsultantWithServices[] }> {
  return request('/api/mobile/management/consultants');
}

export function saveConsultant(input: {
  consultantId?: string | null;
  name: string;
  track: string;
  phone?: string | null;
  email?: string | null;
  career?: string | null;
  roleTitle?: string | null;
  ratePerRound?: number | null;
  services: string[];
}): Promise<{ ok: true; message: string }> {
  return postJson('/api/mobile/management/consultants', input);
}

export function getConsultantInvitations(): Promise<{ invitations: ConsultantInvitation[] }> {
  return request('/api/mobile/management/consultants/invitations');
}

export function createConsultantInvitation(input: {
  consultantId?: string | null;
  name: string;
  track: string;
  roleTitle?: string | null;
  phone: string;
  email: string;
  memo?: string | null;
  services: string[];
}): Promise<{ ok: true; message: string; url: string }> {
  return postJson('/api/mobile/management/consultants/invitations', input);
}

export function cancelConsultantInvitation(invitationId: string): Promise<{ ok: true; message: string }> {
  return deleteRequest(`/api/mobile/management/consultants/invitations/${encodeURIComponent(invitationId)}`);
}

export function getStudentInvitations(): Promise<{ invitations: StudentInvitation[] }> {
  return request('/api/mobile/management/invitations');
}

export function createStudentInvitation(input: {
  studentName: string;
  studentPhone?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  serviceType?: string | null;
  grantedSessions?: number;
}): Promise<{ ok: true; message: string; url: string }> {
  return postJson('/api/mobile/management/invitations', input);
}

export function reissueStudentInvitation(
  invitationId: string
): Promise<{ ok: true; message: string; url: string }> {
  return postJson(`/api/mobile/management/invitations/${encodeURIComponent(invitationId)}/reissue`, {});
}

export function cancelStudentInvitation(invitationId: string): Promise<{ ok: true; message: string }> {
  return postJson(`/api/mobile/management/invitations/${encodeURIComponent(invitationId)}/cancel`, {});
}

export function getDashboard(): Promise<DashboardData> {
  return request('/api/mobile/management/dashboard');
}

export function getPayRates(): Promise<{ payRates: ConsultantPayRate[] }> {
  return request('/api/mobile/management/pay-rates');
}

export function savePayRate(input: {
  roleTitle: string;
  ratePerRound: number;
  memo?: string | null;
}): Promise<{ ok: true; message: string }> {
  return postJson('/api/mobile/management/pay-rates', input);
}

export function getSettlements(
  periodMonth?: string
): Promise<{ periodMonth: string; periods: string[]; rows: SettlementRow[]; summary: SettlementSummary }> {
  const query = periodMonth ? `?period_month=${encodeURIComponent(periodMonth)}` : '';
  return request(`/api/mobile/management/settlements${query}`);
}

export function confirmSettlement(input: {
  consultantId: string;
  periodMonth: string;
  memo?: string | null;
}): Promise<{ ok: true; message: string }> {
  return postJson('/api/mobile/management/settlements/confirm', input);
}

export function revertSettlement(settlementId: string): Promise<{ ok: true; message: string }> {
  return postJson('/api/mobile/management/settlements/revert', { settlementId });
}

export function toggleSettlementPaid(settlementId: string): Promise<{ ok: true; message: string }> {
  return postJson('/api/mobile/management/settlements/toggle-paid', { settlementId });
}

export function getFeedbackNotes(): Promise<{ notes: FeedbackNoteWithNames[] }> {
  return request('/api/mobile/management/feedback');
}

export function saveFeedbackNote(input: {
  body: string;
  consultantId?: string | null;
  studentId?: string | null;
  lessonSessionId?: string | null;
  status?: string;
}): Promise<{ ok: true; message: string }> {
  return postJson('/api/mobile/management/feedback', input);
}

export function updateFeedbackStatus(
  noteId: string,
  status: FeedbackStatus
): Promise<{ ok: true; message: string }> {
  return postJson(`/api/mobile/management/feedback/${encodeURIComponent(noteId)}/status`, { status });
}

export function deleteFeedbackNote(noteId: string): Promise<{ ok: true; message: string }> {
  return deleteRequest(`/api/mobile/management/feedback/${encodeURIComponent(noteId)}`);
}

export function getConsultantSurveys(): Promise<{ surveys: ConsultantSurveyWithName[]; summary: SurveySummary }> {
  return request('/api/mobile/management/feedback/surveys');
}

export function submitConsultantSurvey(input: {
  consultantId?: string | null;
  satisfaction?: number | null;
  prepMinutes?: number | null;
  maxStudents?: number | null;
  desiredHourlyRate?: number | null;
  requestToCompany?: string | null;
}): Promise<{ ok: true; message: string }> {
  return postJson('/api/mobile/management/feedback/surveys', input);
}

export function getNotificationTemplates(): Promise<{ settings: NotificationSettingRow[] }> {
  return request('/api/mobile/management/notifications/templates');
}

export function updateNotificationTemplate(input: {
  kind: string;
  kakaoTemplateId?: string | null;
  isEnabled: boolean;
}): Promise<{ ok: true; message: string }> {
  return postJson('/api/mobile/management/notifications/templates', input);
}

export function getKakaoTemplates(): Promise<{ templates: KakaoTemplateOption[] }> {
  return request('/api/mobile/management/notifications/kakao-template');
}

export function registerKakaoTemplate(input: {
  kind: string;
  templateId: string;
  name?: string | null;
  pfId?: string | null;
}): Promise<{ ok: true; message: string }> {
  return postJson('/api/mobile/management/notifications/kakao-template', input);
}

export function retryNotificationJob(jobId: string): Promise<{ ok: true; message: string }> {
  return postJson('/api/mobile/management/notifications/retry', { jobId });
}

export function runNotificationSchedule(): Promise<{ ok: true; message: string }> {
  return postJson('/api/mobile/management/notifications/run-schedule', {});
}

export function getNotificationLog(): Promise<{ log: NotificationLogRow[]; counts: NotificationCounts }> {
  return request('/api/mobile/management/notifications/log');
}

export function getParentLinks(): Promise<{ links: ParentLinkRow[] }> {
  return request('/api/mobile/management/notifications/parent-links');
}

export function reissueParentLink(studentId: string): Promise<{ ok: true; message: string; url: string }> {
  return postJson(
    `/api/mobile/management/notifications/parent-links/${encodeURIComponent(studentId)}/reissue`,
    {}
  );
}

export function toggleParentNotify(
  studentId: string,
  enabled: boolean
): Promise<{ ok: true; message: string }> {
  return postJson(
    `/api/mobile/management/notifications/parent-links/${encodeURIComponent(studentId)}/toggle`,
    { enabled }
  );
}

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
