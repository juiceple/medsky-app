import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { AppModal } from '@/components/ui/app-modal';
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

function formatAvg(value: number | null) {
  return value === null ? '-' : value.toFixed(1);
}

const EMPTY_SURVEY_FORM = { satisfaction: '', prepMinutes: '', maxStudents: '', desiredHourlyRate: '', requestToCompany: '' };

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
  const [surveyForm, setSurveyForm] = useState(EMPTY_SURVEY_FORM);
  const [savingSurvey, setSavingSurvey] = useState(false);

  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
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

  function openNoteForm() {
    setNoteConsultantId(null);
    setNoteBody('');
    setNoteFormOpen(true);
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

  function openSurveyForm() {
    setSurveyConsultantId(null);
    setSurveyForm(EMPTY_SURVEY_FORM);
    setSurveyFormOpen(true);
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
        satisfaction: surveyForm.satisfaction.trim() ? Number(surveyForm.satisfaction.trim()) : null,
        prepMinutes: surveyForm.prepMinutes.trim() ? Number(surveyForm.prepMinutes.trim()) : null,
        maxStudents: surveyForm.maxStudents.trim() ? Number(surveyForm.maxStudents.trim()) : null,
        desiredHourlyRate: surveyForm.desiredHourlyRate.trim() ? Number(surveyForm.desiredHourlyRate.trim()) : null,
        requestToCompany: surveyForm.requestToCompany.trim() || null,
      });
      setSurveyFormOpen(false);
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
              <ThemedText style={[styles.chipText, { color: selected ? '#fff' : text }]}>{consultant.name}</ThemedText>
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
        <View style={{ flex: 1 }} />
        <Pressable onPress={openNoteForm} style={[styles.outlineButton, { borderColor: border }]}>
          <ThemedText style={styles.outlineButtonLabel}>피드백 남기기</ThemedText>
        </Pressable>
      </View>

      {tab === 'notes' ? (
        <View style={{ gap: Spacing.md }}>
          {notes.map((note) => (
            <Card key={note.id} style={{ gap: Spacing.sm }}>
              <View style={styles.rowHeader}>
                <ThemedText style={styles.rowName}>{note.consultantName ?? '대상 없음'}</ThemedText>
                {note.studentName ? (
                  <ThemedText style={[styles.rowSub, { color: textTertiary }]}>학생: {note.studentName}</ThemedText>
                ) : null}
                <View style={{ flex: 1 }} />
                <ThemedText style={[styles.rowDate, { color: textTertiary }]}>{note.created_at.slice(5, 10)}</ThemedText>
              </View>
              <ThemedText style={styles.rowBody}>{note.body}</ThemedText>
              <View style={styles.chipRow}>
                {FEEDBACK_STATUSES.map((option) => {
                  const selected = option === note.status;
                  return (
                    <Pressable
                      key={option}
                      disabled={busyNoteId === note.id}
                      onPress={() => handleChangeStatus(note, option)}
                      style={[styles.statusChip, { backgroundColor: selected ? primary : surfaceSecondary }]}>
                      <ThemedText style={[styles.chipText, { color: selected ? '#fff' : text }]}>{option}</ThemedText>
                    </Pressable>
                  );
                })}
                <View style={{ flex: 1 }} />
                <Pressable
                  disabled={busyNoteId === note.id}
                  onPress={() => handleDeleteNote(note)}
                  style={styles.deleteButton}>
                  <ThemedText style={[styles.deleteButtonLabel, { color: textTertiary }]}>삭제</ThemedText>
                </Pressable>
              </View>
            </Card>
          ))}
          {notes.length === 0 ? (
            <Card style={styles.emptyCard}>
              <ThemedText style={[styles.emptyText, { color: textTertiary }]}>등록된 피드백이 없어요.</ThemedText>
            </Card>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: Spacing.md }}>
          <Card style={styles.summaryCard} padded={false}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryTile}>
                <ThemedText style={styles.summaryValue}>{formatAvg(surveySummary.avgSatisfaction)}</ThemedText>
                <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>평균 만족도</ThemedText>
              </View>
              <View style={styles.summaryTile}>
                <ThemedText style={styles.summaryValue}>{formatAvg(surveySummary.avgPrepMinutes)}분</ThemedText>
                <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>평균 준비시간</ThemedText>
              </View>
              <View style={styles.summaryTile}>
                <ThemedText style={styles.summaryValue}>{formatAvg(surveySummary.avgMaxStudents)}</ThemedText>
                <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>평균 희망 학생수</ThemedText>
              </View>
              <View style={styles.summaryTile}>
                <ThemedText style={styles.summaryValue}>{surveySummary.count}건</ThemedText>
                <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>수집 설문</ThemedText>
              </View>
            </View>
          </Card>

          <Button label="컨설턴트 대신 제출" variant="secondary" onPress={openSurveyForm} />

          {surveys.map((survey) => (
            <Card key={survey.id} style={{ gap: Spacing.xs }}>
              <View style={styles.rowHeader}>
                <ThemedText style={styles.rowName}>{survey.consultantName ?? '알 수 없음'}</ThemedText>
                <View style={{ flex: 1 }} />
                <ThemedText style={[styles.rowDate, { color: textTertiary }]}>{survey.submitted_at.slice(5, 10)}</ThemedText>
              </View>
              <ThemedText style={[styles.rowMeta, { color: textSecondary }]}>
                만족도 {survey.satisfaction ?? '-'} · 준비 {survey.prep_minutes ?? '-'}분 · 희망 학생수 {survey.max_students ?? '-'}명
              </ThemedText>
              {survey.request_to_company ? <ThemedText style={styles.rowBody}>{survey.request_to_company}</ThemedText> : null}
            </Card>
          ))}
          {surveys.length === 0 ? (
            <Card style={styles.emptyCard}>
              <ThemedText style={[styles.emptyText, { color: textTertiary }]}>제출된 설문이 없어요.</ThemedText>
            </Card>
          ) : null}
        </View>
      )}

      <AppModal
        visible={noteFormOpen}
        title="피드백 남기기"
        subtitle="컨설턴트 운영 피드백은 실장만 볼 수 있어요"
        onClose={() => setNoteFormOpen(false)}
        onConfirm={handleSaveNote}
        confirmLabel="등록"
        confirmLoading={savingNote}>
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
      </AppModal>

      <AppModal
        visible={surveyFormOpen}
        title="설문 대신 제출"
        subtitle="컨설턴트가 직접 제출하지 못한 경우 실장이 대신 입력해요"
        onClose={() => setSurveyFormOpen(false)}
        onConfirm={handleSubmitSurvey}
        confirmLabel="제출"
        confirmLoading={savingSurvey}>
        <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>컨설턴트</ThemedText>
        <ConsultantPicker value={surveyConsultantId} onChange={setSurveyConsultantId} />
        <TextInput
          style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
          value={surveyForm.satisfaction}
          onChangeText={(satisfaction) => setSurveyForm((prev) => ({ ...prev, satisfaction }))}
          placeholder="만족도 (1~10)"
          placeholderTextColor={textSecondary}
          keyboardType="number-pad"
        />
        <TextInput
          style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
          value={surveyForm.prepMinutes}
          onChangeText={(prepMinutes) => setSurveyForm((prev) => ({ ...prev, prepMinutes }))}
          placeholder="준비 시간(분)"
          placeholderTextColor={textSecondary}
          keyboardType="number-pad"
        />
        <TextInput
          style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
          value={surveyForm.maxStudents}
          onChangeText={(maxStudents) => setSurveyForm((prev) => ({ ...prev, maxStudents }))}
          placeholder="맡을 수 있는 학생 수"
          placeholderTextColor={textSecondary}
          keyboardType="number-pad"
        />
        <TextInput
          style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
          value={surveyForm.desiredHourlyRate}
          onChangeText={(desiredHourlyRate) => setSurveyForm((prev) => ({ ...prev, desiredHourlyRate }))}
          placeholder="희망 시급(원)"
          placeholderTextColor={textSecondary}
          keyboardType="number-pad"
        />
        <TextInput
          style={[styles.textArea, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
          value={surveyForm.requestToCompany}
          onChangeText={(requestToCompany) => setSurveyForm((prev) => ({ ...prev, requestToCompany }))}
          placeholder="회사에 바라는 점"
          placeholderTextColor={textSecondary}
          multiline
        />
      </AppModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, paddingTop: Spacing.xxxl + 20, paddingBottom: 60, gap: Spacing.md },
  tabRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tabButton: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.pill, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '700' },
  outlineButton: { height: 34, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  outlineButtonLabel: { fontSize: 12.5, fontWeight: '600' },
  fieldLabel: { fontSize: 12, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, alignItems: 'center' },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm - 2, borderRadius: Radius.pill },
  chipText: { fontSize: 12.5, fontWeight: '700' },
  statusChip: { height: 30, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  deleteButton: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm },
  deleteButtonLabel: { fontSize: 12, fontWeight: '600' },
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
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowName: { fontSize: 14, fontWeight: '700' },
  rowSub: { fontSize: 12.5 },
  rowDate: { fontSize: 11.5, fontFamily: 'ui-monospace' },
  rowMeta: { fontSize: 12.5 },
  rowBody: { fontSize: 14, lineHeight: 21 },
  summaryCard: { overflow: 'hidden' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  summaryTile: { flexGrow: 1, flexBasis: '25%', padding: Spacing.md, gap: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  summaryLabel: { fontSize: 12 },
  emptyCard: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyText: { fontSize: 13.5 },
});
