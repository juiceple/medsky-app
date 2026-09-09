import { useEffect, useState } from 'react';

import type { ClassService, ConflictReason } from '@/lib/reservation-rules';

const BASE_URL = process.env.EXPO_PUBLIC_HOMEPAGE_API_URL;

export type SlotAvailability = {
  time: string;
  available: boolean;
  reason: ConflictReason | null;
};

export type SlotAvailabilityParams = {
  lessonDate: string;
  service: ClassService;
  durationMinutes?: number;
  consultantId?: string | null;
  studentId?: string | null;
  /** 자기 예약을 옮길 때 자기 자신은 막힌 칸으로 보이지 않게 한다. */
  excludeId?: string | null;
};

/**
 * 해당 날짜에 열려 있는 시작 시각을 불러온다.
 *
 * medsky_homepage 의 GET /api/reservations/availability 는 인증이 필요 없는 공개
 * 엔드포인트라(웹의 use-slot-availability.ts 와 동일), 여기서도 Authorization 헤더
 * 없이 바로 부른다.
 */
export function useSlotAvailability({
  lessonDate,
  service,
  durationMinutes,
  consultantId,
  studentId,
  excludeId,
}: SlotAvailabilityParams) {
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonDate) {
      setSlots([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (!BASE_URL) {
      setError('EXPO_PUBLIC_HOMEPAGE_API_URL 이 설정되어 있지 않습니다.');
      setSlots([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ date: lessonDate, service });
    if (durationMinutes) params.set('durationMinutes', String(durationMinutes));
    if (consultantId) params.set('consultantId', consultantId);
    if (studentId) params.set('studentId', studentId);
    if (excludeId) params.set('excludeId', excludeId);

    fetch(`${BASE_URL}/api/reservations/availability?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((result) => {
        if (!result?.success) {
          setError(result?.error || '예약 가능 시간을 불러오지 못했습니다.');
          setSlots([]);
          return;
        }
        setSlots(result.slots ?? []);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('예약 가능 시간을 불러오지 못했습니다.');
        setSlots([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [lessonDate, service, durationMinutes, consultantId, studentId, excludeId]);

  return { slots, loading, error };
}
