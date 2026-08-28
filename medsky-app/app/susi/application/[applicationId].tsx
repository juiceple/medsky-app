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
import type { ChecklistEntry, SusiApplicationDetail } from '@/lib/api-types';
import { formatDateTime, formatDay, formatPhone } from '@/lib/format';
import { useApi } from '@/lib/use-api';

/**
 * 수시 원서 컨설팅 — 진행 건 상세.
 *
 * 제출 체크리스트가 화면의 중심이다. 이 상품에서 가장 자주 막히는 곳이 자료 왕복이라,
 * "무엇이 비었고 무엇이 다시 필요한가" 를 맨 위에 둔다. 재발급 사유(`attentionReason`)는
 * 서버가 이미 문장으로 만들어 주므로 그대로 보여준다.
 */
export default function SusiApplicationScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const state = useApi<SusiApplicationDetail>(
    applicationId ? `/api/mobile/susi/applications/${applicationId}` : null
  );

  return (
    <ConsoleScroll state={state}>
      <ApiStateView state={state}>
        {({ application, checklist, submission, materialsDue, reportDue, timeline }) => (
          <>
            <ThemedText type="title">{application.studentName}</ThemedText>
            <View style={styles.badgeRow}>
              <Badge>{application.status}</Badge>
              <Badge tone={submission.complete ? 'emerald' : 'amber'}>
                자료 {submission.done}/{submission.total}
              </Badge>
              {materialsDue ? (
                <Badge tone={materialsDue.overdue ? 'rose' : 'amber'}>
                  자료 마감 {materialsDue.label}
                </Badge>
              ) : null}
              {reportDue ? (
                <Badge tone={reportDue.overdue ? 'rose' : 'amber'}>
                  리포트 {reportDue.label}
                </Badge>
              ) : null}
            </View>

            <Card>
              <Field label="담당" value={application.assignedConsultantName ?? '배정 대기'} />
              <Field
                label="수업"
                value={application.lessonAt ? formatDateTime(application.lessonAt) : '일정 미정'}
              />
              <Field label="학교" value={application.highSchool} />
              <Field label="학년" value={application.gradeLevel} />
              <Field label="희망 대학" value={application.targetUniversities} />
              <Field label="희망 학과" value={application.desiredMajor} />
              <Field label="학생 연락처" value={formatPhone(application.studentPhone)} />
              <Field label="학부모" value={formatPhone(application.parentPhone)} />
              <Field
                label="접수 마감"
                value={
                  application.applicationDeadline
                    ? formatDay(application.applicationDeadline)
                    : null
                }
              />
              <Field label="요청사항" value={application.requestNote} />
            </Card>

            <SectionTitle hint="선택 항목은 진행률에 포함되지 않습니다">제출 항목</SectionTitle>
            {checklist.map((entry) => (
              <ChecklistCard key={entry.key} entry={entry} />
            ))}

            {timeline.length > 0 ? (
              <>
                <SectionTitle>진행 기록</SectionTitle>
                {timeline.map((entry) => (
                  <Card key={entry.id}>
                    <View style={styles.cardHeader}>
                      <ThemedText style={styles.cardTitle}>{entry.event}</ThemedText>
                      <Badge>{entry.actor}</Badge>
                    </View>
                    <ThemedText style={styles.muted}>
                      {formatDateTime(entry.occurredAt)}
                    </ThemedText>
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

function ChecklistCard({ entry }: { entry: ChecklistEntry }) {
  return (
    <Card>
      <View style={styles.cardHeader}>
        <ThemedText style={styles.cardTitle}>{entry.label}</ThemedText>
        <Badge tone={entry.done ? (entry.verified ? 'emerald' : 'blue') : 'slate'}>
          {entry.done ? (entry.verified ? '확인 완료' : '제출됨') : '미제출'}
        </Badge>
      </View>

      {entry.optional ? <ThemedText style={styles.muted}>선택 항목</ThemedText> : null}
      {entry.fileName ? <ThemedText style={styles.muted}>{entry.fileName}</ThemedText> : null}
      {entry.needsAttention && entry.attentionReason ? (
        <ThemedText style={[styles.body, { color: '#be123c' }]}>
          {entry.attentionReason}
        </ThemedText>
      ) : null}
    </Card>
  );
}
