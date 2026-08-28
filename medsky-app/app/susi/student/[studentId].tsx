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
import type { SusiStudentDetail } from '@/lib/api-types';
import { formatPhone } from '@/lib/format';
import { useApi } from '@/lib/use-api';

/**
 * 수시 원서 컨설팅 — 담당 학생 상세.
 *
 * 대학 매칭 보고서의 입력값(대학별 산출성적 · 지원희망 목록)까지 함께 보여준다.
 * 보고서를 만드는 일 자체는 웹에서 한다 — 입결 표를 옆에 놓고 비교하는 작업이라
 * 좁은 화면에서는 오히려 실수가 는다. 앱에서는 "지금 어디까지 정해졌나" 를 확인한다.
 *
 * 생기부 원문은 어디에도 없다. 저장되는 것은 컨설턴트가 쓴 평가 메모뿐이고, 이는
 * 개정 초·중등교육법(생기부 수집·거래 금지) 대응이다.
 */
export default function SusiStudentScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const state = useApi<SusiStudentDetail>(
    studentId ? `/api/mobile/susi/students/${studentId}` : null
  );

  return (
    <ConsoleScroll state={state}>
      <ApiStateView state={state}>
        {({ student, report }) => (
          <>
            <ThemedText type="title">{student.name}</ThemedText>
            <View style={styles.badgeRow}>
              <Badge>{student.status}</Badge>
              {student.consultant_name ? (
                <Badge tone="blue">{student.consultant_name}</Badge>
              ) : (
                <Badge tone="rose">미배정</Badge>
              )}
              {student.tracks.map((track) => (
                <Badge key={track}>{track}</Badge>
              ))}
            </View>

            <Card>
              <Field label="학교" value={student.high_school} />
              <Field label="학년" value={student.grade_level} />
              <Field label="내신" value={student.gpa} />
              <Field label="생기부" value={student.record_level} />
              <Field label="희망 대학" value={student.desired_schools} />
              <Field label="희망 학과" value={student.desired_majors} />
              <Field label="학생 연락처" value={formatPhone(student.student_phone)} />
              <Field label="학부모" value={formatPhone(student.parent_phone)} />
              <Field label="문의" value={student.questions} />
              <Field label="요청사항" value={student.extra_requests} />
            </Card>

            <SectionTitle hint="작성은 웹 콘솔에서 합니다">매칭 보고서</SectionTitle>
            <Card>
              <Field label="교과 기준" value={report.base_gyogwa} />
              <Field label="종합 기준" value={report.jonghap} />
              <Field label="생기부 수준" value={report.record_level} />
              <Field label="생기부 메모" value={report.record_note} />
              <Field label="학생 요청" value={report.student_request_memo} />
              <Field label="컨설턴트 판단" value={report.consultant_request_thoughts} />
            </Card>

            {Object.keys(report.univ_gyogwa).length > 0 ? (
              <>
                <SectionTitle>대학별 산출성적</SectionTitle>
                <Card>
                  {Object.entries(report.univ_gyogwa).map(([univ, grade]) => (
                    <Field key={univ} label={univ} value={grade} />
                  ))}
                </Card>
              </>
            ) : null}

            <SectionTitle hint={`${report.wishlist.length}개`}>지원희망 모집단위</SectionTitle>
            {report.wishlist.length === 0 ? (
              <ThemedText style={styles.muted}>아직 정해진 모집단위가 없습니다.</ThemedText>
            ) : (
              report.wishlist.map((wish, index) => (
                <Card key={`${wish.univ}-${wish.major}-${index}`}>
                  <View style={styles.cardHeader}>
                    <ThemedText style={styles.cardTitle}>
                      {wish.univ} {wish.major}
                    </ThemedText>
                    <Badge>{wish.subtrack ?? wish.track}</Badge>
                  </View>
                  {wish.note ? (
                    <ThemedText style={styles.muted}>{wish.note}</ThemedText>
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
