import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { bookReservation, deleteReservation, settleReservation } from '@/lib/management-api';
import type { ReservationSaveInput, ReservationStatus, ReservationView } from '@/lib/management-types';
import { formatRound, formatSlotRange, serviceRule, type ClassService } from '@/lib/reservation-rules';

import { BookLessonDialog } from './book-lesson-dialog';

const CANCELLED: ReservationStatus[] = ['취소', '예약자 취소'];

function statusTone(status: ReservationStatus): BadgeTone {
  if (status === '완료') return 'success';
  if (status === '노쇼') return 'danger';
  if (CANCELLED.includes(status)) return 'neutral';
  return 'primary';
}

export type ReservationRecordSlot = {
  /** 이 예약에 이미 딸린 회차 기록이 있는지. 없으면 "회차 기록 필요" 배지를 보여준다. */
  hasRecord: boolean;
  content: ReactNode | null;
};

/**
 * 학생 한 명의 수업 예약 관리. medsky_homepage 의 StudentReservationPanel 을
 * 그대로 옮긴 것 — 서비스는 학생 상품에서 정해져 화면에서 고르지 않고, 규칙 안내만
 * 보여준다. 예약은 팝업(BookLessonDialog)에서 잡고, 목록의 각 항목을 누르면
 * 일정 변경/완료/노쇼/취소/삭제 액션과 회차 기록 영역이 펼쳐진다.
 */
export function ReservationPanel({
  studentId,
  service,
  consultantId,
  consultantName,
  reservations,
  remaining,
  onChanged,
  renderRecord,
}: {
  studentId: string;
  service: ClassService;
  consultantId: string | null;
  consultantName: string | null;
  reservations: ReservationView[];
  remaining: number;
  onChanged: () => Promise<void> | void;
  renderRecord?: (reservation: ReservationView) => ReservationRecordSlot;
}) {
  const rule = serviceRule(service);

  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const warningMuted = useThemeColor({}, 'warningMuted');
  const danger = useThemeColor({}, 'danger');

  const [dialog, setDialog] = useState<{ open: boolean; editing: ReservationView | null }>({
    open: false,
    editing: null,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const sorted = [...reservations].sort((a, b) =>
    `${b.lessonDate}T${b.lessonTime ?? '00:00'}`.localeCompare(`${a.lessonDate}T${a.lessonTime ?? '00:00'}`)
  );

  async function handleBookSubmit(input: ReservationSaveInput) {
    await bookReservation(studentId, input);
    await onChanged();
  }

  async function handleSettle(reservation: ReservationView, status: '완료' | '노쇼' | '취소') {
    setBusyId(reservation.id);
    setRowError(null);
    try {
      await settleReservation(studentId, reservation.id, status);
      await onChanged();
    } catch (error) {
      setRowError({ id: reservation.id, message: error instanceof Error ? error.message : '다시 시도해주세요.' });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(reservation: ReservationView) {
    setBusyId(reservation.id);
    setRowError(null);
    try {
      await deleteReservation(studentId, reservation.id);
      await onChanged();
    } catch (error) {
      setRowError({ id: reservation.id, message: error instanceof Error ? error.message : '다시 시도해주세요.' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: surface }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
            수업 예약
          </ThemedText>
          <ThemedText style={[styles.headerMeta, { color: textSecondary }]}>
            남은 회차 {formatRound(remaining)}
            {consultantName ? ` · 담당 ${consultantName}` : ' · 담당 미배정'}
          </ThemedText>
        </View>
        <Button
          label="수업 예약"
          size="sm"
          fullWidth={false}
          onPress={() => setDialog({ open: true, editing: null })}
        />
      </View>

      <ThemedText style={[styles.ruleNotice, { color: textTertiary }]}>
        {service} · {rule.overlapNotice}
        {rule.allowsHalfRound ? ' 0.5회차 단위로 차감할 수 있습니다.' : ''}
      </ThemedText>

      <BookLessonDialog
        visible={dialog.open}
        onClose={() => setDialog((prev) => ({ ...prev, open: false }))}
        studentId={studentId}
        service={service}
        consultantId={consultantId}
        reservations={reservations}
        editing={dialog.editing}
        remaining={remaining}
        onSubmit={handleBookSubmit}
      />

      <View style={styles.listHeaderRow}>
        <ThemedText style={[styles.listHeaderLabel, { color: textSecondary }]}>
          예약된 수업 ({sorted.length})
        </ThemedText>
        <ThemedText style={[styles.listHeaderHint, { color: textTertiary }]}>
          수업을 누르면 회차 기록을 볼 수 있습니다.
        </ThemedText>
      </View>

      {sorted.length === 0 ? (
        <ThemedText style={[styles.emptyText, { color: textTertiary }]}>예약된 수업이 없습니다.</ThemedText>
      ) : (
        <View style={styles.list}>
          {sorted.map((reservation) => {
            const cancelled = CANCELLED.includes(reservation.status);
            const record = renderRecord?.(reservation);
            const needsRecord = Boolean(renderRecord) && !cancelled && !record?.hasRecord;
            const expanded = expandedId === reservation.id;
            const busy = busyId === reservation.id;
            const error = rowError?.id === reservation.id ? rowError.message : null;

            return (
              <View
                key={reservation.id}
                style={[
                  styles.row,
                  { borderColor: needsRecord ? '#FBBF2480' : border },
                  needsRecord && { backgroundColor: warningMuted },
                ]}>
                <Pressable
                  onPress={() => setExpandedId(expanded ? null : reservation.id)}
                  style={[styles.rowHeader, cancelled && styles.rowHeaderCancelled]}>
                  <ThemedText type="defaultSemiBold" style={styles.rowDate}>
                    {reservation.lessonDate}
                  </ThemedText>
                  <ThemedText style={[styles.rowTime, { color: textSecondary }]}>
                    {reservation.lessonTime ? formatSlotRange(reservation.lessonTime, reservation.durationMinutes) : '시간 미정'}
                  </ThemedText>
                  <ThemedText style={[styles.rowRound, { color: textTertiary }]}>
                    {formatRound(reservation.deductedRound)}
                  </ThemedText>
                  <Badge label={reservation.status} tone={statusTone(reservation.status)} />
                  {needsRecord ? <Badge label="회차 기록 필요" tone="warning" /> : null}
                  <ThemedText style={[styles.rowToggle, { color: textTertiary }]}>
                    {expanded ? '접기 ▲' : '펼치기 ▼'}
                  </ThemedText>
                </Pressable>

                {expanded ? (
                  <View style={[styles.rowBody, { borderTopColor: border }]}>
                    <View style={styles.actionsRow}>
                      <Button
                        label="일정 변경"
                        size="sm"
                        variant="outline"
                        fullWidth={false}
                        onPress={() => setDialog({ open: true, editing: reservation })}
                      />
                      <Button
                        label="완료"
                        size="sm"
                        variant="outline"
                        fullWidth={false}
                        loading={busy}
                        onPress={() => handleSettle(reservation, '완료')}
                      />
                      <Button
                        label="노쇼"
                        size="sm"
                        variant="outline"
                        fullWidth={false}
                        loading={busy}
                        onPress={() => handleSettle(reservation, '노쇼')}
                      />
                      <Button
                        label="취소"
                        size="sm"
                        variant="outline"
                        fullWidth={false}
                        loading={busy}
                        onPress={() => handleSettle(reservation, '취소')}
                      />
                      <Button
                        label="삭제"
                        size="sm"
                        variant="ghost"
                        fullWidth={false}
                        loading={busy}
                        onPress={() => handleDelete(reservation)}
                      />
                    </View>

                    {error ? <ThemedText style={[styles.errorText, { color: danger }]}>{error}</ThemedText> : null}

                    {record?.content ?? (
                      <ThemedText style={[styles.placeholderText, { color: textTertiary }]}>
                        {cancelled
                          ? '취소된 예약에는 회차 기록을 남기지 않습니다.'
                          : '이 수업을 완료 또는 노쇼로 처리하면 회차 기록이 자동으로 만들어집니다.'}
                      </ThemedText>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm },
  headerText: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 15 },
  headerMeta: { fontSize: 12 },
  ruleNotice: { fontSize: 12, lineHeight: 17 },
  listHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  listHeaderLabel: { fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  listHeaderHint: { fontSize: 11.5 },
  emptyText: { fontSize: 13.5 },
  list: { gap: Spacing.sm },
  row: { borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  rowHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  rowHeaderCancelled: { opacity: 0.6 },
  rowDate: { fontSize: 14 },
  rowTime: { fontSize: 13.5 },
  rowRound: { fontSize: 12 },
  rowToggle: { fontSize: 11.5, fontWeight: '700', marginLeft: 'auto' },
  rowBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  errorText: { fontSize: 12.5, fontWeight: '600' },
  placeholderText: { fontSize: 13.5, lineHeight: 19 },
});
