/**
 * 표시용 서식.
 *
 * 서버가 내려주는 날짜는 두 종류다 — 달력 날짜("2027-03-14")와 시각이 있는 ISO 문자열.
 * 달력 날짜를 `new Date()` 에 그대로 넣으면 UTC 자정으로 읽혀 KST 에서는 하루 앞으로
 * 밀린다. 그래서 두 경우를 나눠 다룬다.
 */

const KST = 'Asia/Seoul';

/** "2027-03-14" → "3월 14일 (일)" */
export function formatDay(value: string | null | undefined): string {
  if (!value) return '-';

  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** "2027-03-14T10:00:00Z" → "3월 14일 (일) 19:00" (KST) */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST,
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value);
}

export function formatCurrency(value: number): string {
  return `${formatNumber(value)}원`;
}

/** 010-1234-5678. 자릿수가 예상과 다르면 원문 그대로 둔다. */
export function formatPhone(value: string | null | undefined): string | null {
  if (!value) return null;

  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;

  return value;
}
