import { View } from 'react-native';

import {
  ApiStateView,
  Badge,
  CardLink,
  ConsoleScroll,
  EmptyState,
  SectionTitle,
  styles,
} from '@/components/console';
import { ThemedText } from '@/components/themed-text';
import type { JungsiOnboardingsResponse, MatchingSla } from '@/lib/api-types';
import { formatDay } from '@/lib/format';
import { useApi } from '@/lib/use-api';

/**
 * 정시 원서 컨설팅 — 온보딩 진행 건.
 *
 * 목록 맨 위에 배정 대기를 따로 세워 둔다. 자료가 다 들어왔는데 배정이 안 된 구간은
 * 환불 규정상 "컨설턴트 배정 전 = 100% 환불" 이라 방치가 그대로 손실이 된다.
 * SLA 판정(주의 24h / 지연 48h)은 서버가 계산해 내려준 값을 그대로 쓴다.
 */

function slaBadge(sla: MatchingSla) {
  if (sla.waitingHours === null) return null;

  const hours = Math.floor(sla.waitingHours);
  const tone = sla.level === '지연' ? 'rose' : sla.level === '주의' ? 'amber' : 'slate';

  return <Badge tone={tone}>배정 대기 {hours}시간</Badge>;
}

export default function JungsiScreen() {
  const state = useApi<JungsiOnboardingsResponse>('/api/mobile/jungsi/onboardings');

  return (
    <ConsoleScroll state={state}>
      <ThemedText type="title">정시 원서 컨설팅</ThemedText>

      <ApiStateView state={state}>
        {(data) => {
          // 배정을 기다리는 건이 위로. 그 안에서는 오래 기다린 순서다.
          const waiting = data.rows
            .filter((row) => row.sla.waitingHours !== null)
            .sort((a, b) => (b.sla.waitingHours ?? 0) - (a.sla.waitingHours ?? 0));
          const rest = data.rows.filter((row) => row.sla.waitingHours === null);

          if (data.rows.length === 0) {
            return <EmptyState message="진행 중인 온보딩이 없습니다." />;
          }

          return (
            <>
              <ThemedText style={styles.muted}>
                {data.scope === 'all' ? '전체' : '담당'} {data.rows.length}건
              </ThemedText>

              {waiting.length > 0 ? (
                <>
                  <SectionTitle hint="자료는 다 왔는데 담당자가 아직 없습니다">
                    배정 대기 {waiting.length}건
                  </SectionTitle>
                  {waiting.map((row) => (
                    <OnboardingCard key={row.onboarding.id} row={row} />
                  ))}
                </>
              ) : null}

              {rest.length > 0 ? (
                <>
                  <SectionTitle>진행 중</SectionTitle>
                  {rest.map((row) => (
                    <OnboardingCard key={row.onboarding.id} row={row} />
                  ))}
                </>
              ) : null}
            </>
          );
        }}
      </ApiStateView>
    </ConsoleScroll>
  );
}

function OnboardingCard({ row }: { row: JungsiOnboardingsResponse['rows'][number] }) {
  const { onboarding, sla } = row;
  const name = onboarding.student_name ?? onboarding.buyer_name ?? '이름 미입력';

  return (
    <CardLink href={`/jungsi/${onboarding.id}`}>
      <View style={styles.cardHeader}>
        <ThemedText style={styles.cardTitle}>{name}</ThemedText>
        <Badge tone={onboarding.canceled_at ? 'rose' : 'slate'}>
          {onboarding.canceled_at ? '취소' : onboarding.status}
        </Badge>
      </View>

      <ThemedText style={styles.muted}>
        {[onboarding.high_school, onboarding.grade_level, onboarding.track]
          .filter(Boolean)
          .join(' · ') || '정보 없음'}
      </ThemedText>

      <View style={styles.badgeRow}>
        {slaBadge(sla)}
        {onboarding.consultant_name ? (
          <Badge>{onboarding.consultant_name}</Badge>
        ) : (
          <Badge tone="rose">미배정</Badge>
        )}
        <Badge tone={onboarding.materials_ready_at ? 'emerald' : 'amber'}>
          자료 {onboarding.materials_ready_at ? '완료' : '대기'}
        </Badge>
        {onboarding.report_sent_at ? <Badge tone="emerald">리포트 전달</Badge> : null}
      </View>

      <ThemedText style={styles.muted}>
        수업{' '}
        {onboarding.lesson_date
          ? `${formatDay(onboarding.lesson_date)} ${onboarding.lesson_time ?? ''}`.trim()
          : '일정 미정'}
      </ThemedText>
    </CardLink>
  );
}
