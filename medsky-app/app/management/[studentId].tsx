import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import {
  ApiStateView,
  Badge,
  Card,
  ConsoleScroll,
  Field,
  SectionTitle,
  Stat,
  StatGrid,
  styles,
} from '@/components/console';
import { ThemedText } from '@/components/themed-text';
import type { ManagementStudentDetail } from '@/lib/api-types';
import { formatDay, formatDateTime, formatPhone } from '@/lib/format';
import { useApi } from '@/lib/use-api';

/**
 * 종합 생기부 관리 — 학생 상세.
 *
 * 담당 학생이 아니면 서버가 403 을 돌려준다. 앱이 목록에서 가져온 값으로 판단하지
 * 않는 이유는, 주소를 직접 열어도 같은 규칙이 걸려야 하기 때문이다.
 *
 * 내부 메모(`internal_note`)는 컨설턴트·실장 화면이므로 함께 보여준다. 학생·학부모가
 * 보는 화면(`/progress/management`, 홈의 마이페이지)은 애초에 다른 API 를 쓰고,
 * 그쪽 응답에는 내부 메모가 실리지 않는다.
 */
export default function ManagementStudentScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const state = useApi<ManagementStudentDetail>(
    studentId ? `/api/mobile/management/students/${studentId}` : null
  );

  return (
    <ConsoleScroll state={state}>
      <ApiStateView state={state}>
        {({ student, sessions, credits }) => (
          <>
            <ThemedText type="title">{student.student_name}</ThemedText>
            <View style={styles.badgeRow}>
              {student.status ? <Badge>{student.status}</Badge> : null}
              {student.service_type ? <Badge tone="blue">{student.service_type}</Badge> : null}
            </View>

            <StatGrid>
              <Stat label="남은 회차" value={student.balance.remaining} tone="blue" />
              <Stat label="진행" value={student.balance.used} />
              <Stat label="전체" value={student.balance.granted} />
            </StatGrid>

            <Card>
              <Field label="담당" value={student.consultantName ?? '미배정'} />
              <Field label="학년" value={student.grade_level} />
              <Field label="학교" value={student.school_name} />
              <Field label="목표" value={student.desired_university} />
              <Field label="희망 학과" value={student.desired_major} />
              <Field label="학생 연락처" value={formatPhone(student.student_phone)} />
              <Field label="학부모" value={formatPhone(student.parent_phone)} />
              <Field
                label="온보딩"
                value={student.onboarded_at ? formatDay(student.onboarded_at) : '미완료'}
              />
            </Card>

            <SectionTitle hint={`${sessions.length}회`}>수업 이력</SectionTitle>
            {sessions.length === 0 ? (
              <ThemedText style={styles.muted}>기록된 수업이 없습니다.</ThemedText>
            ) : (
              sessions.map((session) => (
                <Card key={session.id}>
                  <View style={styles.cardHeader}>
                    <ThemedText style={styles.cardTitle}>
                      {session.display_name ?? `${session.session_round}회차`}
                    </ThemedText>
                    <Badge
                      tone={
                        session.status === '완료'
                          ? 'emerald'
                          : session.status === '노쇼'
                            ? 'rose'
                            : 'slate'
                      }>
                      {session.status}
                    </Badge>
                  </View>

                  <ThemedText style={styles.muted}>
                    {formatDay(session.lesson_date)} · 차감 {session.deducted_round}회
                  </ThemedText>

                  {session.topic ? (
                    <ThemedText style={styles.body}>{session.topic}</ThemedText>
                  ) : null}
                  {session.student_summary ? (
                    <Field label="학생 공유" value={session.student_summary} />
                  ) : null}
                  {session.internal_note ? (
                    <Field label="내부 메모" value={session.internal_note} />
                  ) : null}
                  {session.next_action ? (
                    <Field label="다음 할 일" value={session.next_action} />
                  ) : null}

                  {session.materials.length > 0 ? (
                    <Field
                      label="자료"
                      value={session.materials.map((material) => material.title).join(', ')}
                    />
                  ) : null}
                </Card>
              ))
            )}

            <SectionTitle hint="결제 · 차감 내역">회차 원장</SectionTitle>
            {credits.length === 0 ? (
              <ThemedText style={styles.muted}>내역이 없습니다.</ThemedText>
            ) : (
              credits.map((entry) => (
                <Card key={entry.id}>
                  <View style={styles.cardHeader}>
                    <ThemedText style={styles.cardTitle}>{entry.kind}</ThemedText>
                    <Badge tone={entry.amount >= 0 ? 'emerald' : 'slate'}>
                      {entry.amount > 0 ? `+${entry.amount}` : entry.amount}회
                    </Badge>
                  </View>
                  <ThemedText style={styles.muted}>
                    {formatDateTime(entry.created_at)}
                    {entry.memo ? ` · ${entry.memo}` : ''}
                  </ThemedText>
                </Card>
              ))
            )}
          </>
        )}
      </ApiStateView>
    </ConsoleScroll>
  );
}
