import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useManagementViewer } from '@/hooks/use-management-viewer';
import { adjustCredits, assignConsultant, getConsultants } from '@/lib/management-api';
import { CREDIT_KINDS, type ConsultantWithServices, type CreditKind, type StudentSummary } from '@/lib/management-types';

type Props = { student: StudentSummary; onSaved: () => void };

/**
 * 실장 전용 조작판(학생 상세 안에 끼워 넣는다): 컨설턴트 배정/재배정/배정 해제는
 * 실장이면 누구나, 회차 수동 보정은 어드민만 할 수 있다(웹에서 credit-adjust-form 이
 * `/admin/management/students` 에만 있고 `/manager/management/students` 에는 없는 것과
 * 같다). 컨설턴트 계정으로 보면 아예 렌더링하지 않는다.
 * 웹의 assign-consultant-form.tsx + credit-adjust-form.tsx 를 한 카드로 합쳤다.
 */
export function ManagerStudentControls({ student, onSaved }: Props) {
  const viewerState = useManagementViewer();
  const [open, setOpen] = useState(false);
  const [consultants, setConsultants] = useState<ConsultantWithServices[] | null>(null);
  const [assigning, setAssigning] = useState(false);

  const [creditAmount, setCreditAmount] = useState('');
  const [creditKind, setCreditKind] = useState<CreditKind>('수동조정');
  const [creditMemo, setCreditMemo] = useState('');
  const [savingCredit, setSavingCredit] = useState(false);

  const primary = useThemeColor({}, 'primary');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');

  const isManager = viewerState.status === 'ready' && viewerState.viewer.role === 'manager';
  const isAdmin = viewerState.status === 'ready' && viewerState.viewer.isAdmin;

  useEffect(() => {
    if (!isManager || !open || consultants) return;
    getConsultants()
      .then(({ consultants: list }) => setConsultants(list))
      .catch(() => setConsultants([]));
  }, [isManager, open, consultants]);

  if (!isManager) return null;

  async function handleAssign(consultantId: string | null) {
    setAssigning(true);
    try {
      const result = await assignConsultant(student.id, consultantId);
      Alert.alert('배정 완료', result.message);
      onSaved();
    } catch (error) {
      Alert.alert('배정 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setAssigning(false);
    }
  }

  async function handleAdjustCredits() {
    const amount = Number(creditAmount.trim());
    if (!creditAmount.trim() || Number.isNaN(amount) || amount === 0) {
      Alert.alert('입력 필요', '0이 아닌 회차 값을 입력해주세요. (차감은 -1 처럼 음수)');
      return;
    }
    setSavingCredit(true);
    try {
      const result = await adjustCredits(student.id, { amount, kind: creditKind, memo: creditMemo.trim() || null });
      Alert.alert('조정 완료', result.message);
      setCreditAmount('');
      setCreditMemo('');
      onSaved();
    } catch (error) {
      Alert.alert('조정 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSavingCredit(false);
    }
  }

  return (
    <Card>
      <Pressable style={styles.header} onPress={() => setOpen((prev) => !prev)}>
        <ThemedText type="defaultSemiBold">
          실장 전용 · 배정{isAdmin ? ' · 회차 조정' : ''}
        </ThemedText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={textSecondary} />
      </Pressable>

      {open ? (
        <View style={styles.body}>
          <View style={[styles.section, { borderTopColor: border }]}>
            <ThemedText type="defaultSemiBold">담당 컨설턴트</ThemedText>
            <ThemedText style={[styles.hint, { color: textSecondary }]}>
              현재: {student.consultantName ?? '배정 전'}
            </ThemedText>
            {consultants === null ? (
              <ThemedText style={[styles.hint, { color: textSecondary }]}>컨설턴트 목록을 불러오는 중...</ThemedText>
            ) : (
              <View style={styles.chipRow}>
                <Pressable
                  disabled={assigning}
                  onPress={() => handleAssign(null)}
                  style={[
                    styles.chip,
                    { backgroundColor: !student.consultant_id ? primary : surfaceSecondary },
                  ]}>
                  <ThemedText style={[styles.chipText, { color: !student.consultant_id ? '#fff' : text }]}>
                    배정 해제
                  </ThemedText>
                </Pressable>
                {consultants.map((consultant) => {
                  const selected = consultant.id === student.consultant_id;
                  return (
                    <Pressable
                      key={consultant.id}
                      disabled={assigning}
                      onPress={() => handleAssign(consultant.id)}
                      style={[styles.chip, { backgroundColor: selected ? primary : surfaceSecondary }]}>
                      <ThemedText style={[styles.chipText, { color: selected ? '#fff' : text }]}>
                        {consultant.name}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {isAdmin ? (
            <View style={[styles.section, { borderTopColor: border }]}>
              <ThemedText type="defaultSemiBold">회차 수동 보정</ThemedText>
              <ThemedText style={[styles.hint, { color: textSecondary }]}>
                잔여 {student.balance.remaining}회 (지급 {student.balance.granted} · 사용 {student.balance.used})
              </ThemedText>
              <View style={styles.chipRow}>
                {CREDIT_KINDS.map((kind) => {
                  const selected = kind === creditKind;
                  return (
                    <Pressable
                      key={kind}
                      onPress={() => setCreditKind(kind)}
                      style={[styles.chip, { backgroundColor: selected ? primary : surfaceSecondary }]}>
                      <ThemedText style={[styles.chipText, { color: selected ? '#fff' : text }]}>{kind}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
                value={creditAmount}
                onChangeText={setCreditAmount}
                placeholder="회차 (차감은 음수, 예: -1)"
                placeholderTextColor={textSecondary}
                keyboardType="numbers-and-punctuation"
              />
              <TextInput
                style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
                value={creditMemo}
                onChangeText={setCreditMemo}
                placeholder="메모 (선택)"
                placeholderTextColor={textSecondary}
              />
              <Button label="조정 저장" size="sm" fullWidth={false} loading={savingCredit} onPress={handleAdjustCredits} />
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  body: { gap: Spacing.md },
  section: { gap: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md },
  hint: { fontSize: 12 },
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
});
