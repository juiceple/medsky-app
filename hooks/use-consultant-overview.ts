import { useCallback, useEffect, useState } from 'react';

import { getReservations } from '@/lib/management-api';
import type { ReservationView, StudentSummary } from '@/lib/management-types';

/** 예약을 여러 학생에 걸쳐 한 번에 모을 때 동시에 조회할 학생 수 상한. */
const MAX_STUDENTS = 60;

const CANCELLED_STATUSES = new Set<ReservationView['status']>(['취소', '예약자 취소']);

export type TodayClass = {
  studentId: string;
  studentName: string;
  reservation: ReservationView;
};

export type UnwrittenRecord = {
  studentId: string;
  studentName: string;
  reservation: ReservationView;
};

export type WeekScheduleEntry = {
  studentId: string;
  studentName: string;
  reservation: ReservationView;
};

type OverviewState =
  | { status: 'loading' }
  | { status: 'ready'; data: ConsultantOverview }
  | { status: 'error' };

export type ConsultantOverview = {
  /** 오늘 남은 수업 중 가장 이른 것 (취소/완료/노쇼 제외). */
  todayClass: TodayClass | null;
  /** 완료 처리됐지만 회차 기록이 아직 없는 예약 — "수업 기록 미작성" 할 일. */
  unwrittenRecords: UnwrittenRecord[];
  /** 이번 주(일~토) 예약 — PC 레이아웃의 "이번 주 일정" 패널용. */
  weekSchedule: WeekScheduleEntry[];
  /** 이번 달 완료된 회차 수(차감 회차 합) — 마이페이지 통계 카드용. */
  roundsThisMonth: number;
  /** 학생 수가 많아 일부만 집계했는지. */
  truncated: boolean;
};

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function endOfWeek(date: Date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * 담당 학생 명부를 기준으로 예약을 모아 "오늘 수업" 히어로 카드, "수업 기록
 * 미작성" 할 일, PC의 "이번 주 일정" 패널에 쓸 데이터를 계산한다.
 *
 * `/api/mobile/management/students/:id/reservations` 가 학생 단위로만 있어서
 * 여러 학생 걸친 집계 API가 따로 없다 — 명부를 돌며 병렬로 모은다. 학생이
 * 아주 많은 실장 계정에서는 `MAX_STUDENTS`로 상한을 두고 truncated 로 표시한다.
 */
export function useConsultantOverview(students: StudentSummary[] | null) {
  const [state, setState] = useState<OverviewState>({ status: 'loading' });

  const load = useCallback(async () => {
    if (!students) return;
    if (students.length === 0) {
      setState({
        status: 'ready',
        data: { todayClass: null, unwrittenRecords: [], weekSchedule: [], roundsThisMonth: 0, truncated: false },
      });
      return;
    }

    const truncated = students.length > MAX_STUDENTS;
    const targets = truncated ? students.slice(0, MAX_STUDENTS) : students;

    try {
      const results = await Promise.allSettled(
        targets.map(async (student) => ({
          student,
          reservations: (await getReservations(student.id)).reservations,
        }))
      );

      const now = new Date();
      const todayKey = now.toDateString();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      const monthKey = `${now.getFullYear()}-${now.getMonth()}`;

      let todayClass: TodayClass | null = null;
      const unwrittenRecords: UnwrittenRecord[] = [];
      const weekSchedule: WeekScheduleEntry[] = [];
      let roundsThisMonth = 0;

      for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        const { student, reservations } = result.value;

        for (const reservation of reservations) {
          const lessonDate = new Date(`${reservation.lessonDate}T${reservation.lessonTime ?? '00:00'}`);
          if (Number.isNaN(lessonDate.getTime())) continue;

          if (
            reservation.lessonDate &&
            new Date(reservation.lessonDate).toDateString() === todayKey &&
            !CANCELLED_STATUSES.has(reservation.status) &&
            reservation.status !== '완료' &&
            reservation.status !== '노쇼'
          ) {
            if (!todayClass || lessonDate < new Date(`${todayClass.reservation.lessonDate}T${todayClass.reservation.lessonTime ?? '00:00'}`)) {
              todayClass = { studentId: student.id, studentName: student.student_name, reservation };
            }
          }

          if (reservation.status === '완료' && !reservation.lessonSessionId) {
            unwrittenRecords.push({ studentId: student.id, studentName: student.student_name, reservation });
          }

          if (
            lessonDate >= weekStart &&
            lessonDate <= weekEnd &&
            !CANCELLED_STATUSES.has(reservation.status)
          ) {
            weekSchedule.push({ studentId: student.id, studentName: student.student_name, reservation });
          }

          const key = `${lessonDate.getFullYear()}-${lessonDate.getMonth()}`;
          if (reservation.status === '완료' && key === monthKey) {
            roundsThisMonth += reservation.deductedRound;
          }
        }
      }

      unwrittenRecords.sort((a, b) => a.reservation.lessonDate.localeCompare(b.reservation.lessonDate));
      weekSchedule.sort((a, b) => a.reservation.lessonDate.localeCompare(b.reservation.lessonDate));

      setState({
        status: 'ready',
        data: { todayClass, unwrittenRecords, weekSchedule, roundsThisMonth, truncated },
      });
    } catch {
      setState({ status: 'error' });
    }
  }, [students]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
