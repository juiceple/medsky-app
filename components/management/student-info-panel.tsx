import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { STUDENT_STATUSES, type StudentDetail, type StudentStatus } from '@/lib/management-types';

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

/**
 * 학생 인적사항 + (실장이면) 진행 상태 + 내부 메모. 모바일에서는 헤더 토글 안에,
 * 태블릿/PC에서는 항상 보이는 옆 컬럼 카드로 쓴다 (student-timeline-screen).
 */
export function StudentInfoPanel({
  student,
  hideStatus,
  statusSaving,
  onChangeStatus,
  memo,
  onMemoChange,
  memoDirty,
  savingMemo,
  onSaveMemo,
  bordered = true,
}: {
  student: StudentDetail['student'];
  hideStatus: boolean;
  statusSaving: StudentStatus | null;
  onChangeStatus: (status: StudentStatus) => void;
  memo: string;
  onMemoChange: (text: string) => void;
  memoDirty: boolean;
  savingMemo: boolean;
  onSaveMemo: () => void;
  bordered?: boolean;
}) {
  const surface = useThemeColor({}, 'surface');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: surface },
        bordered && { borderWidth: StyleSheet.hairlineWidth, borderColor: border },
      ]}>
      <View style={styles.headRow}>
        <ThemedText type="defaultSemiBold" style={styles.headTitle}>
          학생 정보
        </ThemedText>
        <Ionicons name="create-outline" size={17} color={textSecondary} />
      </View>

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

      {hideStatus ? null : (
        <View style={[styles.section, { borderTopColor: border }]}>
          <ThemedText type="defaultSemiBold">진행 상태</ThemedText>
          <View style={styles.chipRow}>
            {STUDENT_STATUSES.map((option) => {
              const selected = option === student.status;
              return (
                <Pressable
                  key={option}
                  disabled={statusSaving !== null}
                  onPress={() => onChangeStatus(option)}
                  style={[
                    styles.chip,
                    { backgroundColor: selected ? primary : surfaceSecondary },
                    statusSaving === option && styles.chipBusy,
                  ]}>
                  <ThemedText style={[styles.chipText, { color: selected ? '#fff' : text }]}>{option}</ThemedText>
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
          onChangeText={onMemoChange}
          placeholder="이 학생에 대한 메모를 남겨보세요"
          placeholderTextColor={textSecondary}
          multiline
        />
        {memoDirty ? (
          <Button label="메모 저장" size="sm" fullWidth={false} loading={savingMemo} onPress={onSaveMemo} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, padding: 14, gap: Spacing.md },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headTitle: { fontSize: 15 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
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
