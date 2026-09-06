/**
 * medsky_homepage `/api/mobile/management/*` 응답 타입.
 *
 * management 스키마는 PostgREST에 노출되지 않아 supabase-js로 직접 조회할 수 없으므로
 * (lib/database.types.ts 헤더 참고), 이 타입들은 생성된 것이 아니라 medsky_homepage
 * src/features/management/types.ts 및 각 API route의 응답 모양을 손으로 옮긴 것이다.
 * 그쪽 타입이 바뀌면 여기도 같이 고쳐야 한다.
 */

export type ManagementRole = 'manager' | 'consultant' | 'student' | 'none';

export type ManagementViewer = {
  role: ManagementRole;
  studentId: string | null;
  consultantId: string | null;
  consultantName: string | null;
  email: string | null;
};

export type LessonStatus = '예정' | '완료' | '취소' | '노쇼';

export type LessonMaterial = {
  id: string;
  lesson_session_id: string;
  title: string;
  url: string | null;
  description: string | null;
  is_shared_with_student: boolean;
  sort_order: number;
};

export type NextActionItem = {
  key: string;
  text: string;
  done: boolean;
};

export type CreditBalance = {
  granted: number;
  used: number;
  remaining: number;
};

export type StudentPortalSession = {
  id: string;
  session_round: number;
  lesson_date: string;
  status: LessonStatus;
  topic: string | null;
  student_summary: string | null;
  display_name: string | null;
  materials: LessonMaterial[];
  next_actions: NextActionItem[];
};

export type StudentRecord = {
  id: string;
  student_name: string;
  service_type: string | null;
  track: string | null;
  status: string | null;
  grade_level: string | null;
  school_name: string | null;
  desired_university: string | null;
  desired_major: string | null;
};

export type StudentPortalData = {
  student: StudentRecord;
  consultant: { name: string; track: string | null } | null;
  balance: CreditBalance;
  recordSubmission: { file_name: string; uploaded_at: string } | null;
  sessions: StudentPortalSession[];
  upcoming: { id: string; lesson_date: string; topic: string | null }[];
};

export type RecordSubmissionView = {
  file_name: string;
  uploaded_at: string;
  signedUrl: string | null;
};

export type UploadTicket = {
  bucket: string;
  path: string;
  token: string;
  contentType: string;
};

export type ChatSenderRole = 'student' | 'consultant';

export type ChatMessageView = {
  id: string;
  senderRole: ChatSenderRole;
  isMine: boolean;
  body: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileType: string | null;
  hasFile: boolean;
  createdAt: string;
};

export type ChatInboxEntry = {
  studentId: string;
  studentName: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
};

/** 컨설턴트/실장 명부 및 학생 상세에 쓰는, 크레딧·컨설턴트명이 붙은 학생 요약. */
export type StudentSummary = StudentRecord & {
  balance: CreditBalance;
  consultantName: string | null;
  lastLessonDate: string | null;
};

export type LessonSessionFull = {
  id: string;
  student_id: string;
  consultant_id: string | null;
  session_round: number;
  deducted_round: number;
  lesson_date: string;
  status: LessonStatus;
  topic: string | null;
  student_summary: string | null;
  internal_note: string | null;
  next_action: string | null;
  is_shared_with_student: boolean;
  display_name: string | null;
  materials: LessonMaterial[];
};

export type StudentDetail = {
  student: StudentSummary;
  sessions: LessonSessionFull[];
  recordSubmission: {
    fileName: string;
    uploadedAt: string;
    signedUrl: string | null;
  } | null;
};
