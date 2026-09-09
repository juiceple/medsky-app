/**
 * 예약 캘린더가 쓰는 날짜 계산.
 *
 * medsky_homepage 의 src/lib/reservations/calendar.ts 를 그대로 옮긴 것이다.
 * 날짜는 전부 "YYYY-MM-DD" 문자열로 다루고, 연산할 때만 UTC 자정 Date 로 옮긴다 —
 * 기기 시간대에 따라 하루가 밀리는 것을 막기 위해서다.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const KST_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** KST 기준 오늘. 기기 시간대와 무관하게 한국 날짜를 돌려준다. */
export function todayInKst(now: Date = new Date()): string {
  return KST_DATE_FORMATTER.format(now);
}

function toUtcDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  return toIsoDate(new Date(toUtcDate(isoDate).getTime() + days * DAY_MS));
}

export function weekdayIndex(isoDate: string): number {
  return toUtcDate(isoDate).getUTCDay();
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function addMonths(monthValue: string, delta: number): string {
  const [year, month] = monthValue.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthStart(monthValue: string): string {
  return `${monthValue}-01`;
}

export function formatMonthLabel(monthValue: string): string {
  const [year, month] = monthValue.split('-').map(Number);
  return `${year}년 ${month}월`;
}

export function formatDayLabel(isoDate: string): string {
  const date = toUtcDate(isoDate);
  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일(${WEEKDAY_LABELS[date.getUTCDay()]})`;
}

export function dayOfMonth(isoDate: string): number {
  return toUtcDate(isoDate).getUTCDate();
}

/** 달 하나를 그리기 위한 6주치(42칸) 날짜 목록. 항상 일요일에서 시작한다. */
export function buildMonthGrid(monthValue: string): string[] {
  const first = monthStart(monthValue);
  const start = addDays(first, -weekdayIndex(first));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}
