import { View } from 'react-native';

import {
  ApiStateView,
  Badge,
  Card,
  ConsoleScroll,
  Field,
  NoLinkNotice,
  SectionTitle,
  styles,
} from '@/components/console';
import { ThemedText } from '@/components/themed-text';
import type { SusiProgress } from '@/lib/api-types';
import { useCustomerLinks } from '@/lib/customer-links';
import { formatDateTime, formatDay } from '@/lib/format';
import { usePublicApi } from '@/lib/use-api';

/**
 * 수시 원서 컨설팅 — 고객이 보는 진행 상황.
 *
 * 웹의 토큰 진행 페이지와 같은 내용이다. 컨설턴트 화면(`/susi/application/[id]`)과
 * 다른 API 를 쓰는 것이 중요하다 — 이쪽 응답에는 내부 메모가 애초에 실리지 않는다.
 *
 * 5단계 진행과 환불 비율은 서버가 판정한 값을 그대로 보여준다. 환불은 약관 조문을
 * 옮긴 계산이라 앱이 따로 계산하면 실제 정산과 어긋난 금액을 고객에게 보여주게 된다.
 */
export default function SusiProgressScreen() {
  const { links, loading } = useCustomerLinks();
  const token = links.susi;
  const state = usePublicApi<SusiProgress>(token ? `/api/mobile/student/susi/${token}` : null);

  if (!loading && !token) return <NoLinkNotice />;

  return (
    <ConsoleScroll state={state}>
      <ApiStateView state={state}>
        {({ application, checklist, stages, materialsDue, refund }) => (
          <>
            <ThemedText type="title">{application.studentName} 학생</ThemedText>
            <ThemedText style={styles.muted}>수시 원서 컨설팅 진행 상황</ThemedText>

            <View style={styles.badgeRow}>
              {stages.map((stage) => (
                <Badge
                  key={stage.stage}
                  tone={stage.done ? 'emerald' : stage.current ? 'blue' : 'slate'}>
                  {stage.stage}
                </Badge>
              ))}
            </View>

            <Card>
              <Field
                label="담당 컨설턴트"
                value={application.assignedConsultantName ?? '배정 준비 중'}
              />
              <Field
                label="수업"
                value={application.lessonAt ? formatDateTime(application.lessonAt) : '일정 조율 중'}
              />
              <Field
                label="자료 마감"
                value={
                  materialsDue ? `${formatDay(materialsDue.dueOn)} (${materialsDue.label})` : null
                }
              />
              <Field
                label="리포트"
                value={
                  application.reportSentAt ? formatDay(application.reportSentAt) : '컨설팅 후 전달'
                }
              />
            </Card>

            <SectionTitle hint="선택 항목은 없어도 컨설팅이 진행됩니다">준비 항목</SectionTitle>
            {checklist.map((entry) => (
              <Card key={entry.key}>
                <View style={styles.cardHeader}>
                  <ThemedText style={styles.cardTitle}>{entry.label}</ThemedText>
                  <Badge tone={entry.done ? 'emerald' : entry.optional ? 'slate' : 'amber'}>
                    {entry.done ? '제출 완료' : entry.optional ? '선택' : '준비 필요'}
                  </Badge>
                </View>
                {entry.needsAttention && entry.attentionReason ? (
                  <ThemedText style={[styles.body, { color: '#be123c' }]}>
                    {entry.attentionReason}
                  </ThemedText>
                ) : null}
              </Card>
            ))}

            <SectionTitle hint="최종 판단은 이용약관을 따릅니다">현재 환불 기준</SectionTitle>
            <Card>
              <View style={styles.cardHeader}>
                <ThemedText style={styles.cardTitle}>{refund.label}</ThemedText>
                {refund.isEstimate ? <Badge tone="amber">안내용 추정</Badge> : null}
              </View>
              <ThemedText style={styles.muted}>{refund.basis}</ThemedText>
            </Card>
          </>
        )}
      </ApiStateView>
    </ConsoleScroll>
  );
}
