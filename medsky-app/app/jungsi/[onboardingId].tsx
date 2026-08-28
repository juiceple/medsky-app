import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import {
  ApiStateView,
  Badge,
  Card,
  ConsoleScroll,
  Field,
  SectionTitle,
  styles,
} from '@/components/console';
import { ThemedText } from '@/components/themed-text';
import type { JungsiOnboardingDetail } from '@/lib/api-types';
import { formatDay, formatPhone } from '@/lib/format';
import { useApi } from '@/lib/use-api';

/**
 * 정시 원서 컨설팅 — 온보딩 상세.
 *
 * 4단계(정보 입력 · 자료 · 동의 · 일정) 판정과 자료 마감일은 서버가 계산해 내려준다.
 * 앱에서 다시 계산하면 "수업일 3일 전" 같은 규정이 두 곳으로 갈라진다.
 */
export default function JungsiOnboardingScreen() {
  const { onboardingId } = useLocalSearchParams<{ onboardingId: string }>();
  const state = useApi<JungsiOnboardingDetail>(
    onboardingId ? `/api/mobile/jungsi/onboardings/${onboardingId}` : null
  );

  return (
    <ConsoleScroll state={state}>
      <ApiStateView state={state}>
        {({ onboarding, steps, sla, documentDueOn }) => (
          <>
            <ThemedText type="title">
              {onboarding.student_name ?? onboarding.buyer_name ?? '이름 미입력'}
            </ThemedText>
            <View style={styles.badgeRow}>
              <Badge tone={onboarding.canceled_at ? 'rose' : 'slate'}>
                {onboarding.canceled_at ? '취소' : onboarding.status}
              </Badge>
              {sla.waitingHours !== null ? (
                <Badge tone={sla.level === '지연' ? 'rose' : sla.level === '주의' ? 'amber' : 'slate'}>
                  배정 대기 {Math.floor(sla.waitingHours)}시간
                </Badge>
              ) : null}
            </View>

            <SectionTitle hint="고객이 끝내야 하는 순서">진행 단계</SectionTitle>
            {steps.map((step) => (
              <Card key={step.step}>
                <View style={styles.cardHeader}>
                  <ThemedText style={styles.cardTitle}>{step.label}</ThemedText>
                  <Badge tone={step.done ? 'emerald' : 'amber'}>
                    {step.done ? '완료' : '진행 중'}
                  </Badge>
                </View>
                {step.blocker ? (
                  <ThemedText style={styles.muted}>{step.blocker}</ThemedText>
                ) : null}
              </Card>
            ))}

            <SectionTitle>기본 정보</SectionTitle>
            <Card>
              <Field label="담당" value={onboarding.consultant_name ?? '배정 대기'} />
              <Field
                label="수업"
                value={
                  onboarding.lesson_date
                    ? `${formatDay(onboarding.lesson_date)} ${onboarding.lesson_time ?? ''}`.trim()
                    : '일정 미정'
                }
              />
              <Field label="자료 마감" value={documentDueOn ? formatDay(documentDueOn) : null} />
              <Field label="학교" value={onboarding.high_school} />
              <Field label="학년" value={onboarding.grade_level} />
              <Field label="계열" value={onboarding.track} />
              <Field label="희망 대학" value={onboarding.desired_schools} />
              <Field label="희망 학과" value={onboarding.desired_majors} />
              <Field label="학생 연락처" value={formatPhone(onboarding.student_phone)} />
              <Field label="학부모" value={formatPhone(onboarding.parent_phone)} />
              <Field label="문의" value={onboarding.questions} />
              <Field label="요청사항" value={onboarding.extra_requests} />
              <Field
                label="접수 마감"
                value={
                  onboarding.application_deadline
                    ? formatDay(onboarding.application_deadline)
                    : null
                }
              />
            </Card>

            <SectionTitle hint={`${onboarding.files.length}개`}>제출 자료</SectionTitle>
            {onboarding.files.length === 0 ? (
              <ThemedText style={styles.muted}>올라온 자료가 없습니다.</ThemedText>
            ) : (
              onboarding.files.map((file) => (
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
                  {file.original_name ? (
                    <ThemedText style={styles.muted}>{file.original_name}</ThemedText>
                  ) : null}
                  {file.check_note ? (
                    <ThemedText style={styles.body}>{file.check_note}</ThemedText>
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
