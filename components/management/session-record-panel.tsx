import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { LessonSessionFull } from '@/lib/management-types';

/**
 * 선택된 회차 기록 상세 카드 — 태블릿 가로(2a)·PC(2b)에서 타임라인 옆 고정
 * 컬럼으로 쓴다. 모바일/태블릿 세로는 타임라인 카드를 눌러 그 자리에서 펼치는
 * 방식(student-timeline-screen의 인라인 확장)을 그대로 쓰고, 이 패널은 "회차를
 * 선택하면 옆에서 본다"는 넓은 화면 전용 UX다.
 */
export function SessionRecordPanel({
  session,
  chatCount,
  onEdit,
  onOpenChat,
  onDelete,
  deleting,
}: {
  session: LessonSessionFull | null;
  chatCount: number;
  onEdit: () => void;
  onOpenChat: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');

  if (!session) {
    return (
      <View style={[styles.card, styles.emptyCard, { backgroundColor: surface }]}>
        <ThemedText style={[styles.emptyText, { color: textTertiary }]}>
          왼쪽 타임라인에서 회차를 선택하면 여기서 기록을 볼 수 있습니다.
        </ThemedText>
      </View>
    );
  }

  const shareTone: BadgeTone = session.is_shared_with_student ? 'success' : 'warning';
  const shareLabel = session.is_shared_with_student ? '공개' : '비공개';

  return (
    <View style={[styles.card, { backgroundColor: surface }]}>
      <View style={styles.headRow}>
        <View style={styles.headTexts}>
          <ThemedText style={[styles.eyebrow, { color: textTertiary }]}>회차 기록</ThemedText>
          <ThemedText style={styles.title}>
            {session.display_name || `${session.session_round}회차`} · {session.lesson_date}
          </ThemedText>
        </View>
        <Badge label={shareLabel} tone={shareTone} />
      </View>

      <View style={[styles.section, { borderTopColor: border }]}>
        <ThemedText style={[styles.sectionLabel, { color: textSecondary }]}>학생 공개 요약</ThemedText>
        <ThemedText style={styles.sectionBody}>
          {session.student_summary ?? '아직 작성된 요약이 없어요.'}
        </ThemedText>
      </View>

      {session.internal_note ? (
        <View style={[styles.section, { borderTopColor: border }]}>
          <ThemedText style={[styles.sectionLabel, { color: textSecondary }]}>🔒 내부 메모 · 학생에게 안 보임</ThemedText>
          <View style={[styles.noteBox, { backgroundColor: `${primary}0D` }]}>
            <ThemedText style={styles.sectionBody}>{session.internal_note}</ThemedText>
          </View>
        </View>
      ) : null}

      {session.materials.length > 0 ? (
        <View style={[styles.section, { borderTopColor: border }]}>
          <ThemedText style={[styles.sectionLabel, { color: textSecondary }]}>첨부 자료</ThemedText>
          {session.materials.map((material) => (
            <Pressable
              key={material.id}
              style={[styles.materialRow, { backgroundColor: surfaceSecondary }]}
              disabled={!material.url}
              onPress={() => material.url && Linking.openURL(material.url)}>
              <Ionicons name="document-attach-outline" size={15} color={material.url ? primary : textSecondary} />
              <ThemedText style={[styles.materialText, { color: material.url ? primary : textSecondary }]} numberOfLines={1}>
                {material.title}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={[styles.actionsRow, { borderTopColor: border }]}>
        <Button label="기록 수정" size="sm" variant="outline" fullWidth={false} onPress={onEdit} />
        <Button label={`대화 ${chatCount}`} size="sm" variant="secondary" fullWidth={false} onPress={onOpenChat} />
        <Button label="삭제" size="sm" variant="ghost" fullWidth={false} loading={deleting} onPress={onDelete} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  emptyCard: { minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13.5, lineHeight: 19, textAlign: 'center' },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm },
  headTexts: { gap: 2 },
  eyebrow: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4 },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  section: { gap: 4, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.md },
  sectionLabel: { fontSize: 11.5, fontWeight: '700' },
  sectionBody: { fontSize: 14, lineHeight: 21 },
  noteBox: { borderRadius: 10, padding: 10 },
  materialRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12 },
  materialText: { fontSize: 13.5, fontWeight: '600', flexShrink: 1 },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
  },
});
