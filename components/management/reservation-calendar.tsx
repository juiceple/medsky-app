import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  addMonths,
  buildMonthGrid,
  dayOfMonth,
  formatDayLabel,
  formatMonthLabel,
  monthKey,
  todayInKst,
  WEEKDAY_LABELS,
} from '@/lib/reservation-calendar';
import { formatRound, formatSlotRange } from '@/lib/reservation-rules';
import type { ReservationStatus, ReservationView } from '@/lib/management-types';

const CANCELLED = new Set<ReservationStatus>(['취소', '예약자 취소']);

function chunkIntoWeeks(days: string[]): string[][] {
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

/**
 * 수업 예약 월간 캘린더 (날짜 선택용).
 *
 * medsky_homepage 의 ReservationCalendar 를 이 학생 한 명 스코프에 맞게 옮긴 것 —
 * 여러 서비스가 섞이는 실장 콘솔용 색상 구분(SERVICE_LEGEND)은 필요 없어서 뺐다.
 */
export function ReservationCalendar({
  reservations,
  selectedDate,
  onSelectDate,
  minDate,
  initialMonth,
  emptyLabel = '예약된 수업이 없습니다.',
}: {
  reservations: ReservationView[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  minDate?: string;
  initialMonth?: string;
  emptyLabel?: string;
}) {
  const today = todayInKst();
  const [month, setMonth] = useState(
    () => initialMonth ?? monthKey(selectedDate || reservations[0]?.lessonDate || today)
  );

  const surface = useThemeColor({}, 'surface');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const primary = useThemeColor({}, 'primary');
  const primaryMuted = useThemeColor({}, 'primaryMuted');

  const byDate = new Map<string, ReservationView[]>();
  for (const reservation of reservations) {
    const list = byDate.get(reservation.lessonDate) ?? [];
    list.push(reservation);
    byDate.set(reservation.lessonDate, list);
  }

  const weeks = chunkIntoWeeks(buildMonthGrid(month));
  const selectedList = selectedDate ? byDate.get(selectedDate) ?? [] : [];

  return (
    <View style={styles.container}>
      <MonthHeader month={month} onChange={setMonth} textSecondary={textSecondary} text={text} />

      <View style={[styles.grid, { borderColor: border }]}>
        <View style={[styles.weekRow, { backgroundColor: surfaceSecondary }]}>
          {WEEKDAY_LABELS.map((label) => (
            <View key={label} style={styles.cell}>
              <ThemedText style={[styles.weekdayLabel, { color: textSecondary }]}>{label}</ThemedText>
            </View>
          ))}
        </View>

        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((date) => {
              const inMonth = monthKey(date) === month;
              const items = byDate.get(date) ?? [];
              const isToday = date === today;
              const isSelected = date === selectedDate;
              const tooEarly = Boolean(minDate) && date < (minDate as string);
              const allCancelled = items.length > 0 && items.every((item) => CANCELLED.has(item.status));

              return (
                <Pressable
                  key={date}
                  disabled={tooEarly}
                  onPress={() => onSelectDate(date)}
                  style={[
                    styles.cell,
                    styles.dayCell,
                    { backgroundColor: surface },
                    isSelected && { borderColor: primary, borderWidth: 2, backgroundColor: primaryMuted },
                    tooEarly && styles.dayCellDisabled,
                  ]}>
                  <View
                    style={[
                      styles.dayNumber,
                      isToday && { backgroundColor: text },
                    ]}>
                    <ThemedText
                      style={[
                        styles.dayNumberText,
                        {
                          color: isToday ? surface : tooEarly ? textTertiary : inMonth ? text : textTertiary,
                        },
                      ]}>
                      {dayOfMonth(date)}
                    </ThemedText>
                  </View>
                  {items.length > 0 ? (
                    <View
                      style={[
                        styles.dayDot,
                        { backgroundColor: allCancelled ? textTertiary : primary },
                      ]}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {selectedDate ? (
        <View style={[styles.dayDetail, { borderColor: border, backgroundColor: surface }]}>
          <ThemedText type="defaultSemiBold">{formatDayLabel(selectedDate)}</ThemedText>
          {selectedList.length === 0 ? (
            <ThemedText style={[styles.emptyText, { color: textTertiary }]}>{emptyLabel}</ThemedText>
          ) : (
            <View style={styles.dayList}>
              {selectedList.map((item) => (
                <ThemedText
                  key={item.id}
                  style={[styles.dayListItem, { color: CANCELLED.has(item.status) ? textTertiary : textSecondary }]}>
                  {item.lessonTime ? formatSlotRange(item.lessonTime, item.durationMinutes) : '시간 미정'} ·{' '}
                  {formatRound(item.deductedRound)} · {item.status}
                </ThemedText>
              ))}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

function MonthHeader({
  month,
  onChange,
  text,
  textSecondary,
}: {
  month: string;
  onChange: (next: string) => void;
  text: string;
  textSecondary: string;
}) {
  return (
    <View style={styles.monthHeaderRow}>
      <Pressable hitSlop={8} onPress={() => onChange(addMonths(month, -1))} style={styles.navButton}>
        <ThemedText style={[styles.navLabel, { color: textSecondary }]}>{'←'}</ThemedText>
      </Pressable>
      <ThemedText type="defaultSemiBold" style={[styles.monthLabel, { color: text }]}>
        {formatMonthLabel(month)}
      </ThemedText>
      <Pressable hitSlop={8} onPress={() => onChange(addMonths(month, 1))} style={styles.navButton}>
        <ThemedText style={[styles.navLabel, { color: textSecondary }]}>{'→'}</ThemedText>
      </Pressable>
    </View>
  );
}

const CELL_SIZE = 42;

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  monthHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  navLabel: { fontSize: 15, fontWeight: '700' },
  monthLabel: { fontSize: 15 },
  grid: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, minHeight: CELL_SIZE, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  dayCell: { gap: 3, borderWidth: 0 },
  dayCellDisabled: { opacity: 0.35 },
  dayNumber: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dayNumberText: { fontSize: 13, fontWeight: '600' },
  weekdayLabel: { fontSize: 11, fontWeight: '700' },
  dayDot: { width: 5, height: 5, borderRadius: 2.5 },
  dayDetail: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md, gap: Spacing.xs },
  dayList: { gap: 4, marginTop: 2 },
  dayListItem: { fontSize: 12.5 },
  emptyText: { fontSize: 13, marginTop: 2 },
});
