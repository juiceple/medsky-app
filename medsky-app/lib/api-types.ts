/**
 * /api/mobile/** 응답의 모양.
 *
 * medsky_homepage 의 각 기능 폴더 `types.ts` 에서 화면이 실제로 쓰는 부분만 옮겼다.
 * 전부 복사하지 않은 것은 의도적이다 — 옮겨온 필드가 많을수록 저쪽 스키마가 바뀔 때
 * 조용히 어긋나는 곳이 늘어난다. 화면에 그리지 않는 값은 여기 두지 않는다.
 *
 * 문자열 상수(상태·전형 등)는 union 으로 좁히지 않고 `string` 으로 둔다. 앱은 값을
 * 그대로 보여주기만 하므로, 서버에서 enum 값이 하나 늘 때마다 앱을 새로 배포해야
 * 하는 상황을 만들 이유가 없다.
 */

export type MobileRole = 'manager' | 'consultant' | 'student' | 'none';

export type MobileSection = 'management' | 'susi' | 'jungsi';

export type MobileMe = {
  userId: string;
  email: string | null;
  role: MobileRole;
  name: string | null;
  consultantId: string | null;
  studentId: string | null;
  services: string[];
  /** 앱 탭 구성. 이 목록이 곧 보이는 콘솔 탭이다. */
  sections: MobileSection[];
};

/* ─────────────────────── 종합 생기부 관리 ─────────────────────── */

export type CreditBalance = { granted: number; used: number; remaining: number };

export type ManagementStudent = {
  id: string;
  student_name: string;
  student_phone: string | null;
  parent_phone: string | null;
  service_type: string | null;
  consultant_id: string | null;
  track: string | null;
  status: string | null;
  grade_level: string | null;
  school_name: string | null;
  desired_university: string | null;
  desired_major: string | null;
  onboarded_at: string | null;
  created_at: string;
  balance: CreditBalance;
  consultantName: string | null;
  lastLessonDate: string | null;
};

export type LessonMaterial = {
  id: string;
  title: string;
  url: string | null;
  description: string | null;
  is_shared_with_student: boolean;
};

export type LessonSession = {
  id: string;
  session_round: number;
  deducted_round: number;
  lesson_date: string;
  status: string;
  topic: string | null;
  student_summary: string | null;
  internal_note: string | null;
  next_action: string | null;
  is_shared_with_student: boolean;
  display_name: string | null;
  materials: LessonMaterial[];
};

export type CreditEntry = {
  id: string;
  kind: string;
  amount: number;
  memo: string | null;
  created_at: string;
};

export type ManagementStudentsResponse = {
  scope: 'all' | 'mine';
  students: ManagementStudent[];
};

export type ManagementStudentDetail = {
  student: ManagementStudent;
  sessions: LessonSession[];
  credits: CreditEntry[];
};

export type ManagementOverview = {
  periodMonth: string;
  overview: {
    totalStudents: number;
    activeStudents: number;
    unassigned: number;
    waitingOnboarding: number;
    lowCredit: number;
    stalled: number;
    roundsThisMonth: number;
    sessionsThisMonth: number;
  };
  loads: Array<{
    consultant: { id: string; name: string; track: string | null; role_title: string | null };
    studentCount: number;
    activeStudentCount: number;
    remainingRounds: number;
    roundsThisMonth: number;
    missingRate: boolean;
  }>;
  stalled: Array<{
    id: string;
    name: string;
    consultantName: string | null;
    remaining: number;
    lastLessonDate: string | null;
    daysSinceLastLesson: number | null;
  }>;
};

/** 학생 마이페이지 / 학부모 조회. 공개 처리된 회차만 담겨 온다. */
export type StudentPortal = {
  student: ManagementStudent;
  consultant: { name: string; track: string | null } | null;
  balance: CreditBalance;
  sessions: Array<{
    id: string;
    session_round: number;
    lesson_date: string;
    status: string;
    topic: string | null;
    student_summary: string | null;
    next_action: string | null;
    display_name: string | null;
    materials: LessonMaterial[];
  }>;
  upcoming: Array<{ id: string; lesson_date: string; topic: string | null }>;
};

/* ─────────────────────── 수시 원서 컨설팅 ─────────────────────── */

/**
 * 수시는 축이 둘이다(웹 `/consultant/susi` 와 같은 구분).
 *   ① 진행 건(Application) — 결제 이후 자료 · 일정 · 리포트가 굴러가는 단위
 *   ② 담당 학생(SusiStudent) — 올해 원서를 함께 짜는 단위
 * 한 사람이 양쪽에 다 있을 수도, 한쪽에만 있을 수도 있어 합치지 않는다.
 */
export type SusiApplication = {
  id: string;
  studentName: string;
  studentPhone: string;
  parentPhone: string | null;
  status: string;
  assignedConsultantName: string | null;
  assignedAt: string | null;
  lessonAt: string | null;
  materialsDueOn: string | null;
  consultingDoneAt: string | null;
  reportSentAt: string | null;
  agreementAcceptedAt: string | null;
  highSchool: string | null;
  gradeLevel: string | null;
  targetUniversities: string | null;
  desiredMajor: string | null;
  requestNote: string | null;
  applicationDeadline: string | null;
  createdAt: string;
};

export type SubmissionProgress = { done: number; total: number; complete: boolean };

export type DueState = {
  dueOn: string;
  daysLeft: number;
  overdue: boolean;
  label: string;
};

export type SusiApplicationRow = {
  application: SusiApplication;
  submission: SubmissionProgress;
  materialsDue: DueState | null;
  reportDue: DueState | null;
  daysSinceAssigned?: number | null;
  daysSincePaid?: number;
};

export type SusiApplicationsResponse =
  | {
      scope: 'all';
      counts: Record<string, number>;
      buckets: {
        awaitingAssignment: SusiApplicationRow[];
        awaitingSchedule: SusiApplicationRow[];
        materialsAtRisk: SusiApplicationRow[];
        reportPending: SusiApplicationRow[];
        jinhaksaToPurge: SusiApplicationRow[];
        all: SusiApplicationRow[];
      };
    }
  | { scope: 'mine'; rows: SusiApplicationRow[] };

export type ChecklistEntry = {
  key: string;
  label: string;
  done: boolean;
  optional: boolean;
  verified: boolean;
  needsAttention: boolean;
  attentionReason: string | null;
  fileName: string | null;
};

export type TimelineEntry = {
  id: number;
  event: string;
  actor: string;
  occurredAt: string;
};

export type SusiApplicationDetail = {
  application: SusiApplication;
  checklist: ChecklistEntry[];
  submission: SubmissionProgress;
  materialsDue: DueState | null;
  reportDue: DueState | null;
  timeline: TimelineEntry[];
};

export type StageState = { stage: string; done: boolean; current: boolean };

export type RefundEstimate = {
  ratePercent: number;
  label: string;
  basis: string;
  isEstimate: boolean;
};

/** 고객이 토큰 링크로 여는 수시 진행 상황. */
export type SusiProgress = {
  application: SusiApplication;
  checklist: ChecklistEntry[];
  stages: StageState[];
  materialsDue: DueState | null;
  refund: RefundEstimate;
};

export type SusiStudent = {
  id: string;
  name: string;
  high_school: string | null;
  grade_level: string | null;
  tracks: string[];
  gpa: number | null;
  record_level: string | null;
  desired_schools: string | null;
  desired_majors: string | null;
  status: string;
  consultant_name: string | null;
  submitted_at: string | null;
  created_at: string;
};

export type SusiStudentsResponse = {
  admissionYear: number;
  scope: 'all' | 'mine';
  students: SusiStudent[];
};

export type SusiStudentDetail = {
  student: SusiStudent & {
    student_phone: string | null;
    parent_phone: string | null;
    wish_applications: string | null;
    questions: string | null;
    extra_requests: string | null;
    memo: string | null;
  };
  report: {
    base_gyogwa: number | null;
    jonghap: number | null;
    record_level: string | null;
    record_note: string | null;
    univ_gyogwa: Record<string, number>;
    wishlist: Array<{
      univ: string;
      major: string;
      track: string;
      subtrack: string | null;
      note: string | null;
    }>;
    student_request_memo: string | null;
    consultant_request_thoughts: string | null;
  };
};

/* ─────────────────────── 정시 원서 컨설팅 ─────────────────────── */

export type JungsiOnboarding = {
  id: string;
  student_name: string | null;
  student_phone: string | null;
  parent_phone: string | null;
  buyer_name: string | null;
  grade_level: string | null;
  high_school: string | null;
  track: string | null;
  desired_schools: string | null;
  desired_majors: string | null;
  questions: string | null;
  extra_requests: string | null;
  status: string;
  materials_ready_at: string | null;
  consultant_name: string | null;
  assigned_at: string | null;
  lesson_date: string | null;
  lesson_time: string | null;
  report_sent_at: string | null;
  report_url: string | null;
  application_deadline: string | null;
  canceled_at: string | null;
  created_at: string;
  files: Array<{
    id: string;
    kind: string;
    original_name: string | null;
    check_result: string;
    check_note: string | null;
  }>;
};

export type MatchingSla = {
  level: '정상' | '주의' | '지연';
  /** 자료 완료 후 배정을 기다린 시간. 미완료거나 배정이 끝났으면 null. */
  waitingHours: number | null;
};

export type JungsiStepState = {
  step: string;
  label: string;
  done: boolean;
  blocker: string | null;
};

export type JungsiOnboardingsResponse = {
  scope: 'all' | 'mine';
  rows: Array<{ onboarding: JungsiOnboarding; sla: MatchingSla }>;
};

export type JungsiOnboardingDetail = {
  onboarding: JungsiOnboarding;
  steps: JungsiStepState[];
  sla: MatchingSla;
  documentDueOn: string | null;
};

/** 고객이 토큰 링크로 여는 정시 진행 상황. */
export type JungsiProgress = {
  onboarding: JungsiOnboarding;
  steps: JungsiStepState[];
  journey: Array<{
    key: string;
    label: string;
    done: boolean;
    current: boolean;
    detail: string | null;
  }>;
  documentDueOn: string | null;
};
