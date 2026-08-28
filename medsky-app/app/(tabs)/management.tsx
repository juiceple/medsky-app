import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  ApiStateView,
  Badge,
  CardLink,
  ConsoleScroll,
  EmptyState,
  styles,
  type Tone,
} from '@/components/console';
import { ThemedText } from '@/components/themed-text';
import type { ManagementStudent, ManagementStudentsResponse } from '@/lib/api-types';
import { formatDay } from '@/lib/format';
import { useApi } from '@/lib/use-api';

/**
 * 종합 생기부 관리 — 학생 목록.
 *
 * 실장은 전체를, 컨설턴트는 담당 학생만 받는다(범위는 서버가 정한다).
 * 기본 필터를 "손이 필요한" 쪽으로 둔 것은, 목록을 여는 이유가 대부분
 * 전체 훑기가 아니라 "지금 뭘 해야 하나" 이기 때문이다.
 */

const FILTERS = [
  { key: 'attention', label: '확인 필요' },
  { key: 'active', label: '진행 중' },
  { key: 'all', label: '전체' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

/** 잔여 회차가 1회 이하이거나, 담당자가 없거나, 온보딩이 안 끝난 학생. */
function needsAttention(student: ManagementStudent): boolean {
  return (
    !student.consultant_id ||
    !student.onboarded_at ||
    (student.balance.granted > 0 && student.balance.remaining <= 1)
  );
}

function statusTone(status: string | null): Tone {
  if (status === '진행 정지') return 'rose';
  if (status === '카톡 방 입장 완료') return 'emerald';
  return 'slate';
}

export default function ManagementScreen() {
  const state = useApi<ManagementStudentsResponse>('/api/mobile/management/students');
  const [filter, setFilter] = useState<FilterKey>('attention');

  const students = useMemo(() => state.data?.students ?? [], [state.data]);

  const visible = useMemo(() => {
    if (filter === 'all') return students;
    if (filter === 'active') return students.filter((student) => student.status !== '진행 정지');
    return students.filter(needsAttention);
  }, [students, filter]);

  return (
    <ConsoleScroll state={state}>
      <ThemedText type="title">종합 생기부 관리</ThemedText>
      <ThemedText style={styles.muted}>
        {state.data?.scope === 'all' ? '전체 학생' : '담당 학생'} {students.length}명
      </ThemedText>

      <View style={styles.badgeRow}>
        {FILTERS.map((option) => (
          <Pressable key={option.key} onPress={() => setFilter(option.key)}>
            <Badge tone={filter === option.key ? 'blue' : 'slate'}>{option.label}</Badge>
          </Pressable>
        ))}
      </View>

      <ApiStateView state={state}>
        {() =>
          visible.length === 0 ? (
            <EmptyState message="해당하는 학생이 없습니다." />
          ) : (
            visible.map((student) => (
              <CardLink key={student.id} href={`/management/${student.id}`}>
                <View style={styles.cardHeader}>
                  <ThemedText style={styles.cardTitle}>{student.student_name}</ThemedText>
                  <Badge tone={student.balance.remaining <= 1 ? 'amber' : 'slate'}>
                    잔여 {student.balance.remaining}회
                  </Badge>
                </View>

                <ThemedText style={styles.muted}>
                  {[student.grade_level, student.school_name, student.service_type]
                    .filter(Boolean)
                    .join(' · ') || '정보 없음'}
                </ThemedText>

                <View style={styles.badgeRow}>
                  {student.status ? (
                    <Badge tone={statusTone(student.status)}>{student.status}</Badge>
                  ) : null}
                  {student.consultant_id ? (
                    <Badge>{student.consultantName ?? '담당 배정됨'}</Badge>
                  ) : (
                    <Badge tone="rose">미배정</Badge>
                  )}
                  {student.onboarded_at ? null : <Badge tone="amber">온보딩 전</Badge>}
                </View>

                <ThemedText style={styles.muted}>
                  최근 수업{' '}
                  {student.lastLessonDate ? formatDay(student.lastLessonDate) : '기록 없음'}
                </ThemedText>
              </CardLink>
            ))
          )
        }
      </ApiStateView>
    </ConsoleScroll>
  );
}
