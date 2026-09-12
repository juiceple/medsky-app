/**
 * medsky_homepage `/api/mobile/susi/*` 응답 타입.
 *
 * susi 스키마는 PostgREST에 노출되지 않아 supabase-js로 직접 조회할 수 없으므로
 * (management 와 같은 이유), 이 타입들은 생성된 것이 아니라 medsky_homepage 의
 * `src/features/susi/types.ts` · `src/features/susi-apply/types.ts` 를 손으로
 * 옮긴 것이다. 그쪽 타입이 바뀌면 여기도 같이 고쳐야 한다.
 */

export const SUSI_GRADE_LEVELS = ['고3', '재수', '삼수', '사수', 'N수'] as const;
export type SusiGradeLevel = (typeof SUSI_GRADE_LEVELS)[number];

export const SUSI_STUDENT_STATUSES = [
  '상담 대기',
  '배정 완료',
  '분석 중',
  '컨설팅 완료',
  '보고서 전달',
  '종료',
  '취소',
] as const;
export type SusiStudentStatus = (typeof SUSI_STUDENT_STATUSES)[number];

/** 상담 신청서(susi.students) — 컨설턴트/실장 명부·상세가 보는 학생 원본. */
export type SusiStudent = {
  id: string;
  admission_year: number;
  name: string;
  student_phone: string | null;
  parent_phone: string | null;
  high_school: string | null;
  grade_level: SusiGradeLevel | null;
  tracks: string[];
  gpa: number | null;
  gpa_note: string | null;
  mock_exam_note: string | null;
  record_level: 'A' | 'B' | 'C' | null;
  desired_schools: string | null;
  desired_majors: string | null;
  wish_applications: string | null;
  retake_intent: string | null;
  special_admission: string | null;
  lead_source: string | null;
  questions: string | null;
  extra_requests: string | null;
  memo: string | null;
  status: SusiStudentStatus;
  consultant_id: string | null;
  consultant_name: string | null;
  assigned_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

/* ────────────────────── 진행 건(원서 접수 보조, susi-apply) ────────────────────── */

export const SUSI_APPLICATION_STATUSES = [
  '결제 완료',
  '자료 대기',
  '배정 대기',
  '배정 완료',
  '수업 완료',
  '리포트 발송',
  '종료',
  '취소',
] as const;
export type SusiApplicationStatus = (typeof SUSI_APPLICATION_STATUSES)[number];

export const SUSI_SUBMISSION_ITEMS = [
  '생활기록부',
  '3학년 1학기 내신',
  '모의고사 성적표',
  '학생 프로필',
  '희망 대학·학과',
  '상담 요청사항',
  '진학사 계정',
] as const;
export type SusiSubmissionItem = (typeof SUSI_SUBMISSION_ITEMS)[number];

export type SusiApplication = {
  id: string;
  invoiceId: number | null;
  orderId: string | null;
  productName: string | null;
  studentName: string;
  studentPhone: string;
  parentPhone: string | null;
  status: SusiApplicationStatus;
  assignedConsultantId: string | null;
  assignedConsultantName: string | null;
  assignedAt: string | null;
  reservationId: string | null;
  lessonAt: string | null;
  lessonOriginalAt: string | null;
  lessonRescheduleCount: number;
  materialsDueOn: string | null;
  lessonChangeRequestedAt: string | null;
  lessonChangeRequestedLessonAt: string | null;
  lessonChangeRequestedNote: string | null;
  consultingDoneAt: string | null;
  reportSentAt: string | null;
  reportViewedAt: string | null;
  agreementAcceptedAt: string | null;
  jinhaksaMemberType: string | null;
  jinhaksaSharedAt: string | null;
  jinhaksaPurgedAt: string | null;
  targetUniversities: string | null;
  desiredMajor: string | null;
  requestNote: string | null;
  applicationDeadline: string | null;
  internalMemo: string | null;
  createdAt: string;
  highSchool: string | null;
  gradeLevel: string | null;
  wishApplications: string | null;
};

export type SusiDueState = {
  dueOn: string;
  daysLeft: number;
  overdue: boolean;
  label: string;
};

export type SusiSubmissionSummary = { done: number; total: number; complete: boolean };

/** 목록 화면 한 줄 — 웹의 ConsultantApplicationRow 를 축약한 모양이다. */
export type SusiApplicationSummary = {
  application: SusiApplication;
  submission: SusiSubmissionSummary;
  materialsDue: SusiDueState | null;
  reportDue: SusiDueState | null;
};

export type SusiSubmissionItemRow = {
  itemKey: SusiSubmissionItem;
  submittedAt: string | null;
  recordSource: string | null;
  verifiedAt: string | null;
  staffNote: string | null;
  filePath: string | null;
  fileName: string | null;
};

export type SusiChecklistEntry = {
  key: SusiSubmissionItem;
  label: SusiSubmissionItem;
  done: boolean;
  optional: boolean;
  verified: boolean;
  needsAttention: boolean;
  attentionReason: string | null;
  fileName: string | null;
};

export type SusiTimelineEntry = {
  id: number;
  event: string;
  actor: '고객' | '실장' | '컨설턴트' | '시스템';
  detail: Record<string, unknown>;
  occurredAt: string;
};

export type SusiApplicationDetail = {
  application: SusiApplication;
  items: SusiSubmissionItemRow[];
  checklist: SusiChecklistEntry[];
  submission: SusiSubmissionSummary;
  materialsDue: SusiDueState | null;
  reportDue: SusiDueState | null;
  timeline: SusiTimelineEntry[];
};
