import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import {
  ApiStateView,
  Badge,
  Card,
  CardLink,
  ConsoleScroll,
  Field,
  SectionTitle,
  Stat,
  StatGrid,
  styles,
} from '@/components/console';
import { ThemedText } from '@/components/themed-text';
import type { ManagementOverview, StudentPortal } from '@/lib/api-types';
import { LINK_LABELS, LINK_KINDS, useCustomerLinks } from '@/lib/customer-links';
import { formatDay } from '@/lib/format';
import { useApi } from '@/lib/use-api';
import { useViewer } from '@/lib/viewer-context';

/**
 * 홈. 로그인한 사람이 누구냐에 따라 완전히 다른 화면이 된다.
 *
 *   실장       → 종합 생기부 관리 대시보드(가장 먼저 보는 운영 지표)
 *   컨설턴트   → 담당 서비스 콘솔로 넘어가는 입구
 *   학생       → 내 수업 진행 상황
 *   그 외      → 알림톡 링크를 연결하라는 안내
 *
 * 역할별로 탭을 따로 만들지 않고 한 화면에서 갈라놓은 것은, 한 사람이 두 역할을
 * 겸하는 경우(컨설턴트이면서 실장 대행 등)가 실제로 있기 때문이다.
 */
export default function HomeScreen() {
  const viewer = useViewer();

  return (
    <ConsoleScroll state={viewer}>
      <ApiStateView state={viewer}>
        {(me) => (
          <>
            <ThemedText type="title">
              {me.name ?? me.email ?? '회원'}님
            </ThemedText>
            <View style={styles.badgeRow}>
              <Badge tone="blue">{ROLE_LABEL[me.role]}</Badge>
              {me.services.map((service) => (
                <Badge key={service}>{service}</Badge>
              ))}
            </View>

            {me.role === 'manager' ? <ManagerHome /> : null}
            {me.role === 'consultant' ? <ConsultantHome sections={me.sections} /> : null}
            {me.studentId ? <StudentHome /> : null}

            <CustomerLinkCards />

            {me.role === 'none' && !me.studentId ? (
              <Card>
                <ThemedText style={styles.cardTitle}>연결된 진행 건이 없습니다</ThemedText>
                <ThemedText style={styles.muted}>
                  수시 · 정시 원서 컨설팅을 결제하셨다면 알림톡으로 받은 진행 링크를
                  연결해 주세요. 담당자 계정이라면 회사에 등록된 이메일로 로그인해야
                  콘솔이 열립니다.
                </ThemedText>
              </Card>
            ) : null}
          </>
        )}
      </ApiStateView>
    </ConsoleScroll>
  );
}

const ROLE_LABEL: Record<string, string> = {
  manager: '실장 · 관리자',
  consultant: '컨설턴트',
  student: '학생',
  none: '회원',
};

/** 실장이 앱을 여는 이유는 대부분 "지금 손이 필요한 곳이 어디인가" 다. */
function ManagerHome() {
  const state = useApi<ManagementOverview>('/api/mobile/management/overview');

  return (
    <ApiStateView state={state}>
      {({ overview, stalled }) => (
        <>
          <SectionTitle hint="종합 생기부 관리">이번 달 현황</SectionTitle>
          <StatGrid>
            <Stat label="진행 중 학생" value={overview.activeStudents} />
            <Stat
              label="미배정"
              value={overview.unassigned}
              tone={overview.unassigned > 0 ? 'rose' : undefined}
            />
            <Stat
              label="잔여 1회 이하"
              value={overview.lowCredit}
              tone={overview.lowCredit > 0 ? 'amber' : undefined}
            />
            <Stat label="이번 달 회차" value={overview.roundsThisMonth} />
            <Stat label="이번 달 수업" value={overview.sessionsThisMonth} />
            <Stat
              label="정체"
              value={overview.stalled}
              tone={overview.stalled > 0 ? 'rose' : undefined}
            />
          </StatGrid>

          {stalled.length > 0 ? (
            <>
              <SectionTitle hint="잔여 회차가 남았는데 오래 진행되지 않은 학생">
                먼저 확인할 학생
              </SectionTitle>
              {stalled.slice(0, 5).map((student) => (
                <CardLink key={student.id} href={`/management/${student.id}`}>
                  <View style={styles.cardHeader}>
                    <ThemedText style={styles.cardTitle}>{student.name}</ThemedText>
                    <Badge tone="rose">{student.daysSinceLastLesson ?? 0}일 정체</Badge>
                  </View>
                  <ThemedText style={styles.muted}>
                    {student.consultantName ?? '미배정'} · 잔여 {student.remaining}회 · 최근 수업{' '}
                    {student.lastLessonDate ? formatDay(student.lastLessonDate) : '없음'}
                  </ThemedText>
                </CardLink>
              ))}
            </>
          ) : null}
        </>
      )}
    </ApiStateView>
  );
}

const SECTION_HOME: Record<string, { href: '/management' | '/susi' | '/jungsi'; label: string }> = {
  management: { href: '/management', label: '종합 생기부 관리' },
  susi: { href: '/susi', label: '수시 원서 컨설팅' },
  jungsi: { href: '/jungsi', label: '정시 원서 컨설팅' },
};

function ConsultantHome({ sections }: { sections: string[] }) {
  if (sections.length === 0) {
    return (
      <Card>
        <ThemedText style={styles.cardTitle}>담당 서비스가 아직 없습니다</ThemedText>
        <ThemedText style={styles.muted}>
          컨설턴트 명부에 담당 서비스가 등록되면 해당 콘솔이 탭에 나타납니다. 실장에게
          문의해 주세요.
        </ThemedText>
      </Card>
    );
  }

  return (
    <>
      <SectionTitle hint="내가 맡은 것만 보입니다">담당 콘솔</SectionTitle>
      {sections.map((section) => {
        const target = SECTION_HOME[section];
        if (!target) return null;

        return (
          <CardLink key={section} href={target.href}>
            <ThemedText style={styles.cardTitle}>{target.label}</ThemedText>
            <ThemedText style={styles.muted}>담당 학생과 진행 상황을 봅니다.</ThemedText>
          </CardLink>
        );
      })}
    </>
  );
}

/** 종합 생기부 관리 학생의 마이페이지. 공개 처리된 회차만 내려온다. */
function StudentHome() {
  const state = useApi<{ portal: StudentPortal | null }>('/api/mobile/student/home');

  return (
    <ApiStateView state={state}>
      {({ portal }) =>
        portal ? (
          <>
            <SectionTitle hint="종합 생기부 관리">내 수업</SectionTitle>
            <StatGrid>
              <Stat label="남은 회차" value={portal.balance.remaining} tone="blue" />
              <Stat label="진행한 회차" value={portal.balance.used} />
              <Stat label="전체 회차" value={portal.balance.granted} />
            </StatGrid>

            <Card>
              <Field label="담당 컨설턴트" value={portal.consultant?.name ?? '배정 예정'} />
              <Field label="목표" value={portal.student.desired_university} />
              <Field
                label="다음 수업"
                value={
                  portal.upcoming[0] ? formatDay(portal.upcoming[0].lesson_date) : '예정 없음'
                }
              />
            </Card>

            {portal.sessions.length > 0 ? (
              <>
                <SectionTitle>지난 수업</SectionTitle>
                {portal.sessions.slice(0, 5).map((session) => (
                  <Card key={session.id}>
                    <View style={styles.cardHeader}>
                      <ThemedText style={styles.cardTitle}>
                        {session.display_name ?? `${session.session_round}회차`}
                      </ThemedText>
                      <ThemedText style={styles.muted}>
                        {formatDay(session.lesson_date)}
                      </ThemedText>
                    </View>
                    {session.topic ? (
                      <ThemedText style={styles.body}>{session.topic}</ThemedText>
                    ) : null}
                    {session.student_summary ? (
                      <ThemedText style={styles.muted}>{session.student_summary}</ThemedText>
                    ) : null}
                    {session.next_action ? (
                      <ThemedText style={styles.body}>다음 할 일 · {session.next_action}</ThemedText>
                    ) : null}
                  </Card>
                ))}
              </>
            ) : null}
          </>
        ) : null
      }
    </ApiStateView>
  );
}

const LINK_ROUTES = {
  susi: '/progress/susi',
  jungsi: '/progress/jungsi',
  management: '/progress/management',
} as const;

/** 알림톡 링크로 보는 진행 건. 계정과 무관하므로 누구에게나 보인다. */
function CustomerLinkCards() {
  const { links } = useCustomerLinks();
  const connected = LINK_KINDS.filter((kind) => links[kind]);

  return (
    <>
      <SectionTitle hint="알림톡으로 받은 링크">내 진행 상황</SectionTitle>
      {connected.map((kind) => (
        <CardLink key={kind} href={LINK_ROUTES[kind]}>
          <ThemedText style={styles.cardTitle}>{LINK_LABELS[kind]}</ThemedText>
          <ThemedText style={styles.muted}>진행 상황 보기</ThemedText>
        </CardLink>
      ))}

      <Link href="/progress/connect" asChild>
        <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
          <ThemedText style={styles.cardTitle}>
            {connected.length > 0 ? '링크 관리' : '진행 링크 연결'}
          </ThemedText>
          <ThemedText style={styles.muted}>
            결제 후 받은 링크를 넣으면 로그인 없이 진행 상황을 볼 수 있습니다.
          </ThemedText>
        </Pressable>
      </Link>
    </>
  );
}
