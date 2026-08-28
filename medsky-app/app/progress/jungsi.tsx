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
import type { JungsiProgress } from '@/lib/api-types';
import { useCustomerLinks } from '@/lib/customer-links';
import { formatDay } from '@/lib/format';
import { usePublicApi } from '@/lib/use-api';

/**
 * 정시 원서 컨설팅 — 고객이 보는 진행 상황.
 *
 * 웹의 토큰 온보딩 페이지와 같은 내용을 읽기 전용으로 보여준다. 자료 업로드와 동의는
 * 앱에서 하지 않는다 — 생기부·성적표 파일 업로드와 약관 동의는 웹 화면에서 하고,
 * 여기서는 "지금 무엇이 남았는가" 를 확인한다.
 */
export default function JungsiProgressScreen() {
  const { links, loading } = useCustomerLinks();
  const token = links.jungsi;
  const state = usePublicApi<JungsiProgress>(
    token ? `/api/mobile/student/jungsi/${token}` : null
  );

  if (!loading && !token) return <NoLinkNotice />;

  return (
    <ConsoleScroll state={state}>
      <ApiStateView state={state}>
        {({ onboarding, steps, journey, documentDueOn }) => (
          <>
            <ThemedText type="title">
              {onboarding.student_name ?? onboarding.buyer_name ?? '고객'}님
            </ThemedText>
            <ThemedText style={styles.muted}>정시 원서 컨설팅 진행 상황</ThemedText>

            {onboarding.canceled_at ? (
              <Card>
                <ThemedText style={styles.cardTitle}>취소된 건입니다</ThemedText>
                <ThemedText style={styles.muted}>
                  문의사항이 있으시면 담당 실장에게 연락해 주세요.
                </ThemedText>
              </Card>
            ) : null}

            <View style={styles.badgeRow}>
              {journey.map((phase) => (
                <Badge
                  key={phase.key}
                  tone={phase.done ? 'emerald' : phase.current ? 'blue' : 'slate'}>
                  {phase.label}
                </Badge>
              ))}
            </View>

            <Card>
              <Field
                label="담당 컨설턴트"
                value={onboarding.consultant_name ?? '배정 준비 중'}
              />
              <Field
                label="수업"
                value={
                  onboarding.lesson_date
                    ? `${formatDay(onboarding.lesson_date)} ${onboarding.lesson_time ?? ''}`.trim()
                    : '일정 조율 중'
                }
              />
              <Field label="자료 마감" value={documentDueOn ? formatDay(documentDueOn) : null} />
              <Field
                label="리포트"
                value={
                  onboarding.report_sent_at
                    ? formatDay(onboarding.report_sent_at)
                    : '컨설팅 후 전달'
                }
              />
            </Card>

            <SectionTitle hint="자료 업로드와 약관 동의는 웹 링크에서 진행합니다">
              남은 준비
            </SectionTitle>
            {steps.map((step) => (
              <Card key={step.step}>
                <View style={styles.cardHeader}>
                  <ThemedText style={styles.cardTitle}>{step.label}</ThemedText>
                  <Badge tone={step.done ? 'emerald' : 'amber'}>
                    {step.done ? '완료' : '준비 필요'}
                  </Badge>
                </View>
                {step.blocker ? (
                  <ThemedText style={styles.muted}>{step.blocker}</ThemedText>
                ) : null}
              </Card>
            ))}

            {onboarding.files.length > 0 ? (
              <>
                <SectionTitle>제출한 자료</SectionTitle>
                {onboarding.files.map((file) => (
                  <Card key={file.id}>
                    <View style={styles.cardHeader}>
                      <ThemedText style={styles.cardTitle}>{file.kind}</ThemedText>
                      <Badge
                        tone={
                          file.check_result === '정상'
                            ? 'emerald'
                            : file.check_result === '재발급 필요'
                              ? 'rose'
                              : 'amber'
                        }>
                        {file.check_result}
                      </Badge>
                    </View>
                    {file.check_note ? (
                      <ThemedText style={styles.body}>{file.check_note}</ThemedText>
                    ) : null}
                  </Card>
                ))}
              </>
            ) : null}
          </>
        )}
      </ApiStateView>
    </ConsoleScroll>
  );
}
