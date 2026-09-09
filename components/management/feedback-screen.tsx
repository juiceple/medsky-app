import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  deleteFeedbackNote,
  getConsultants,
  getConsultantSurveys,
  getFeedbackNotes,
  saveFeedbackNote,
  submitConsultantSurvey,
  updateFeedbackStatus,
} from '@/lib/management-api';
import {
  FEEDBACK_STATUSES,
  type ConsultantSurveyWithName,
  type ConsultantWithServices,
  type FeedbackNoteWithNames,
  type FeedbackStatus,
  type SurveySummary,
} from '@/lib/management-types';

type Tab = 'notes' | 'surveys';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      consultants: ConsultantWithServices[];
      notes: FeedbackNoteWithNames[];
      surveys: ConsultantSurveyWithName[];
      surveySummary: SurveySummary;
    };

function statusTone(status: FeedbackStatus): BadgeTone {
  if (status === '완료') return 'success';
  if (status === '진행 중') return 'primary';
  return 'neutral';
}

function formatAvg(value: number | null) {
  return value === null ? '-' : value.toFixed(1);
}

/** 실장 전용: 운영 피드백 노트 + 컨설턴트 만족도 설문. */
export function FeedbackScreen() {
  const [tab, setTab] = useState<Tab>('notes');
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [noteConsultantId, setNoteConsultantId] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [busyNoteId, setBusyNoteId] = useState<string | null>(null);

  const [surveyFormOpen, setSurveyFormOpen] = useState(false);
  const [surveyConsultantId, setSurveyConsultantId] = useState<string | null>(null);
  const [satisfaction, setSatisfaction] = useState('');
  const [prepMinutes, setPrepMinutes] = useState('');
  const [maxStudents, setMaxStudents] = useState('');
  const [desiredHourlyRate, setDesiredHourlyRate] = useState('');
  const [requestToCompany, setRequestToCompany] = useState('');
  const [savingSurvey, setSavingSurvey] = useState(false);

  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const text = useThemeColor({}, 'text');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');

  const load = useCallback(async () => {
    try {
      const [{ consultants }, { notes }, { surveys, summary }] = await Promise.all([
        getConsultants(),
        getFeedbackNotes(),
        getConsultantSurveys(),
      ]);
      setState({ status: 'ready', consultants, notes, surveys, surveySummary: summary });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : '불러오지 못했습니다.' });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleSaveNote() {
    if (!noteConsultantId || !noteBody.trim()) {
      Alert.alert('입력 필요', '컨설턴트와 내용을 입력해주세요.');
      return;
    }
    setSavingNote(true);
    try {
      await saveFeedbackNote({ consultantId: noteConsultantId, body: noteBody.trim() });
      setNoteFormOpen(false);
      setNoteBody('');
      setNoteConsultantId(null);
      load();
    } catch (error) {
      Alert.alert('등록 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSavingNote(false);
    }
  }

  async function handleChangeStatus(note: FeedbackNoteWithNames, status: FeedbackStatus) {
    if (status === note.status) return;
    setBusyNoteId(note.id);
    try {
      await updateFeedbackStatus(note.id, status);
      load();
    } catch (error) {
      Alert.alert('변경 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setBusyNoteId(null);
    }
  }

  function handleDeleteNote(note: FeedbackNoteWithNames) {
    Alert.alert('피드백 삭제', '이 피드백을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setBusyNoteId(note.id);
          try {
            await deleteFeedbackNote(note.id);
            load();
          } catch (error) {
            Alert.alert('삭제 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
          } finally {
            setBusyNoteId(null);
          }
        },
      },
    ]);
  }

  async function handleSubmitSurvey() {
    if (!surveyConsultantId) {
      Alert.alert('입력 필요', '컨설턴트를 선택해주세요.');
      return;
    }
    setSavingSurvey(true);
    try {
      await submitConsultantSurvey({
        consultantId: surveyConsultantId,
        satisfaction: satisfaction.trim() ? Number(satisfaction.trim()) : null,
        prepMinutes: prepMinutes.trim() ? Number(prepMinutes.trim()) : null,
        maxStudents: maxStudents.trim() ? Number(maxStudents.trim()) : null,
        desiredHourlyRate: desiredHourlyRate.trim() ? Number(desiredHourlyRate.trim()) : null,
        requestToCompany: requestToCompany.trim() || null,
      });
      setSurveyFormOpen(false);
      setSurveyConsultantId(null);
      setSatisfaction('');
      setPrepMinutes('');
      setMaxStudents('');
      setDesiredHourlyRate('');
      setRequestToCompany('');
      load();
    } catch (error) {
      Alert.alert('제출 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSavingSurvey(false);
    }
  }

  if (state.status === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: background }]}>
        <ActivityIndicator color={primary} />
      </View>
    );
  }

  if (state.status === 'error') {
    return <StatusMessage message={state.message} onRetry={load} />;
  }

  const { consultants, notes, surveys, surveySummary } = state;

  function ConsultantPicker({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
    return (
      <View style={styles.chipRow}>
        {consultants.map((consultant) => {
          const selected = consultant.id === value;
          return (
            <Pressable
              key={consultant.id}
              onPress={() => onChange(consultant.id)}
              style={[styles.chip, { backgroundColor: selected ? primary : surfaceSecondary }]}>
              <ThemedText style={[styles.chipText, { color: selected ? '#fff' : text }]}>
                {consultant.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primary} />}>
      <ScreenHeader title="피드백 · 설문" />

      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setTab('notes')}
          style={[styles.tabButton, { backgroundColor: tab === 'notes' ? primary : surfaceSecondary }]}>
          <ThemedText style={[styles.tabText, { color: tab === 'notes' ? '#fff' : text }]}>피드백 노트</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setTab('surveys')}
          style={[styles.tabButton, { backgroundColor: tab === 'surveys' ? primary : surfaceSecondary }]}>
          <ThemedText style={[styles.tabText, { color: tab === 'surveys' ? '#fff' : text }]}>만족도 설문</ThemedText>
        </Pressable>
      </View>

      {tab === 'notes' ? (
        <>
          <Button
            label={noteFormOpen ? '취소' : '피드백 남기기'}
            variant={noteFormOpen ? 'secondary' : 'primary'}
            onPress={() => setNoteFormOpen((prev) => !prev)}
          />
          {noteFormOpen ? (
            <Card style={{ gap: Spacing.sm }}>
              <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>컨설턴트</ThemedText>
              <ConsultantPicker value={noteConsultantId} onChange={setNoteConsultantId} />
              <TextInput
                style={[styles.textArea, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
                value={noteBody}
                onChangeText={setNoteBody}
                placeholder="피드백 내용"
                placeholderTextColor={textSecondary}
                multiline
              />
              <Button label="등록" loading={savingNote} onPress={handleSaveNote} />
            </Card>
          ) : null}

          <View style={{ gap: Spacing.md }}>
            {notes.map((note) => (
              <Card key={note.id} style={{ gap: Spacing.xs }}>
                <View style={styles.rowHeader}>
                  <ThemedText style={styles.rowName}>{note.consultantName ?? '대상 없음'}</ThemedText>
                  <Badge label={note.status} tone={statusTone(note.status)} />
                </View>
                {note.studentName ? (
                  <ThemedText style={[styles.rowMeta, { color: textSecondary }]}>학생: {note.studentName}</ThemedText>
                ) : null}
                <ThemedText style={styles.rowBody}>{note.body}</ThemedText>
                <View style={styles.chipRow}>
                  {FEEDBACK_STATUSES.map((option) => {
                    const selected = option === note.status;
                    return (
                      <Pressable
                        key={option}
                        disabled={busyNoteId === note.id}
                        onPress={() => handleChangeStatus(note, option)}
                        style={[styles.chip, { backgroundColor: selected ? primary : surfaceSecondary }]}>
                        <ThemedText style={[styles.chipText, { color: selected ? '#fff' : text }]}>
                          {option}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                  <Button
                    label="삭제"
                    size="sm"
                    variant="ghost"
                    fullWidth={false}
                    loading={busyNoteId === note.id}
                    onPress={() => handleDeleteNote(note)}
                  />
                </View>
              </Card>
            ))}
            {notes.length === 0 ? (
              <ThemedText style={[styles.empty, { color: textSecondary }]}>등록된 피드백이 없어요.</ThemedText>
            ) : null}
          </View>
        </>
      ) : (
        <>
          <Card style={styles.summaryCard}>
            <ThemedText type="defaultSemiBold">평균 ({surveySummary.count}건)</ThemedText>
            <View style={styles.summaryGrid}>
              <ThemedText style={styles.summaryItem}>만족도 {formatAvg(surveySummary.avgSatisfaction)}</ThemedText>
              <ThemedText style={styles.summaryItem}>준비시간 {formatAvg(surveySummary.avgPrepMinutes)}분</ThemedText>
              <ThemedText style={styles.summaryItem}>희망학생수 {formatAvg(surveySummary.avgMaxStudents)}</ThemedText>
              <ThemedText style={styles.summaryItem}>희망시급 {formatAvg(surveySummary.avgDesiredRate)}원</ThemedText>
            </View>
          </Card>

          <Button
            label={surveyFormOpen ? '취소' : '설문 대신 제출'}
            variant={surveyFormOpen ? 'secondary' : 'primary'}
            onPress={() => setSurveyFormOpen((prev) => !prev)}
          />
          {surveyFormOpen ? (
            <Card style={{ gap: Spacing.sm }}>
              <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>컨설턴트</ThemedText>
              <ConsultantPicker value={surveyConsultantId} onChange={setSurveyConsultantId} />
              <TextInput
                style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
                value={satisfaction}
                onChangeText={setSatisfaction}
                placeholder="만족도 (1~10)"
                placeholderTextColor={textSecondary}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
                value={prepMinutes}
                onChangeText={setPrepMinutes}
                placeholder="준비 시간(분)"
                placeholderTextColor={textSecondary}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
                value={maxStudents}
                onChangeText={setMaxStudents}
                placeholder="맡을 수 있는 학생 수"
                placeholderTextColor={textSecondary}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
                value={desiredHourlyRate}
                onChangeText={setDesiredHourlyRate}
                placeholder="희망 시급(원)"
                placeholderTextColor={textSecondary}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.textArea, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
                value={requestToCompany}
                onChangeText={setRequestToCompany}
                placeholder="회사에 바라는 점"
                placeholderTextColor={textSecondary}
                multiline
              />
              <Button label="제출" loading={savingSurvey} onPress={handleSubmitSurvey} />
            </Card>
          ) : null}

          <View style={{ gap: Spacing.md }}>
            {surveys.map((survey) => (
              <Card key={survey.id} style={{ gap: Spacing.xs }}>
                <ThemedText style={styles.rowName}>{survey.consultantName ?? '알 수 없음'}</ThemedText>
                <ThemedText style={[styles.rowMeta, { color: textSecondary }]}>
                  만족도 {survey.satisfaction ?? '-'} · 준비 {survey.prep_minutes ?? '-'}분 · 희망학생{' '}
                  {survey.max_students ?? '-'}명
                </ThemedText>
                {survey.request_to_company ? (
                  <ThemedText style={styles.rowBody}>{survey.request_to_company}</ThemedText>
                ) : null}
              </Card>
            ))}
            {surveys.length === 0 ? (
              <ThemedText style={[styles.empty, { color: textSecondary }]}>제출된 설문이 없어요.</ThemedText>
            ) : null}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, paddingTop: Spacing.xxxl + 20, paddingBottom: 60, gap: Spacing.md },
  tabRow: { flexDirection: 'row', gap: Spacing.sm },
  tabButton: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.pill, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm - 2, borderRadius: Radius.pill },
  chipText: { fontSize: 12.5, fontWeight: '700' },
  input: {
    height: 44,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 12.5 },
  rowBody: { fontSize: 14, lineHeight: 20 },
  summaryCard: { gap: Spacing.sm },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  summaryItem: { fontSize: 13, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 20, fontSize: 14 },
});
