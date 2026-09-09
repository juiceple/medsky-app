/**
 * 수업 예약의 서비스별 규칙.
 *
 * medsky_homepage 의 src/lib/reservations/rules.ts 를 그대로 옮긴 것이다. 그쪽이
 * 바뀌면 (특히 SERVICE_RULES 값) 여기도 같이 고쳐야 한다 — 정본은 web 쪽 파일과
 * DB 마이그레이션(class_reservation_blocks_service 등) 두 곳이고, 이 파일은 화면
 * 안내·사전 검사용이라 최종 방어선은 항상 서버(web 의 mobile API route)다.
 */

export const CLASS_SERVICES = [
  '종합 생기부 관리',
  '수시 원서 컨설팅',
  '정시 원서 컨설팅',
  '시그니처 컨설팅',
  '기타',
] as const;

export type ClassService = (typeof CLASS_SERVICES)[number];

export type OverlapScope = '서비스 전체' | '컨설턴트별';

export type ServiceRule = {
  overlapScope: OverlapScope;
  allowsHalfRound: boolean;
  defaultDurationMinutes: number;
  defaultRound: number;
  maxRound: number;
  overlapNotice: string;
};

export const SERVICE_RULES: Record<ClassService, ServiceRule> = {
  '종합 생기부 관리': {
    overlapScope: '컨설턴트별',
    allowsHalfRound: true,
    defaultDurationMinutes: 60,
    defaultRound: 1,
    maxRound: 4,
    overlapNotice: '컨설턴트별로 시간을 잡습니다. 다른 컨설턴트의 수업과 시간이 겹쳐도 됩니다.',
  },
  '수시 원서 컨설팅': {
    overlapScope: '서비스 전체',
    allowsHalfRound: false,
    defaultDurationMinutes: 120,
    defaultRound: 1,
    maxRound: 3,
    overlapNotice: '같은 시간에 한 건만 진행합니다. 컨설턴트가 달라도 시간이 겹칠 수 없습니다.',
  },
  '정시 원서 컨설팅': {
    overlapScope: '서비스 전체',
    allowsHalfRound: false,
    defaultDurationMinutes: 120,
    defaultRound: 1,
    maxRound: 3,
    overlapNotice: '같은 시간에 한 건만 진행합니다. 컨설턴트가 달라도 시간이 겹칠 수 없습니다.',
  },
  '시그니처 컨설팅': {
    overlapScope: '서비스 전체',
    allowsHalfRound: false,
    defaultDurationMinutes: 120,
    defaultRound: 1,
    maxRound: 3,
    overlapNotice: '같은 시간에 한 건만 진행합니다. 컨설턴트가 달라도 시간이 겹칠 수 없습니다.',
  },
  기타: {
    overlapScope: '컨설턴트별',
    allowsHalfRound: false,
    defaultDurationMinutes: 60,
    defaultRound: 1,
    maxRound: 3,
    overlapNotice: '담당자가 지정된 경우 그 담당자의 다른 수업과만 겹칠 수 없습니다.',
  },
};

export function isClassService(value: unknown): value is ClassService {
  return typeof value === 'string' && (CLASS_SERVICES as readonly string[]).includes(value);
}

export function serviceRule(service: ClassService): ServiceRule {
  return SERVICE_RULES[service];
}

/** 판매 상품 문자열(예: "종합 생기부 관리 (8회)")을 예약의 서비스 단위로 줄인다. */
export function classServiceFromServiceType(serviceType: string | null | undefined): ClassService {
  if (!serviceType) return '기타';
  if (serviceType.startsWith('종합 생기부 관리')) return '종합 생기부 관리';
  if (isClassService(serviceType)) return serviceType;
  return '기타';
}

/* ------------------------------------------------------------------ */
/* 회차                                                                */
/* ------------------------------------------------------------------ */

export function roundOptions(service: ClassService): number[] {
  const rule = serviceRule(service);
  const step = rule.allowsHalfRound ? 0.5 : 1;
  const options: number[] = [];

  for (let value = step; value <= rule.maxRound + 1e-9; value += step) {
    options.push(Number(value.toFixed(1)));
  }

  return options;
}

export function isValidRound(service: ClassService, round: number): boolean {
  if (!Number.isFinite(round) || round < 0 || round > 10) return false;

  const doubled = round * 2;
  if (Math.abs(doubled - Math.round(doubled)) > 1e-9) return false;

  if (!serviceRule(service).allowsHalfRound && Math.abs(round - Math.round(round)) > 1e-9) {
    return false;
  }

  return true;
}

export function formatRound(round: number): string {
  const rounded = Number(round.toFixed(1));
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}회차`;
}

/* ------------------------------------------------------------------ */
/* 시간                                                                */
/* ------------------------------------------------------------------ */

export const SLOT_INTERVAL_MINUTES = 30;
export const BUSINESS_START_MINUTES = 8 * 60;
export const BUSINESS_END_MINUTES = 24 * 60;

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return NaN;
  return hours * 60 + minutes;
}

export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const mins = (minutes % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

export function formatLessonTime(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : '';
}

export function isOnSlotInterval(lessonTime: string): boolean {
  const minutes = parseTimeToMinutes(lessonTime);
  return Number.isFinite(minutes) && minutes % SLOT_INTERVAL_MINUTES === 0;
}

/** 수업 구간을 "10:00~11:00" 으로 표기한다. */
export function formatSlotRange(lessonTime: string | null, durationMinutes: number): string {
  const start = parseTimeToMinutes(formatLessonTime(lessonTime));
  if (!Number.isFinite(start)) return formatLessonTime(lessonTime);
  return `${formatMinutesToTime(start)}~${formatMinutesToTime(start + durationMinutes)}`;
}

export type ConflictReason = '서비스 전체' | '컨설턴트' | '학생';
