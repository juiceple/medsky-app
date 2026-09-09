import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { todayInKst } from '@/lib/reservation-calendar';
import { formatRound, formatSlotRange, roundOptions, serviceRule, type ClassService } from '@/lib/reservation-rules';
import type { ReservationSaveInput, ReservationView } from '@/lib/management-types';

import { ReservationCalendar } from './reservation-calendar';
import { SlotPicker } from './slot-picker';

type Step = 'date' | 'time' | 'details';

const STEPS: { key: Step; label: string }[] = [
  { key: 'date', label: '날짜' },
  { key: 'time', label: '시간' },
  { key: 'details', label: '확정' },
];

/**
 * 수업 예약 팝업. 날짜 → 시간 → 세부 정보 세 단계로 진행한다.
 * medsky_homepage 의 BookLessonDialog 와 같은 흐름이다.
 */
export function BookLessonDialog({
  visible,
  onClose,
  studentId,
  service,
  consultantId,
  reservations,
  editing,
  remaining,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  studentId: string;
  service: ClassService;
  consultantId: string | null;
  reservations: ReservationView[];
  editing: ReservationView | null;
  remaining: number;
  onSubmit: (input: ReservationSaveInput) => Promise<void>;
}) {
  const rule = serviceRule(service);
  const today = todayInKst();

  const [step, setStep] = useState<Step>('date');
  const [lessonDate, setLessonDate] = useState('');
  const [lessonTime, setLessonTime] = useState('');
  const [deductedRound, setDeductedRound] = useState(rule.defaultRound);
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  /** 열 때마다 바뀌어 ReservationCalendar 를 새로 마운트한다 — 그 안의 월 상태가
   * 지난번 열었을 때 값으로 남아있지 않고 매번 이 예약의 날짜로 다시 맞춰지게 한다. */
  const [openToken, setOpenToken] = useState(0);

  const durationMinutes = deductedRound * 60;

  const surface = useThemeColor({}, 'surface');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const primary = useThemeColor({}, 'primary');
  const danger = useThemeColor({}, 'danger');

  useEffect(() => {
    if (!visible) return;
    setStep('date');
    setLessonDate(editing?.lessonDate ?? '');
    setLessonTime(editing?.lessonTime ?? '');
    setDeductedRound(editing?.deductedRound ?? rule.defaultRound);
    setTitle(editing?.title ?? '');
    setErrorMessage(null);
    setOpenToken((token) => token + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, editing?.id]);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  async function handleSubmit() {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmit({
        reservationId: editing?.id ?? null,
        lessonDate,
        lessonTime,
        deductedRound,
        durationMinutes,
        title: title.trim(),
      });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.avoider}>
          <View style={[styles.sheet, { backgroundColor: surface }]}>
            <View style={styles.header}>
              <ThemedText type="subtitle">{editing ? '수업 일정 변경' : '수업 예약'}</ThemedText>
              <Pressable hitSlop={10} onPress={onClose}>
                <Ionicons name="close" size={22} color={textSecondary} />
              </Pressable>
            </View>

            <View style={styles.stepRow}>
              {STEPS.map((s, index) => (
                <View key={s.key} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      { backgroundColor: index <= stepIndex ? primary : surfaceSecondary },
                    ]}>
                    <ThemedText
                      style={[styles.stepDotText, { color: index <= stepIndex ? '#fff' : textTertiary }]}>
                      {index + 1}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.stepLabel, { color: index === stepIndex ? text : textTertiary }]}>
                    {s.label}
                  </ThemedText>
                  {index < STEPS.length - 1 ? (
                    <ThemedText style={[styles.stepArrow, { color: textTertiary }]}>{'→'}</ThemedText>
                  ) : null}
                </View>
              ))}
            </View>

            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              {step === 'date' ? (
                <View style={styles.stepGap}>
                  <ReservationCalendar
                    key={openToken}
                    reservations={reservations}
                    selectedDate={lessonDate || null}
                    onSelectDate={(date) => {
                      setLessonDate(date);
                      setLessonTime('');
                    }}
                    minDate={today}
                    initialMonth={lessonDate ? lessonDate.slice(0, 7) : undefined}
                    emptyLabel="이 날짜에는 예약된 수업이 없습니다."
                  />
                  <Button label="다음: 시간 선택" disabled={!lessonDate} onPress={() => setStep('time')} />
                </View>
              ) : null}

              {step === 'time' ? (
                <View style={styles.stepGap}>
                  <ThemedText type="defaultSemiBold">{lessonDate}</ThemedText>
                  <SlotPicker
                    lessonDate={lessonDate}
                    service={service}
                    durationMinutes={durationMinutes}
                    consultantId={consultantId}
                    studentId={studentId}
                    excludeId={editing?.id ?? null}
                    value={lessonTime}
                    onChange={setLessonTime}
                  />
                  <View style={styles.navRow}>
                    <Button label="이전" variant="outline" fullWidth={false} onPress={() => setStep('date')} />
                    <Button
                      label="다음: 세부 정보"
                      fullWidth={false}
                      disabled={!lessonTime}
                      onPress={() => setStep('details')}
                    />
                  </View>
                </View>
              ) : null}

              {step === 'details' ? (
                <View style={styles.stepGap}>
                  <View style={[styles.summaryBox, { backgroundColor: surfaceSecondary }]}>
                    <ThemedText type="defaultSemiBold">
                      {lessonDate} · {formatSlotRange(lessonTime, durationMinutes)}
                    </ThemedText>
                  </View>

                  <View style={styles.field}>
                    <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>차감 회차</ThemedText>
                    <View style={styles.chipRow}>
                      {roundOptions(service).map((option) => {
                        const selected = option === deductedRound;
                        return (
                          <Pressable
                            key={option}
                            onPress={() => setDeductedRound(option)}
                            style={[
                              styles.chip,
                              { backgroundColor: selected ? primary : surfaceSecondary },
                            ]}>
                            <ThemedText style={[styles.chipText, { color: selected ? '#fff' : text }]}>
                              {formatRound(option)}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                    {!rule.allowsHalfRound ? (
                      <ThemedText style={[styles.hint, { color: textTertiary }]}>
                        이 서비스는 0.5회차를 쓸 수 없습니다.
                      </ThemedText>
                    ) : null}
                  </View>

                  <View style={styles.field}>
                    <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>수업 길이(분)</ThemedText>
                    <View style={[styles.readonlyBox, { backgroundColor: surfaceSecondary, borderColor: border }]}>
                      <ThemedText style={{ color: textSecondary }}>{durationMinutes}분</ThemedText>
                    </View>
                    <ThemedText style={[styles.hint, { color: textTertiary }]}>
                      차감 회차 × 60분으로 자동 계산됩니다.
                    </ThemedText>
                  </View>

                  <View style={styles.field}>
                    <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>
                      수업 주제 <ThemedText style={{ color: danger }}>*</ThemedText>
                    </ThemedText>
                    <TextInput
                      style={[styles.input, { color: text, backgroundColor: surfaceSecondary }]}
                      value={title}
                      onChangeText={setTitle}
                      placeholder="예: 3학년 세특 방향 점검"
                      placeholderTextColor={textTertiary}
                    />
                  </View>

                  <ThemedText style={[styles.hint, { color: textTertiary }]}>
                    남은 회차 {formatRound(remaining)} · {rule.overlapNotice}
                  </ThemedText>

                  {errorMessage ? (
                    <ThemedText style={[styles.errorText, { color: danger }]}>{errorMessage}</ThemedText>
                  ) : null}

                  <View style={styles.navRow}>
                    <Button label="이전" variant="outline" fullWidth={false} onPress={() => setStep('time')} />
                    <Button
                      label={editing ? '일정 변경' : '이 시간으로 예약하기'}
                      fullWidth={false}
                      disabled={!title.trim()}
                      loading={submitting}
                      onPress={handleSubmit}
                    />
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  avoider: { maxHeight: '92%' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepDotText: { fontSize: 11, fontWeight: '700' },
  stepLabel: { fontSize: 12.5, fontWeight: '600' },
  stepArrow: { fontSize: 12, marginLeft: 2 },
  body: { paddingVertical: Spacing.sm },
  stepGap: { gap: Spacing.md },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  summaryBox: { borderRadius: Radius.lg, padding: Spacing.md },
  field: { gap: Spacing.xs },
  fieldLabel: { fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.pill },
  chipText: { fontSize: 13, fontWeight: '700' },
  readonlyBox: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 15,
  },
  hint: { fontSize: 12 },
  errorText: { fontSize: 13, fontWeight: '600' },
});
