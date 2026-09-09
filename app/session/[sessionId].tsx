import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { deleteLessonSession, saveLessonSession } from '@/lib/management-api';
import type { LessonMaterialInput, LessonStatus } from '@/lib/management-types';

const STATUS_OPTIONS: LessonStatus[] = ['예정', '완료', '취소', '노쇼'];

type Params = {
  sessionId: string;
  studentId: string;
  reservationId?: string;
  lessonDate?: string;
  sessionRound?: string;
  deductedRound?: string;
  status?: string;
  topic?: string;
  studentSummary?: string;
  internalNote?: string;
  nextAction?: string;
  isSharedWithStudent?: string;
  displayName?: string;
  materials?: string;
};

function parseInitialMaterials(raw?: string): LessonMaterialInput[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as {
      title: string;
      url: string | null;
      description: string | null;
      is_shared_with_student: boolean;
    }[];
    return parsed.map((material) => ({
      title: material.title,
      url: material.url,
      description: material.description,
      isSharedWithStudent: material.is_shared_with_student,
    }));
  } catch {
    return [];
  }
}

/**
 * 회차 기록 작성/수정. 웹의 LessonSessionForm 과 같은 필드를 담는다.
 * sessionId === 'new' 이면 reservationId 로 새 기록을 만들고, 그 외에는 기존 기록을 고친다.
 */
export default function SessionEditorScreen() {
  const params = useLocalSearchParams<Params>();
  const router = useRouter();
  const isNew = params.sessionId === 'new';

  const [lessonDate, setLessonDate] = useState(params.lessonDate ?? '');
  const [sessionRound, setSessionRound] = useState(params.sessionRound ?? '');
  const [deductedRound, setDeductedRound] = useState(params.deductedRound ?? '1');
  const [status, setStatus] = useState<LessonStatus>(
    (params.status as LessonStatus) || '예정'
  );
  const [topic, setTopic] = useState(params.topic ?? '');
  const [studentSummary, setStudentSummary] = useState(params.studentSummary ?? '');
  const [internalNote, setInternalNote] = useState(params.internalNote ?? '');
  const [nextAction, setNextAction] = useState(params.nextAction ?? '');
  const [isSharedWithStudent, setIsSharedWithStudent] = useState(
    params.isSharedWithStudent === '1'
  );
  const [displayName, setDisplayName] = useState(params.displayName ?? '');
  const [materials, setMaterials] = useState<LessonMaterialInput[]>(
    parseInitialMaterials(params.materials)
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const primaryMuted = useThemeColor({}, 'primaryMuted');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const danger = useThemeColor({}, 'danger');

  function updateMaterial(index: number, patch: Partial<LessonMaterialInput>) {
    setMaterials((prev) => prev.map((material, i) => (i === index ? { ...material, ...patch } : material)));
  }

  function addMaterial() {
    setMaterials((prev) => [...prev, { title: '', url: '', description: '', isSharedWithStudent: true }]);
  }

  function removeMaterial(index: number) {
    setMaterials((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const round = Number(sessionRound);
    const deducted = Number(deductedRound);

    if (!lessonDate.trim()) {
      Alert.alert('수업 날짜를 입력해주세요.', 'YYYY-MM-DD 형식으로 입력해주세요.');
      return;
    }
    if (!Number.isFinite(round) || round <= 0) {
      Alert.alert('수업 회차는 1 이상이어야 합니다.');
      return;
    }
    if (!Number.isFinite(deducted) || deducted < 0) {
      Alert.alert('차감 회차는 0 이상이어야 합니다.');
      return;
    }

    setSaving(true);
    try {
      await saveLessonSession({
        studentId: params.studentId,
        sessionId: isNew ? null : params.sessionId,
        reservationId: isNew ? params.reservationId ?? null : null,
        lessonDate: lessonDate.trim(),
        sessionRound: round,
        deductedRound: deducted,
        status,
        topic: topic.trim() || null,
        studentSummary: studentSummary.trim() || null,
        internalNote: internalNote.trim() || null,
        nextAction: nextAction.trim() || null,
        isSharedWithStudent,
        displayName: displayName.trim() || null,
        materials,
      });
      router.back();
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (isNew) return;
    Alert.alert('회차 기록을 삭제할까요?', '되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteLessonSession(params.studentId, params.sessionId);
            router.back();
          } catch (error) {
            Alert.alert('삭제 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ title: isNew ? '회차 기록 작성' : '회차 기록 수정' }} />
      <ScrollView style={{ backgroundColor: background }} contentContainerStyle={styles.container}>
        <Card style={styles.metaRow}>
          <View style={[styles.field, styles.dateField]}>
            <ThemedText style={styles.metaLabel}>날짜</ThemedText>
            <TextInput
              style={[styles.input, styles.compactInput, { color: text, backgroundColor: surfaceSecondary }]}
              value={lessonDate}
              onChangeText={setLessonDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={textSecondary}
            />
          </View>
          <View style={[styles.field, styles.roundField]}>
            <ThemedText style={styles.metaLabel}>회차</ThemedText>
            <TextInput
              style={[styles.input, styles.compactInput, { color: text, backgroundColor: surfaceSecondary }]}
              value={sessionRound}
              onChangeText={setSessionRound}
              placeholder="1"
              keyboardType="decimal-pad"
              placeholderTextColor={textSecondary}
            />
          </View>
          <View style={[styles.field, styles.roundField]}>
            <ThemedText style={styles.metaLabel}>차감</ThemedText>
            <TextInput
              style={[styles.input, styles.compactInput, { color: text, backgroundColor: surfaceSecondary }]}
              value={deductedRound}
              onChangeText={setDeductedRound}
              placeholder="1"
              keyboardType="decimal-pad"
              placeholderTextColor={textSecondary}
            />
          </View>
          <View style={styles.statusField}>
            <ThemedText style={styles.metaLabel}>상태</ThemedText>
            <View style={styles.chipRowCompact}>
              {STATUS_OPTIONS.map((option) => {
                const selected = option === status;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setStatus(option)}
                    style={[
                      styles.chipCompact,
                      { backgroundColor: selected ? primary : surfaceSecondary },
                    ]}>
                    <ThemedText style={[styles.chipTextCompact, { color: selected ? '#fff' : text }]}>
                      {option}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>

        <Card>
          <ThemedText style={styles.label}>수업 주제</ThemedText>
          <TextInput
            style={[styles.input, { color: text, backgroundColor: surfaceSecondary }]}
            value={topic}
            onChangeText={setTopic}
            placeholder="예: 자기소개서 1차 첨삭"
            placeholderTextColor={textSecondary}
          />
        </Card>

        <Card>
          <ThemedText style={styles.label}>표시 이름 (선택)</ThemedText>
          <ThemedText style={[styles.hint, { color: textSecondary }]}>
            비워두면 {sessionRound || 'N'}회차로 표시됩니다.
          </ThemedText>
          <TextInput
            style={[styles.input, { color: text, backgroundColor: surfaceSecondary }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="예: OT, 최종 점검"
            placeholderTextColor={textSecondary}
          />
        </Card>

        <Card>
          <ThemedText style={styles.label}>학생 공개 요약</ThemedText>
          <ThemedText style={[styles.hint, { color: textSecondary }]}>
            공개로 저장하면 학생 마이페이지·상시 피드백에 그대로 보입니다.
          </ThemedText>
          <TextInput
            style={[styles.input, styles.multiline, { color: text, backgroundColor: surfaceSecondary }]}
            value={studentSummary}
            onChangeText={setStudentSummary}
            placeholder="학생에게 보여줄 이번 수업 요약"
            placeholderTextColor={textSecondary}
            multiline
          />
        </Card>

        <Card>
          <ThemedText style={styles.label}>다음 수업까지 할 것</ThemedText>
          <ThemedText style={[styles.hint, { color: textSecondary }]}>
            줄바꿈으로 여러 항목을 구분하면 학생 화면에서 체크리스트로 보입니다.
          </ThemedText>
          <TextInput
            style={[styles.input, styles.multiline, { color: text, backgroundColor: surfaceSecondary }]}
            value={nextAction}
            onChangeText={setNextAction}
            placeholder={'예: 자기소개서 2차 초안 작성\n생기부 보완 자료 준비'}
            placeholderTextColor={textSecondary}
            multiline
          />
        </Card>

        <Card>
          <View style={styles.noteLabelRow}>
            <Ionicons name="lock-closed-outline" size={14} color={textSecondary} />
            <ThemedText style={styles.label}>내부 메모 (학생에게 보이지 않음)</ThemedText>
          </View>
          <TextInput
            style={[styles.input, styles.multiline, { color: text, backgroundColor: surfaceSecondary }]}
            value={internalNote}
            onChangeText={setInternalNote}
            placeholder="컨설턴트·실장만 보는 메모"
            placeholderTextColor={textSecondary}
            multiline
          />
        </Card>

        <Pressable
          style={[styles.shareToggle, { borderColor: border }]}
          onPress={() => setIsSharedWithStudent((prev) => !prev)}>
          <View style={styles.shareToggleText}>
            <ThemedText type="defaultSemiBold">학생에게 이 회차 공개</ThemedText>
            <ThemedText style={[styles.hint, { color: textSecondary }]}>
              끄면 회차 기록·자료가 학생에게 보이지 않습니다.
            </ThemedText>
          </View>
          <View
            style={[
              styles.switchTrack,
              { backgroundColor: isSharedWithStudent ? primary : surfaceSecondary },
            ]}>
            <View
              style={[
                styles.switchThumb,
                { transform: [{ translateX: isSharedWithStudent ? 18 : 0 }] },
              ]}
            />
          </View>
        </Pressable>

        <View style={styles.sectionHeaderRow}>
          <ThemedText type="defaultSemiBold">자료·문서 링크</ThemedText>
          <Pressable style={[styles.addChip, { backgroundColor: primaryMuted }]} onPress={addMaterial}>
            <Ionicons name="add" size={16} color={primary} />
            <ThemedText style={[styles.addChipText, { color: primary }]}>추가</ThemedText>
          </Pressable>
        </View>

        {materials.map((material, index) => (
          <Card key={index} style={styles.materialCard}>
            <View style={styles.materialHeaderRow}>
              <ThemedText style={[styles.hint, { color: textSecondary }]}>자료 {index + 1}</ThemedText>
              <Pressable onPress={() => removeMaterial(index)}>
                <Ionicons name="trash-outline" size={16} color={danger} />
              </Pressable>
            </View>
            <TextInput
              style={[styles.input, { color: text, backgroundColor: surfaceSecondary }]}
              value={material.title}
              onChangeText={(value) => updateMaterial(index, { title: value })}
              placeholder="자료 제목"
              placeholderTextColor={textSecondary}
            />
            <TextInput
              style={[styles.input, { color: text, backgroundColor: surfaceSecondary }]}
              value={material.url ?? ''}
              onChangeText={(value) => updateMaterial(index, { url: value })}
              placeholder="https://..."
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={textSecondary}
            />
            <TextInput
              style={[styles.input, { color: text, backgroundColor: surfaceSecondary }]}
              value={material.description ?? ''}
              onChangeText={(value) => updateMaterial(index, { description: value })}
              placeholder="설명 (선택)"
              placeholderTextColor={textSecondary}
            />
            <Pressable
              style={styles.materialShareRow}
              onPress={() => updateMaterial(index, { isSharedWithStudent: !material.isSharedWithStudent })}>
              <Ionicons
                name={material.isSharedWithStudent ? 'checkbox' : 'square-outline'}
                size={18}
                color={material.isSharedWithStudent ? primary : textSecondary}
              />
              <ThemedText style={styles.cardBody}>학생에게 공개</ThemedText>
            </Pressable>
          </Card>
        ))}

        <Button label="저장" onPress={handleSave} loading={saving} />
        {!isNew ? (
          <Button label="회차 기록 삭제" variant="ghost" onPress={handleDelete} loading={deleting} />
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: 60 },
  row2: { flexDirection: 'row', gap: Spacing.md },
  field: { flex: 1, gap: Spacing.xs },
  label: { fontSize: 13, fontWeight: '700' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  metaLabel: { fontSize: 10.5, fontWeight: '700' },
  dateField: { flex: 1.5, gap: 4 },
  roundField: { width: 44, gap: 4 },
  statusField: { flex: 1.8, gap: 4 },
  compactInput: { paddingHorizontal: Spacing.xs, paddingVertical: 6, fontSize: 12.5 },
  chipRowCompact: { flexDirection: 'row', gap: 3 },
  chipCompact: { flex: 1, paddingVertical: 6, borderRadius: Radius.pill, alignItems: 'center' },
  chipTextCompact: { fontSize: 10.5, fontWeight: '700' },
  hint: { fontSize: 12 },
  cardBody: { fontSize: 14 },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 15,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.pill },
  chipText: { fontSize: 13, fontWeight: '700' },
  noteLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shareToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  shareToggleText: { flex: 1, gap: 2 },
  switchTrack: { width: 42, height: 24, borderRadius: Radius.pill, padding: 3 },
  switchThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  addChipText: { fontSize: 13, fontWeight: '700' },
  materialCard: { gap: Spacing.sm },
  materialHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  materialShareRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
});
