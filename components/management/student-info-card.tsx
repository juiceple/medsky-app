import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { saveInternalMemo, updateStudentStatus } from '@/lib/management-api';
import { STUDENT_STATUSES, type StudentStatus, type StudentSummary } from '@/lib/management-types';

type InfoRow = { label: string; value: string | null };

function InfoField({ label, value }: InfoRow) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  return (
    <View style={styles.infoField}>
      <ThemedText style={[styles.infoLabel, { color: textSecondary }]}>{label}</ThemedText>
      <ThemedText style={styles.infoValue}>{value?.trim() ? value : '미입력'}</ThemedText>
    </View>
  );
}

type Props = {
  student: StudentSummary;
  onSaved: () => void;
  hideStatus?: boolean;
};

/**
 * 학생 정보 · 진행 상태 · 내부 메모를 한 서랍에 접어 넣은 카드.
 * 웹의 StudentInfoDialog + StudentInternalMemo 를 한 번에 펼치고 접는다.
 * 진행 상태는 어드민이 관리하므로 컨설턴트에게는 hideStatus 로 숨긴다 (실장은 봄).
 */
export function StudentInfoCard({ student, onSaved, hideStatus = false }: Props) {
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState(student.internal_memo ?? '');
  const [savingMemo, setSavingMemo] = useState(false);
  const [statusSaving, setStatusSaving] = useState<StudentStatus | null>(null);

  const primary = useThemeColor({}, 'primary');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const memoDirty = memo.trim() !== (student.internal_memo ?? '').trim();

  async function handleSaveMemo() {
    setSavingMemo(true);
    try {
      await saveInternalMemo(student.id, memo.trim());
      onSaved();
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSavingMemo(false);
    }
  }

  async function handleChangeStatus(status: StudentStatus) {
    if (status === student.status) return;
    setStatusSaving(status);
    try {
      await updateStudentStatus(student.id, status);
      onSaved();
    } catch (error) {
      Alert.alert('변경 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setStatusSaving(null);
    }
  }

  return (
    <Card>
      <Pressable style={styles.header} onPress={() => setOpen((prev) => !prev)}>
        <ThemedText type="defaultSemiBold">
          {hideStatus ? '학생 정보 · 내부 메모' : '학생 정보 · 진행 상태 · 내부 메모'}
        </ThemedText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={textSecondary} />
      </Pressable>

      {open ? (
        <View style={styles.body}>
          <View style={styles.infoGrid}>
            <InfoField label="학년" value={student.grade_level} />
            <InfoField label="계열" value={student.track} />
            <InfoField label="학교" value={student.school_name} />
            <InfoField label="내신" value={student.school_gpa} />
            <InfoField label="모의고사" value={student.mock_exam_grade} />
            <InfoField label="희망 대학" value={student.desired_university} />
            <InfoField label="희망 학과" value={student.desired_major} />
            <InfoField label="학생 연락처" value={student.student_phone} />
            <InfoField label="학부모" value={student.parent_name} />
            <InfoField label="학부모 연락처" value={student.parent_phone} />
          </View>

          {!hideStatus && (
            <View style={[styles.section, { borderTopColor: border }]}>
              <ThemedText type="defaultSemiBold">진행 상태</ThemedText>
              <View style={styles.chipRow}>
                {STUDENT_STATUSES.map((option) => {
                  const selected = option === student.status;
                  return (
                    <Pressable
                      key={option}
                      disabled={statusSaving !== null}
                      onPress={() => handleChangeStatus(option)}
                      style={[
                        styles.chip,
                        { backgroundColor: selected ? primary : surfaceSecondary },
                        statusSaving === option && styles.chipBusy,
                      ]}>
                      <ThemedText style={[styles.chipText, { color: selected ? '#fff' : text }]}>
                        {option}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={[styles.section, { borderTopColor: border }]}>
            <View style={styles.noteLabelRow}>
              <Ionicons name="lock-closed-outline" size={14} color={textSecondary} />
              <ThemedText type="defaultSemiBold">내부 메모</ThemedText>
            </View>
            <ThemedText style={[styles.hint, { color: textSecondary }]}>학생에게는 보이지 않아요.</ThemedText>
            <TextInput
              style={[styles.textArea, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
              value={memo}
              onChangeText={setMemo}
              placeholder="이 학생에 대한 메모를 남겨보세요"
              placeholderTextColor={textSecondary}
              multiline
            />
            {memoDirty ? (
              <Button label="메모 저장" size="sm" fullWidth={false} loading={savingMemo} onPress={handleSaveMemo} />
            ) : null}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  body: { gap: Spacing.md },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  infoField: { width: '46%', gap: 2 },
  infoLabel: { fontSize: 11, fontWeight: '600' },
  infoValue: { fontSize: 14 },
  section: { gap: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.pill },
  chipBusy: { opacity: 0.6 },
  chipText: { fontSize: 12.5, fontWeight: '700' },
  noteLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hint: { fontSize: 12 },
  textArea: {
    minHeight: 80,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 14,
    textAlignVertical: 'top',
  },
});
