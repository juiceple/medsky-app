import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  bookReservation,
  deleteReservation,
  getReservations,
  settleReservation,
} from '@/lib/management-api';
import type { ReservationView } from '@/lib/management-types';

const CANCELLED = ['취소', '예약자 취소'];
const SETTLED = ['완료', '노쇼'];

function reservationTone(status: string): BadgeTone {
  if (status === '완료') return 'success';
  if (status === '노쇼') return 'danger';
  if (CANCELLED.includes(status)) return 'neutral';
  return 'primary';
}

type Props = {
  studentId: string;
  /** "회차 기록 미리 작성" 시 기본으로 채울 다음 회차 번호. */
  nextRoundHint: number;
  /** 예약/회차가 바뀔 때마다(완료 처리 등) 부모(학생 상세)의 회차 목록을 새로 불러오도록 알린다. */
  onChanged: () => void;
};

/**
 * 학생 한 명의 수업 예약 패널 — 웹의 StudentReservationPanel 과 같은 3가지를 한다:
 * 다음 수업 예약(등록/일정 변경), 완료·노쇼·취소 처리, 회차 기록 미리 작성으로 연결.
 */
export function ReservationPanel({ studentId, nextRoundHint, onChanged }: Props) {
  const router = useRouter();
  const [reservations, setReservations] = useState<ReservationView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lessonDate, setLessonDate] = useState('');
  const [lessonTime, setLessonTime] = useState('');
  const [deductedRound, setDeductedRound] = useState('1');
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const primary = useThemeColor({}, 'primary');
  const primaryMuted = useThemeColor({}, 'primaryMuted');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const danger = useThemeColor({}, 'danger');

  const load = useCallback(async () => {
    try {
      const { reservations: rows } = await getReservations(studentId);
      setReservations(rows);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '불러오지 못했습니다.');
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setLessonDate('');
    setLessonTime('');
    setDeductedRound('1');
    setTitle('');
    setMemo('');
  }

  function openNewForm() {
    resetForm();
    setFormOpen(true);
  }

  function openEditForm(reservation: ReservationView) {
    setEditingId(reservation.id);
    setLessonDate(reservation.lessonDate);
    setLessonTime(reservation.lessonTime ?? '');
    setDeductedRound(String(reservation.deductedRound));
    setTitle(reservation.title ?? '');
    setMemo(reservation.memo ?? '');
    setFormOpen(true);
  }

  async function handleSubmit() {
    if (!lessonDate.trim() || !lessonTime.trim()) {
      Alert.alert('수업 날짜와 시간을 입력해주세요.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('수업 주제를 입력해주세요.');
      return;
    }

    const deducted = Number(deductedRound);
    if (!Number.isFinite(deducted) || deducted < 0) {
      Alert.alert('차감 회차는 0 이상이어야 합니다.');
      return;
    }

    setSubmitting(true);
    try {
      await bookReservation(studentId, {
        reservationId: editingId,
        lessonDate: lessonDate.trim(),
        lessonTime: lessonTime.trim(),
        deductedRound: deducted,
        title: title.trim(),
        memo: memo.trim() || null,
      });
      setFormOpen(false);
      resetForm();
      await load();
      onChanged();
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSettle(reservation: ReservationView, status: '완료' | '노쇼' | '취소') {
    const verb = status === '취소' ? '취소' : `${status} 처리`;
    Alert.alert(`이 수업을 ${verb}할까요?`, status !== '취소' ? '회차가 차감됩니다.' : undefined, [
      { text: '아니요', style: 'cancel' },
      {
        text: '네',
        style: status === '취소' ? 'destructive' : 'default',
        onPress: async () => {
          setBusyId(reservation.id);
          try {
            await settleReservation(studentId, reservation.id, status);
            await load();
            onChanged();
          } catch (error) {
            Alert.alert('처리 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  function handleDelete(reservation: ReservationView) {
    Alert.alert('이 예약을 삭제할까요?', '되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setBusyId(reservation.id);
          try {
            await deleteReservation(studentId, reservation.id);
            await load();
          } catch (error) {
            Alert.alert('삭제 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  function openPrepSession(reservation: ReservationView) {
    router.push({
      pathname: '/session/[sessionId]',
      params: {
        sessionId: 'new',
        studentId,
        reservationId: reservation.id,
        lessonDate: reservation.lessonDate,
        sessionRound: String(nextRoundHint),
        deductedRound: String(reservation.deductedRound),
        status: '예정',
        topic: reservation.title ?? '',
      },
    });
  }

  if (loadError) {
    return (
      <Card>
        <ThemedText style={styles.cardBody}>{loadError}</ThemedText>
        <Button label="다시 시도" size="sm" variant="outline" onPress={load} />
      </Card>
    );
  }

  if (!reservations) {
    return (
      <Card style={styles.center}>
        <ActivityIndicator color={primary} />
      </Card>
    );
  }

  const upcoming = reservations.filter(
    (r) => !CANCELLED.includes(r.status) && !SETTLED.includes(r.status)
  );
  const past = reservations.filter((r) => CANCELLED.includes(r.status) || SETTLED.includes(r.status));

  return (
    <View style={styles.wrap}>
      <View style={styles.sectionHeaderRow}>
        <ThemedText type="defaultSemiBold">수업 예약</ThemedText>
        {!formOpen ? (
          <Pressable style={[styles.addChip, { backgroundColor: primaryMuted }]} onPress={openNewForm}>
            <Ionicons name="add" size={16} color={primary} />
            <ThemedText style={[styles.addChipText, { color: primary }]}>예약 추가</ThemedText>
          </Pressable>
        ) : null}
      </View>

      {formOpen ? (
        <Card style={styles.formCard}>
          <View style={styles.row2}>
            <View style={styles.field}>
              <ThemedText style={styles.label}>날짜</ThemedText>
              <TextInput
                style={[styles.input, { color: text, backgroundColor: surfaceSecondary }]}
                value={lessonDate}
                onChangeText={setLessonDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={textSecondary}
              />
            </View>
            <View style={styles.field}>
              <ThemedText style={styles.label}>시간</ThemedText>
              <TextInput
                style={[styles.input, { color: text, backgroundColor: surfaceSecondary }]}
                value={lessonTime}
                onChangeText={setLessonTime}
                placeholder="HH:MM"
                placeholderTextColor={textSecondary}
              />
            </View>
          </View>
          <View style={styles.field}>
            <ThemedText style={styles.label}>차감 회차 (0.5 단위)</ThemedText>
            <TextInput
              style={[styles.input, { color: text, backgroundColor: surfaceSecondary }]}
              value={deductedRound}
              onChangeText={setDeductedRound}
              placeholder="예: 1"
              keyboardType="decimal-pad"
              placeholderTextColor={textSecondary}
            />
          </View>
          <View style={styles.field}>
            <ThemedText style={styles.label}>수업 주제</ThemedText>
            <TextInput
              style={[styles.input, { color: text, backgroundColor: surfaceSecondary }]}
              value={title}
              onChangeText={setTitle}
              placeholder="예: 3회차 - 자기소개서 첨삭"
              placeholderTextColor={textSecondary}
            />
          </View>
          <View style={styles.field}>
            <ThemedText style={styles.label}>메모 (선택)</ThemedText>
            <TextInput
              style={[styles.input, { color: text, backgroundColor: surfaceSecondary }]}
              value={memo}
              onChangeText={setMemo}
              placeholder="내부 메모"
              placeholderTextColor={textSecondary}
            />
          </View>
          <View style={styles.formActions}>
            <Button
              label="취소"
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={() => {
                setFormOpen(false);
                resetForm();
              }}
            />
            <Button
              label={editingId ? '일정 변경' : '예약하기'}
              size="sm"
              fullWidth={false}
              loading={submitting}
              onPress={handleSubmit}
            />
          </View>
        </Card>
      ) : null}

      {upcoming.length === 0 && past.length === 0 ? (
        <ThemedText style={[styles.cardBody, { color: textSecondary }]}>등록된 예약이 없어요.</ThemedText>
      ) : null}

      {upcoming.map((reservation) => (
        <Card key={reservation.id} style={styles.reservationCard}>
          <View style={styles.sessionHeader}>
            <ThemedText type="defaultSemiBold">
              {reservation.lessonDate} {reservation.lessonTime ?? ''}
            </ThemedText>
            <Badge label={reservation.status} tone={reservationTone(reservation.status)} />
          </View>
          {reservation.title ? <ThemedText style={styles.cardBody}>{reservation.title}</ThemedText> : null}
          <ThemedText style={[styles.cardMeta, { color: textSecondary }]}>
            차감 {reservation.deductedRound}회 · {reservation.durationMinutes}분
          </ThemedText>

          <View style={styles.actionsRow}>
            <Button
              label="완료"
              size="sm"
              fullWidth={false}
              loading={busyId === reservation.id}
              onPress={() => handleSettle(reservation, '완료')}
            />
            <Button
              label="노쇼"
              size="sm"
              variant="secondary"
              fullWidth={false}
              loading={busyId === reservation.id}
              onPress={() => handleSettle(reservation, '노쇼')}
            />
            <Button
              label="일정 변경"
              size="sm"
              variant="outline"
              fullWidth={false}
              onPress={() => openEditForm(reservation)}
            />
          </View>
          <View style={styles.actionsRow}>
            {!reservation.lessonSessionId ? (
              <Button
                label="회차 기록 미리 작성"
                size="sm"
                variant="outline"
                fullWidth={false}
                onPress={() => openPrepSession(reservation)}
              />
            ) : null}
            <Button
              label="취소 처리"
              size="sm"
              variant="ghost"
              fullWidth={false}
              loading={busyId === reservation.id}
              onPress={() => handleSettle(reservation, '취소')}
            />
            {!reservation.lessonSessionId ? (
              <Pressable onPress={() => handleDelete(reservation)} style={styles.deleteIcon}>
                <Ionicons name="trash-outline" size={16} color={danger} />
              </Pressable>
            ) : null}
          </View>
        </Card>
      ))}

      {past.length > 0 ? (
        <ThemedText style={[styles.cardMeta, styles.pastLabel, { color: textSecondary }]}>지난 예약</ThemedText>
      ) : null}

      {past.map((reservation) => (
        <Card key={reservation.id} variant="flat" style={styles.reservationCard}>
          <View style={styles.sessionHeader}>
            <ThemedText style={styles.cardBody}>
              {reservation.lessonDate} {reservation.lessonTime ?? ''} · {reservation.title ?? '수업'}
            </ThemedText>
            <Badge label={reservation.status} tone={reservationTone(reservation.status)} />
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  center: { alignItems: 'center', justifyContent: 'center', minHeight: 60 },
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
  formCard: { gap: Spacing.sm },
  row2: { flexDirection: 'row', gap: Spacing.md },
  field: { flex: 1, gap: Spacing.xs },
  label: { fontSize: 13, fontWeight: '700' },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 15,
  },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.xs },
  reservationCard: { gap: 6 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  cardBody: { fontSize: 14 },
  cardMeta: { fontSize: 12 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  deleteIcon: { padding: 6 },
  pastLabel: { marginTop: Spacing.xs },
});
