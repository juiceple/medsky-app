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
  /**
   * 사이트 전역 어드민인지. role 이 'manager' 여도 실장(실무 매니저)과 어드민은
   * 다르다 — 정산·단가·회차 수동조정·피드백·알림 관리·운영 대시보드는 어드민만
   * 볼 수 있고, 어드민이 아닌 실장은 컨설턴트 명부·학생 초대만 다룬다. 웹의
   * `/admin/management`(어드민) vs `/manager/management`(실장) 분리와 같다.
   */
  isAdmin: boolean;
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
  /** 처음으로 학생에게 공개된 시각. 상시 피드백 방에 "N회차 기록이 등록됐어요" 안내줄을 끼워 넣는 위치로 쓴다. */
  shared_at: string | null;
};

export const STUDENT_STATUSES = [
  '선생님 배정 전',
  '카톡 방 생성 전',
  '카톡 방 생성 완료',
  '카톡 방 입장 완료',
  '진행 정지',
] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export type StudentRecord = {
  id: string;
  student_name: string;
  student_phone: string | null;
  student_email: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  service_type: string | null;
  consultant_id: string | null;
  track: string | null;
  status: string | null;
  grade_level: string | null;
  school_name: string | null;
  school_gpa: string | null;
  mock_exam_grade: string | null;
  desired_university: string | null;
  desired_major: string | null;
  /** 컨설턴트/실장 전용 메모. 학생 화면에서는 절대 렌더링하지 않는다. */
  internal_memo: string | null;
};

export type StudentPortalData = {
  student: StudentRecord;
  consultant: { name: string; track: string | null } | null;
  balance: CreditBalance;
  recordSubmission: { file_name: string; uploaded_at: string } | null;
  sessions: StudentPortalSession[];
  upcoming: { id: string; session_round: number; lesson_date: string; topic: string | null }[];
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
  /** 이 메시지가 속한 회차 대화방. null 이면 상시 피드백 방. */
  sessionId: string | null;
  senderRole: ChatSenderRole;
  isMine: boolean;
  body: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileType: string | null;
  hasFile: boolean;
  createdAt: string;
};

/** 상시 피드백 방을 가리키는 room 파라미터 값. */
export const CHAT_ALWAYS_ROOM = 'always' as const;
export type ChatRoom = typeof CHAT_ALWAYS_ROOM | string;

export type ChatAlwaysRoomSummary = {
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
};

export type ChatSessionRoomSummary = {
  messageCount: number;
  unreadCount: number;
  lastMessageAt: string | null;
};

export type ChatRoomsSummary = {
  always: ChatAlwaysRoomSummary;
  sessions: Record<string, ChatSessionRoomSummary>;
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

/** 회차 기록 저장(POST /api/mobile/management/sessions) 요청 바디의 자료 링크 한 건. */
export type LessonMaterialInput = {
  title: string;
  url: string | null;
  description: string | null;
  isSharedWithStudent: boolean;
};

/**
 * 회차 기록 생성/수정 요청 바디.
 * sessionId 가 있으면 기존 기록 수정, 없으면 reservationId 로 새 기록을 만든다
 * (회차 기록은 반드시 예약과 연계된다 — 웹의 saveLessonSessionAction 과 같은 제약).
 */
export type LessonSessionSaveInput = {
  studentId: string;
  sessionId?: string | null;
  reservationId?: string | null;
  lessonDate: string;
  sessionRound: number;
  deductedRound: number;
  status: LessonStatus;
  topic: string | null;
  studentSummary: string | null;
  internalNote: string | null;
  nextAction: string | null;
  isSharedWithStudent: boolean;
  displayName: string | null;
  materials: LessonMaterialInput[];
};

export const RESERVATION_STATUSES = [
  '대기',
  '확정',
  '취소',
  '예약자 취소',
  '변경',
  '예약자 변경',
  '완료',
  '노쇼',
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

/** 학생 한 명의 수업 예약 한 건. GET /api/mobile/management/students/:id/reservations. */
export type ReservationView = {
  id: string;
  lessonDate: string;
  lessonTime: string | null;
  durationMinutes: number;
  deductedRound: number;
  status: ReservationStatus;
  title: string | null;
  memo: string | null;
  lessonSessionId: string | null;
  consultantName: string | null;
};

/** 예약 등록/일정 변경 요청 바디. reservationId 가 있으면 그 예약을 옮긴다. */
export type ReservationSaveInput = {
  reservationId?: string | null;
  lessonDate: string;
  lessonTime: string;
  deductedRound?: number;
  durationMinutes?: number;
  title: string;
  memo?: string | null;
};

/**
 * 실장(관리자) 전용 타입.
 *
 * medsky_homepage src/features/management/types.ts 의 같은 이름 상수/타입을
 * 손으로 옮긴 것이다. 그쪽이 바뀌면 여기도 같이 고쳐야 한다.
 */

export const CONSULTANT_TRACKS = [
  '상경',
  '사회과학',
  '인문',
  '생명/화학/메디컬',
  '자연',
  '공학',
  '교육',
] as const;
export type ConsultantTrack = (typeof CONSULTANT_TRACKS)[number];

export const CONSULTANT_SERVICES = ['종합 생기부 관리', '정시 원서 컨설팅', '수시 원서 컨설팅'] as const;
export type ConsultantService = (typeof CONSULTANT_SERVICES)[number];

export const CONSULTANT_ROLE_TITLES = [
  '신입 컨설턴트(1명)',
  '신입 컨설턴트(2명)',
  '신입 컨설턴트(3명)',
  '컨설턴트',
  '실장 컨설턴트',
  '대표 컨설턴트',
] as const;
export type ConsultantRoleTitle = (typeof CONSULTANT_ROLE_TITLES)[number];

export const SERVICE_TYPES = [
  '시그니처 컨설팅',
  '종합 생기부 관리(2회)',
  '종합 생기부 관리(4회)',
  '종합 생기부 관리(6회)',
  '종합 생기부 관리(8회)',
  '정시 원서 컨설팅',
  '수시 원서 컨설팅',
] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const CREDIT_KINDS = ['결제', '환불', '추가지급', '수동조정'] as const;
export type CreditKind = (typeof CREDIT_KINDS)[number];

export const INVITATION_STATUSES = ['발송 대기', '발송 완료', '수락 완료', '만료', '취소'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const SETTLEMENT_STATUSES = ['확정', '지급완료'] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const FEEDBACK_STATUSES = ['시작 전', '진행 중', '완료'] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export type ConsultantProfile = {
  id: string;
  name: string;
  track: ConsultantTrack;
  phone: string | null;
  email: string | null;
  user_id: string | null;
  career: string | null;
  role_title: ConsultantRoleTitle | null;
  rate_per_round: number | null;
};

export type ConsultantWithServices = ConsultantProfile & { services: ConsultantService[] };

export type ConsultantPayRate = {
  role_title: ConsultantRoleTitle;
  rate_per_round: number;
  memo: string | null;
  updated_at: string;
};

export type Settlement = {
  id: string;
  consultant_id: string;
  period_month: string;
  status: SettlementStatus;
  rate_per_round: number;
  round_total: number;
  session_count: number;
  amount: number;
  memo: string | null;
  confirmed_at: string;
  paid_at: string | null;
};

export type SettlementRow = {
  consultant: ConsultantProfile;
  periodMonth: string;
  roundTotal: number;
  sessionCount: number;
  unsettledRoundTotal: number;
  unsettledSessionCount: number;
  rate: number | null;
  pendingAmount: number;
  settlement: Settlement | null;
};

export type SettlementSummary = {
  roundTotal: number;
  unsettledRoundTotal: number;
  pendingAmount: number;
  confirmedAmount: number;
  paidAmount: number;
  missingRateCount: number;
};

export type ConsultantInvitation = {
  id: string;
  consultant_id: string | null;
  name: string;
  track: ConsultantTrack;
  role_title: ConsultantRoleTitle | null;
  email: string | null;
  phone: string | null;
  memo: string | null;
  services: ConsultantService[];
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export type StudentInvitation = {
  id: string;
  student_id: string | null;
  student_name: string | null;
  student_phone: string | null;
  parent_phone: string | null;
  service_type: ServiceType | null;
  granted_sessions: number;
  plan_id: string | null;
  invoice_id: number | null;
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export type FeedbackNoteWithNames = {
  id: string;
  consultant_id: string | null;
  student_id: string | null;
  lesson_session_id: string | null;
  body: string;
  status: FeedbackStatus;
  created_at: string;
  updated_at: string;
  consultantName: string | null;
  studentName: string | null;
};

export type ConsultantSurveyWithName = {
  id: string;
  consultant_id: string;
  satisfaction: number | null;
  prep_minutes: number | null;
  max_students: number | null;
  desired_hourly_rate: number | null;
  request_to_company: string | null;
  submitted_at: string;
  consultantName: string | null;
};

export type SurveySummary = {
  count: number;
  avgSatisfaction: number | null;
  avgPrepMinutes: number | null;
  avgMaxStudents: number | null;
  avgDesiredRate: number | null;
};

export type ConsoleOverview = {
  totalStudents: number;
  activeStudents: number;
  unassigned: number;
  waitingOnboarding: number;
  lowCredit: number;
  stalled: number;
  roundsThisMonth: number;
  sessionsThisMonth: number;
};

export type ConsultantLoad = {
  consultant: ConsultantProfile;
  studentCount: number;
  activeStudentCount: number;
  remainingRounds: number;
  roundsThisMonth: number;
  missingRate: boolean;
};

export type StalledStudent = {
  id: string;
  name: string;
  consultantName: string | null;
  remaining: number;
  lastLessonDate: string | null;
  daysSinceLastLesson: number | null;
};

export type DashboardData = {
  periodMonth: string;
  overview: ConsoleOverview;
  consultantLoads: ConsultantLoad[];
  stalledStudents: StalledStudent[];
};

export const NOTIFICATION_KINDS = [
  'student_invitation',
  'student_invitation_remind',
  'student_assigned',
  'parent_assigned',
  'consultant_first_lesson',
  'student_lesson_summary',
  'student_lesson_reminder',
  'parent_weekly_report',
  'parent_low_credit',
  'parent_expiry_warning',
  'consultant_stalled',
  'consultant_unlogged',
  'consultant_invitation',
  'manager_ops_alert',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type NotificationSettingRow = {
  kind: NotificationKind;
  kakao_template_id: string | null;
  is_enabled: boolean;
  memo: string | null;
  updated_at: string;
  templateName: string | null;
  templateActive: boolean;
};

export type KakaoTemplateOption = {
  id: string;
  name: string;
  template_id: string;
  is_active: boolean;
};

export type NotificationLogRow = {
  id: string;
  kind: NotificationKind;
  audience: string;
  student_id: string | null;
  consultant_id: string | null;
  recipient_name: string | null;
  recipient_phone: string;
  status: string;
  attempt_count: number;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
  studentName: string | null;
  consultantName: string | null;
};

export type NotificationCounts = { pending: number; failed: number; skipped: number };

export type ParentLinkRow = {
  studentId: string;
  studentName: string;
  parentName: string | null;
  parentPhone: string | null;
  notifyEnabled: boolean;
  url: string | null;
  issuedAt: string | null;
};
