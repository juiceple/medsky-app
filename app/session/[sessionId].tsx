import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { DetailNavShell } from '@/components/navigation/detail-nav-shell';
import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Badge, lessonStatusTone, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useBreakpoint, useIsWorkspaceWide } from '@/hooks/use-breakpoint';
import { useThemeColor } from '@/hooks/use-theme-color';
import { deleteLessonSession, getChatRooms, getStudentDetail, saveLessonSession } from '@/lib/management-api';
import type { LessonMaterialInput, LessonStatus, StudentDetail } from '@/lib/management-types';

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

type NextActionItem = { id: string; text: string };

function parseInitialNextActionItems(raw?: string): NextActionItem[] {
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => ({ id: `init-${index}`, text: line }));
}

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
 * 회차 기록 작성/수정 — 전체 화면 2열 폼(1b). 왼쪽은 입력, 오른쪽은 "학생에게
 * 보이는 모습" 미리보기로 학생 공개 요약·할 일·자료가 입력과 실시간으로
 * 동기화된다. 태블릿 세로·모바일처럼 좁은 화면에서는 미리보기가 폼 아래로
 * 내려온다. sessionId === 'new' 이면 reservationId 로 새 기록을 만들고, 그 외에는
 * 기존 기록을 고친다.
 */
export default function SessionEditorScreen() {
  const params = useLocalSearchParams<Params>();
  const router = useRouter();
  const isNew = params.sessionId === 'new';
  const breakpoint = useBreakpoint();
  const isWide = useIsWorkspaceWide();
  const sideWidth = breakpoint === 'desktop' ? 420 : 360;

  const [lessonDate, setLessonDate] = useState(params.lessonDate ?? '');
  const [sessionRound, setSessionRound] = useState(params.sessionRound ?? '');
  const [deductedRound, setDeductedRound] = useState(params.deductedRound ?? '1');
  const [status, setStatus] = useState<LessonStatus>(
    (params.status as LessonStatus) || '예정'
  );
  const [topic, setTopic] = useState(params.topic ?? '');
  const [studentSummary, setStudentSummary] = useState(params.studentSummary ?? '');
  const [internalNote, setInternalNote] = useState(params.internalNote ?? '');
  const [nextActionItems, setNextActionItems] = useState<NextActionItem[]>(() =>
    parseInitialNextActionItems(params.nextAction)
  );
  const nextItemIdRef = useRef(nextActionItems.length);
  const nextActionInputRefs = useRef<Record<string, TextInput | null>>({});
  const [isSharedWithStudent, setIsSharedWithStudent] = useState(
    params.isSharedWithStudent === '1'
  );
  const [displayName, setDisplayName] = useState(params.displayName ?? '');
  const [materials, setMaterials] = useState<LessonMaterialInput[]>(
    parseInitialMaterials(params.materials)
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 오른쪽 미리보기 상단의 학생 요약 카드·"이 회차 대화 열기" 배지에 쓰는 부가
  // 정보. 폼 작성 자체와는 무관해서, 못 불러와도 조용히 건너뛴다.
  const [context, setContext] = useState<{ detail: StudentDetail | null; chatCount: number }>({
    detail: null,
    chatCount: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const detail = await getStudentDetail(params.studentId);
        const rooms = isNew ? null : await getChatRooms(params.studentId);
        if (cancelled) return;
        setContext({
          detail,
          chatCount: rooms ? (rooms.sessions[params.sessionId]?.messageCount ?? 0) : 0,
        });
      } catch {
        // ignore — supplementary context only
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.studentId, params.sessionId, isNew]);

  const background = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const primary = useThemeColor({}, 'primary');
  const primaryMuted = useThemeColor({}, 'primaryMuted');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const danger = useThemeColor({}, 'danger');
  const warning = useThemeColor({}, 'warning');
  const warningMuted = useThemeColor({}, 'warningMuted');

  function addNextActionItem(focusAfter = true) {
    const id = `item-${nextItemIdRef.current++}`;
    setNextActionItems((prev) => [...prev, { id, text: '' }]);
    if (focusAfter) {
      requestAnimationFrame(() => {
        nextActionInputRefs.current[id]?.focus();
      });
    }
  }

  function updateNextActionItem(id: string, text: string) {
    setNextActionItems((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
  }

  function removeNextActionItem(id: string) {
    setNextActionItems((prev) => prev.filter((item) => item.id !== id));
    delete nextActionInputRefs.current[id];
  }

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

    const nextActionText = nextActionItems
      .map((item) => item.text.trim())
      .filter((text) => text.length > 0)
      .join('\n');

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
        nextAction: nextActionText || null,
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

  const studentName = context.detail?.student.student_name ?? '학생';
  const previewRoundLabel = displayName.trim() || (sessionRound ? `${sessionRound}회차` : '회차 미정');
  const previewTodos = nextActionItems.filter((item) => item.text.trim().length > 0);
  const previewMaterials = materials.filter(
    (material) => material.isSharedWithStudent && material.title.trim().length > 0
  );
  const shareTone: BadgeTone = isSharedWithStudent ? 'success' : 'warning';
  const shareLabel = isSharedWithStudent ? '공개' : '비공개';

  const topBar = (
    <View style={[styles.topBar, { backgroundColor: surface, borderBottomColor: border }]}>
      <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
        <Ionicons name="chevron-back" size={22} color={textSecondary} />
      </Pressable>
      <ThemedText style={styles.topBarTitle} numberOfLines={1}>
        {isNew ? '회차 기록 작성' : '회차 기록 수정'}
      </ThemedText>
      {breakpoint !== 'mobile' ? (
        <Badge
          label={`${studentName} · ${previewRoundLabel} · ${lessonDate || '날짜 미정'}`}
          tone="neutral"
        />
      ) : null}
      <View style={styles.topBarSpacer} />
      {breakpoint !== 'mobile' ? (
        <ThemedText style={[styles.savedHint, { color: textTertiary }]}>자동 저장 안 함</ThemedText>
      ) : null}
      {!isNew ? (
        <Button label="삭제" variant="ghost" size="sm" fullWidth={false} loading={deleting} onPress={handleDelete} />
      ) : null}
      <Button label="저장" size="sm" fullWidth={false} loading={saving} onPress={handleSave} />
    </View>
  );

  const formSection = (
    <View style={[styles.formCol, isWide && styles.formColWide]}>
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
          추가한 항목은 학생 화면에서 하나씩 체크할 수 있는 투두 리스트로 보입니다.
        </ThemedText>

        <View style={styles.todoList}>
          {nextActionItems.map((item, index) => (
            <View key={item.id} style={styles.todoRow}>
              <View style={[styles.todoBullet, { borderColor: primary }]} />
              <TextInput
                ref={(ref) => {
                  nextActionInputRefs.current[item.id] = ref;
                }}
                style={[styles.input, styles.todoInput, { color: text, backgroundColor: surfaceSecondary }]}
                value={item.text}
                onChangeText={(value) => updateNextActionItem(item.id, value)}
                placeholder={`할 일 ${index + 1}`}
                placeholderTextColor={textSecondary}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  if (index === nextActionItems.length - 1) {
                    addNextActionItem();
                  }
                }}
              />
              <Pressable onPress={() => removeNextActionItem(item.id)} hitSlop={8}>
                <Ionicons name="close-circle-outline" size={20} color={textSecondary} />
              </Pressable>
            </View>
          ))}
          {nextActionItems.length === 0 ? (
            <ThemedText style={[styles.hint, { color: textSecondary }]}>
              아직 추가한 할 일이 없습니다.
            </ThemedText>
          ) : null}
        </View>

        <Pressable
          style={[styles.addChip, styles.addTodoChip, { backgroundColor: primaryMuted }]}
          onPress={() => addNextActionItem()}>
          <Ionicons name="add" size={16} color={primary} />
          <ThemedText style={[styles.addChipText, { color: primary }]}>할 일 추가</ThemedText>
        </Pressable>
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
    </View>
  );

  const previewSection = (
    <View style={[styles.sideCol, isWide ? { width: sideWidth } : styles.sideColNarrow]}>
      {context.detail ? (
        <View style={[styles.miniCard, { backgroundColor: surface }]}>
          <Avatar name={context.detail.student.student_name} size={40} />
          <View style={styles.miniCardTexts}>
            <ThemedText style={styles.miniCardName} numberOfLines={1}>
              {context.detail.student.student_name}
              {context.detail.student.grade_level ? ` · ${context.detail.student.grade_level}` : ''}
            </ThemedText>
            <ThemedText style={[styles.miniCardMeta, { color: textSecondary }]} numberOfLines={1}>
              {context.detail.student.consultantName ? `${context.detail.student.consultantName} 컨설턴트 · ` : ''}
              잔여 {context.detail.student.balance.remaining}회
            </ThemedText>
          </View>
        </View>
      ) : null}

      <View style={[styles.previewCard, { backgroundColor: surface }]}>
        <View style={styles.previewHeadRow}>
          <Ionicons name="eye-outline" size={16} color={textSecondary} />
          <ThemedText style={styles.previewHeadLabel}>학생에게 보이는 모습</ThemedText>
          <Badge label={shareLabel} tone={shareTone} />
        </View>

        <View style={[styles.previewSessionCard, { borderColor: border }]}>
          <View style={styles.previewSessionHead}>
            <ThemedText style={styles.previewSessionTitle} numberOfLines={1}>
              {previewRoundLabel}
              {lessonDate ? ` · ${lessonDate}` : ''}
            </ThemedText>
            <Badge label={status} tone={lessonStatusTone(status)} />
          </View>
          {topic.trim() ? (
            <ThemedText style={[styles.previewSessionTopic, { color: textSecondary }]}>{topic.trim()}</ThemedText>
          ) : null}
        </View>

        <View style={[styles.previewSyncBlock, { backgroundColor: surfaceSecondary }]}>
          <View style={styles.previewSection}>
            <ThemedText style={[styles.previewLabel, { color: textSecondary }]}>수업 요약</ThemedText>
            <ThemedText style={styles.previewBody}>
              {studentSummary.trim() || '아직 작성된 요약이 없어요.'}
            </ThemedText>
          </View>

          {previewTodos.length > 0 ? (
            <View style={[styles.previewSection, styles.previewSectionBordered, { borderTopColor: border }]}>
              <ThemedText style={[styles.previewLabel, { color: textSecondary }]}>다음 수업까지 할 것</ThemedText>
              {previewTodos.map((item) => (
                <View key={item.id} style={styles.previewTodoRow}>
                  <View style={[styles.previewTodoBox, { borderColor: border }]} />
                  <ThemedText style={styles.previewTodoText} numberOfLines={1}>
                    {item.text.trim()}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          {previewMaterials.length > 0 ? (
            <View style={[styles.previewSection, styles.previewSectionBordered, { borderTopColor: border }]}>
              <ThemedText style={[styles.previewLabel, { color: textSecondary }]}>수업 자료</ThemedText>
              {previewMaterials.map((material, index) => (
                <View key={index} style={[styles.previewMaterialRow, { backgroundColor: surface }]}>
                  <Ionicons name="document-attach-outline" size={17} color={primary} />
                  <ThemedText style={[styles.previewMaterialText, { color: primary }]} numberOfLines={1}>
                    {material.title.trim()}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          {!isNew ? (
            <Pressable
              style={[styles.previewChatButton, { backgroundColor: primaryMuted }]}
              onPress={() =>
                router.push({ pathname: '/chat/[studentId]', params: { studentId: params.studentId } })
              }>
              <Ionicons name="chatbubble-ellipses-outline" size={17} color={primary} />
              <ThemedText style={[styles.previewChatText, { color: primary }]}>
                이 회차 대화 열기 · {context.chatCount}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.previewNoteBanner, { backgroundColor: warningMuted }]}>
          <Ionicons name="lock-closed-outline" size={14} color={warning} />
          <ThemedText style={[styles.previewNoteText, { color: warning }]}>
            내부 메모는 이 화면에 보이지 않습니다
          </ThemedText>
        </View>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailNavShell active="home">
        <View style={[styles.root, { backgroundColor: background }]}>
          {topBar}
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.body, isWide ? styles.bodyWide : styles.bodyNarrow]}>
            {formSection}
            {previewSection}
          </ScrollView>
        </View>
      </DetailNavShell>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, position: 'relative' },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 60,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4 },
  topBarTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, flexShrink: 1 },
  topBarSpacer: { flex: 1 },
  savedHint: { fontSize: 12 },
  body: { flexGrow: 1 },
  bodyWide: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xl, padding: Spacing.xxl, paddingBottom: 40 },
  bodyNarrow: { flexDirection: 'column', gap: Spacing.xl, padding: Spacing.xl, paddingBottom: 96 },
  formCol: { flex: 1, minWidth: 0, gap: Spacing.lg },
  formColWide: { maxWidth: 760 },
  sideCol: { gap: Spacing.lg },
  sideColNarrow: { width: '100%' },
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
  addTodoChip: { alignSelf: 'flex-start' },
  todoList: { gap: Spacing.sm },
  todoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  todoBullet: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
  todoInput: { flex: 1 },
  materialCard: { gap: Spacing.sm },
  materialHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  materialShareRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },

  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.lg,
    padding: 14,
  },
  miniCardTexts: { flex: 1, minWidth: 0, gap: 2 },
  miniCardName: { fontSize: 14, fontWeight: '700' },
  miniCardMeta: { fontSize: 12 },

  previewCard: { borderRadius: Radius.lg, padding: 14, gap: 12 },
  previewHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewHeadLabel: { fontSize: 13, fontWeight: '700', flex: 1 },
  previewSessionCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 6,
  },
  previewSessionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  previewSessionTitle: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  previewSessionTopic: { fontSize: 13.5, lineHeight: 19 },
  previewSyncBlock: { borderRadius: Radius.lg, padding: 14, gap: 12 },
  previewSection: { gap: 4 },
  previewSectionBordered: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 6 },
  previewLabel: { fontSize: 11.5, fontWeight: '700' },
  previewBody: { fontSize: 14, lineHeight: 21 },
  previewTodoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewTodoBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.6, flexShrink: 0 },
  previewTodoText: { fontSize: 13.5, flexShrink: 1 },
  previewMaterialRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12 },
  previewMaterialText: { fontSize: 13.5, fontWeight: '600', flexShrink: 1 },
  previewChatButton: { height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  previewChatText: { fontSize: 13.5, fontWeight: '700' },
  previewNoteBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 12 },
  previewNoteText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
});
