import { View } from 'react-native';

import {
  ApiStateView,
  Badge,
  Card,
  ConsoleScroll,
  Field,
  NoLinkNotice,
  SectionTitle,
  Stat,
  StatGrid,
  styles,
} from '@/components/console';
import { ThemedText } from '@/components/themed-text';
import type { StudentPortal } from '@/lib/api-types';
import { useCustomerLinks } from '@/lib/customer-links';
import { formatDay } from '@/lib/format';
import { usePublicApi } from '@/lib/use-api';

/**
 * 종합 생기부 관리 — 학부모가 링크로 보는 진행 상황.
 *
 * 공개 처리된 회차만, 내부 메모 없이 내려온다(서버가 그렇게 자른다). 학부모가 궁금한
 * 것은 "수업이 돌고 있는가, 회차가 얼마나 남았는가" 이므로 그 둘을 맨 위에 둔다.
 */
export default function ManagementProgressScreen() {
  const { links, loading } = useCustomerLinks();
  const token = links.management;
  const state = usePublicApi<{ portal: StudentPortal }>(
    token ? `/api/mobile/student/management/${token}` : null
  );

  if (!loading && !token) return <NoLinkNotice />;

  return (
    <ConsoleScroll state={state}>
      <ApiStateView state={state}>
        {({ portal }) => (
          <>
            <ThemedText type="title">{portal.student.student_name} 학생</ThemedText>
            <ThemedText style={styles.muted}>종합 생기부 관리 진행 상황</ThemedText>

            <StatGrid>
              <Stat label="남은 회차" value={portal.balance.remaining} tone="blue" />
              <Stat label="진행한 회차" value={portal.balance.used} />
              <Stat label="전체 회차" value={portal.balance.granted} />
            </StatGrid>

            <Card>
              <Field label="담당 컨설턴트" value={portal.consultant?.name ?? '배정 예정'} />
              <Field label="계열" value={portal.consultant?.track} />
              <Field
                label="다음 수업"
                value={portal.upcoming[0] ? formatDay(portal.upcoming[0].lesson_date) : '예정 없음'}
              />
            </Card>

            <SectionTitle hint={`${portal.sessions.length}회`}>지난 수업</SectionTitle>
            {portal.sessions.length === 0 ? (
              <ThemedText style={styles.muted}>아직 공유된 수업 기록이 없습니다.</ThemedText>
            ) : (
              portal.sessions.map((session) => (
                <Card key={session.id}>
                  <View style={styles.cardHeader}>
                    <ThemedText style={styles.cardTitle}>
                      {session.display_name ?? `${session.session_round}회차`}
                    </ThemedText>
                    <Badge tone={session.status === '완료' ? 'emerald' : 'slate'}>
                      {session.status}
                    </Badge>
                  </View>
                  <ThemedText style={styles.muted}>{formatDay(session.lesson_date)}</ThemedText>
                  {session.topic ? (
                    <ThemedText style={styles.body}>{session.topic}</ThemedText>
                  ) : null}
                  {session.student_summary ? (
                    <Field label="수업 내용" value={session.student_summary} />
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
          </>
        )}
      </ApiStateView>
    </ConsoleScroll>
  );
}
