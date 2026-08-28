import { useState } from 'react';
import { Pressable, View } from 'react-native';

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
import type {
  SusiApplicationRow,
  SusiApplicationsResponse,
  SusiStudentsResponse,
} from '@/lib/api-types';
import { formatDateTime } from '@/lib/format';
import { useApi } from '@/lib/use-api';

/**
 * 수시 원서 컨설팅.
 *
 * 축이 둘이라 화면도 둘로 나눈다(웹 `/consultant/susi` 와 같은 구분).
 *   ① 진행 건 — 결제 이후 자료 · 일정 · 리포트가 굴러가는 단위
 *   ② 담당 학생 — 올해 원서를 함께 짜는 단위. 대학 매칭 보고서가 붙는다
 * 한 사람이 양쪽에 다 있을 수도, 한쪽에만 있을 수도 있어(진행 건은 결제에서,
 * 학생은 상담 폼에서 만들어진다) 억지로 합치지 않는다.
 */

const TABS = [
  { key: 'applications', label: '진행 건' },
  { key: 'students', label: '담당 학생' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function SusiScreen() {
  const [tab, setTab] = useState<TabKey>('applications');

  return tab === 'applications' ? (
    <ApplicationsTab tab={tab} onChangeTab={setTab} />
  ) : (
    <StudentsTab tab={tab} onChangeTab={setTab} />
  );
}

function TabBar({ tab, onChangeTab }: { tab: TabKey; onChangeTab: (next: TabKey) => void }) {
  return (
    <>
      <ThemedText type="title">수시 원서 컨설팅</ThemedText>
      <View style={styles.badgeRow}>
        {TABS.map((option) => (
          <Pressable key={option.key} onPress={() => onChangeTab(option.key)}>
            <Badge tone={tab === option.key ? 'blue' : 'slate'}>{option.label}</Badge>
          </Pressable>
        ))}
      </View>
    </>
  );
}

/** 진행 건 한 줄. 실장 버킷과 컨설턴트 목록이 같은 모양을 쓴다. */
function ApplicationCard({ row }: { row: SusiApplicationRow }) {
  const { application, submission, materialsDue, reportDue } = row;

  return (
    <CardLink href={`/susi/application/${application.id}`}>
      <View style={styles.cardHeader}>
        <ThemedText style={styles.cardTitle}>{application.studentName}</ThemedText>
        <Badge>{application.status}</Badge>
      </View>

      <ThemedText style={styles.muted}>
        {[application.highSchool, application.gradeLevel, application.desiredMajor]
          .filter(Boolean)
          .join(' · ') || '정보 없음'}
      </ThemedText>

      <View style={styles.badgeRow}>
        <Badge tone={submission.complete ? 'emerald' : 'amber'}>
          자료 {submission.done}/{submission.total}
        </Badge>
        {application.assignedConsultantName ? (
          <Badge>{application.assignedConsultantName}</Badge>
        ) : (
          <Badge tone="rose">배정 대기</Badge>
        )}
        {materialsDue ? (
          <Badge tone={materialsDue.overdue ? 'rose' : 'amber'}>자료 {materialsDue.label}</Badge>
        ) : null}
        {reportDue ? (
          <Badge tone={reportDue.overdue ? 'rose' : 'amber'}>리포트 {reportDue.label}</Badge>
        ) : null}
      </View>

      <ThemedText style={styles.muted}>
        수업 {application.lessonAt ? formatDateTime(application.lessonAt) : '일정 미정'}
      </ThemedText>
    </CardLink>
  );
}

/**
 * 실장 콘솔은 "손이 필요한 순서" 로 묶인 버킷을 그대로 받는다. 앱에서 다시 묶으면
 * 자료 위험 판정(D-5) 같은 기준이 웹과 갈라진다.
 */
const BUCKET_SECTIONS = [
  { key: 'awaitingAssignment', label: '배정 대기', hint: '길어질수록 100% 환불 위험이 커집니다' },
  { key: 'materialsAtRisk', label: '자료 위험', hint: '마감이 임박했는데 필수 항목이 비어 있음' },
  { key: 'awaitingSchedule', label: '일정 미정', hint: null },
  { key: 'reportPending', label: '리포트 기한', hint: '컨설팅은 끝났고 리포트가 아직입니다' },
] as const;

function ApplicationsTab({
  tab,
  onChangeTab,
}: {
  tab: TabKey;
  onChangeTab: (next: TabKey) => void;
}) {
  const state = useApi<SusiApplicationsResponse>('/api/mobile/susi/applications');

  return (
    <ConsoleScroll state={state}>
      <TabBar tab={tab} onChangeTab={onChangeTab} />

      <ApiStateView state={state}>
        {(data) =>
          data.scope === 'mine' ? (
            data.rows.length === 0 ? (
              <EmptyState message="배정된 진행 건이 없습니다." />
            ) : (
              data.rows.map((row) => (
                <ApplicationCard key={row.application.id} row={row} />
              ))
            )
          ) : (
            <>
              {BUCKET_SECTIONS.map((section) => {
                const rows = data.buckets[section.key];
                if (rows.length === 0) return null;

                return (
                  <View key={section.key} style={styles.stack}>
                    <SectionTitle hint={section.hint ?? undefined}>
                      {section.label} {rows.length}건
                    </SectionTitle>
                    {rows.map((row) => (
                      <ApplicationCard key={row.application.id} row={row} />
                    ))}
                  </View>
                );
              })}

              {data.buckets.all.length === 0 ? (
                <EmptyState message="진행 중인 건이 없습니다." />
              ) : null}
            </>
          )
        }
      </ApiStateView>
    </ConsoleScroll>
  );
}

function StudentsTab({ tab, onChangeTab }: { tab: TabKey; onChangeTab: (next: TabKey) => void }) {
  const state = useApi<SusiStudentsResponse>('/api/mobile/susi/students');

  return (
    <ConsoleScroll state={state}>
      <TabBar tab={tab} onChangeTab={onChangeTab} />

      <ApiStateView state={state}>
        {(data) => (
          <>
            <ThemedText style={styles.muted}>
              {data.admissionYear}학년도 · {data.scope === 'all' ? '전체' : '담당'}{' '}
              {data.students.length}명
            </ThemedText>

            {data.students.length === 0 ? (
              <EmptyState message="담당 학생이 없습니다." />
            ) : (
              data.students.map((student) => (
                <CardLink key={student.id} href={`/susi/student/${student.id}`}>
                  <View style={styles.cardHeader}>
                    <ThemedText style={styles.cardTitle}>{student.name}</ThemedText>
                    <Badge>{student.status}</Badge>
                  </View>

                  <ThemedText style={styles.muted}>
                    {[student.high_school, student.grade_level, student.tracks.join(', ')]
                      .filter(Boolean)
                      .join(' · ') || '정보 없음'}
                  </ThemedText>

                  <View style={styles.badgeRow}>
                    {student.gpa !== null ? <Badge>내신 {student.gpa}</Badge> : null}
                    {student.record_level ? (
                      <Badge tone="blue">생기부 {student.record_level}</Badge>
                    ) : null}
                    {student.consultant_name ? (
                      <Badge>{student.consultant_name}</Badge>
                    ) : (
                      <Badge tone="rose">미배정</Badge>
                    )}
                  </View>
                </CardLink>
              ))
            )}
          </>
        )}
      </ApiStateView>
    </ConsoleScroll>
  );
}
