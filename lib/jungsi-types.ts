/**
 * medsky_homepage `/api/mobile/jungsi/*` 응답 타입.
 *
 * jungsi 스키마는 PostgREST에 노출되지 않아 supabase-js로 직접 조회할 수 없으므로
 * (management 와 같은 이유), 이 타입들은 생성된 것이 아니라 medsky_homepage 의
 * `src/features/jungsi/types.ts` 를 손으로 옮긴 것이다. 그쪽 타입이 바뀌면 여기도
 * 같이 고쳐야 한다.
 */

export const JUNGSI_ONBOARDING_STATUSES = [
  '자료 대기',
  '배정 대기',
  '배정 완료',
  '분석 중',
  '컨설팅 완료',
  '리포트 전달',
  '종료',
  '취소',
] as const;
export type JungsiOnboardingStatus = (typeof JUNGSI_ONBOARDING_STATUSES)[number];

/** 컨설턴트가 직접 옮길 수 있는 상태만. 배정·취소는 실장(웹)의 몫이다. */
export const JUNGSI_CONSULTANT_STATUSES = ['배정 완료', '분석 중', '컨설팅 완료'] as const;

export const JUNGSI_DOCUMENT_KINDS = ['생활기록부', '수능성적표', '서약서', '기타'] as const;
export type JungsiDocumentKind = (typeof JUNGSI_DOCUMENT_KINDS)[number];

export const JUNGSI_DOCUMENT_CHECKS = ['확인 필요', '정상', '재발급 필요'] as const;
export type JungsiDocumentCheck = (typeof JUNGSI_DOCUMENT_CHECKS)[number];

export type JungsiWishApplication = {
  university: string;
  department: string;
  unit: string;
};

export type JungsiOnboardingFile = {
  id: string;
  onboarding_id: string;
  kind: JungsiDocumentKind;
  original_name: string | null;
  content_type: string | null;
  byte_size: number | null;
  check_result: JungsiDocumentCheck;
  check_note: string | null;
  created_at: string;
  updated_at: string;
};

export type JungsiOnboarding = {
  id: string;
  invoice_id: number;
  order_id: string;
  admission_year: number;
  buyer_name: string | null;
  buyer_phone: string | null;

  student_name: string | null;
  student_phone: string | null;
  parent_phone: string | null;
  grade_level: string | null;
  high_school: string | null;
  track: string | null;
  desired_schools: string | null;
  desired_majors: string | null;
  wish_applications: JungsiWishApplication[] | null;
  retake_intent: string | null;
  questions: string | null;
  extra_requests: string | null;
  profile_completed_at: string | null;

  documents_completed_at: string | null;

  agreement_version: string | null;
  agreement_signer_name: string | null;
  agreement_signed_at: string | null;

  reservation_id: string | null;
  lesson_date: string | null;
  lesson_time: string | null;
  schedule_completed_at: string | null;

  status: JungsiOnboardingStatus;
  materials_ready_at: string | null;

  consultant_id: string | null;
  consultant_name: string | null;
  consultant_phone: string | null;
  assigned_at: string | null;

  analysis_started_at: string | null;
  consulting_done_at: string | null;
  report_sent_at: string | null;
  report_url: string | null;

  application_deadline: string | null;
  feedback_quota: number;
  feedback_used: number;

  canceled_at: string | null;
  cancel_reason: string | null;
  memo: string | null;

  created_at: string;
  updated_at: string;
};

export type JungsiOnboardingWithFiles = JungsiOnboarding & {
  files: JungsiOnboardingFile[];
};
