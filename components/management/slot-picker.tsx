import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useSlotAvailability } from '@/hooks/use-slot-availability';
import {
  formatMinutesToTime,
  parseTimeToMinutes,
  serviceRule,
  type ClassService,
} from '@/lib/reservation-rules';

const REASON_LABELS: Record<string, string> = {
  '서비스 전체': '이미 예약된 시간',
  컨설턴트: '담당 컨설턴트의 다른 수업',
  학생: '이 학생의 다른 수업',
};

/**
 * 시작 시각 고르기. medsky_homepage 의 SlotPicker 를 그대로 옮긴 것이다.
 *
 * 막힌 칸은 편의상 회색 처리일 뿐이고, 최종 차단은 서버(mobile API route)가 한다.
 */
export function SlotPicker({
  lessonDate,
  service,
  durationMinutes,
  consultantId,
  studentId,
  excludeId,
  value,
  onChange,
}: {
  lessonDate: string;
  service: ClassService;
  durationMinutes?: number;
  consultantId?: string | null;
  studentId?: string | null;
  excludeId?: string | null;
  value: string;
  onChange: (time: string) => void;
}) {
  const duration = durationMinutes ?? serviceRule(service).defaultDurationMinutes;

  const surface = useThemeColor({}, 'surface');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const primary = useThemeColor({}, 'primary');
  const danger = useThemeColor({}, 'danger');

  const { slots, loading, error } = useSlotAvailability({
    lessonDate,
    service,
    durationMinutes: duration,
    consultantId,
    studentId,
    excludeId,
  });

  if (!lessonDate) return null;

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.label, { color: textSecondary }]}>시작 시간</ThemedText>

      {loading ? <ActivityIndicator color={primary} style={styles.spinner} /> : null}
      {error ? <ThemedText style={[styles.message, { color: danger }]}>{error}</ThemedText> : null}

      {!loading && !error && slots.length === 0 ? (
        <ThemedText style={[styles.message, { color: textTertiary }]}>
          이 날짜에 예약할 수 있는 시간이 없습니다.
        </ThemedText>
      ) : null}

      {!loading && !error && slots.length > 0 ? (
        <View style={styles.grid}>
          {slots.map((slot) => {
            const selected = slot.time === value;
            return (
              <Pressable
                key={slot.time}
                disabled={!slot.available}
                onPress={() => onChange(slot.time)}
                style={[
                  styles.slot,
                  { backgroundColor: selected ? primary : slot.available ? surface : surfaceSecondary },
                  !selected && slot.available && { borderWidth: StyleSheet.hairlineWidth, borderColor: border },
                ]}>
                <ThemedText
                  style={[
                    styles.slotText,
                    {
                      color: selected ? '#fff' : slot.available ? text : textTertiary,
                      textDecorationLine: !slot.available ? 'line-through' : 'none',
                    },
                  ]}>
                  {slot.time}
                </ThemedText>
                {!slot.available && slot.reason ? (
                  <ThemedText style={[styles.reasonText, { color: textTertiary }]} numberOfLines={1}>
                    {REASON_LABELS[slot.reason] ?? slot.reason}
                  </ThemedText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <ThemedText style={[styles.hint, { color: textTertiary }]}>
        수업은 {duration}분 기준으로 진행됩니다.
        {value ? ` 선택: ${value}~${formatMinutesToTime(parseTimeToMinutes(value) + duration)}` : ''}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  label: { fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  spinner: { marginVertical: Spacing.md },
  message: { fontSize: 13.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  slot: {
    width: '22%',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  slotText: { fontSize: 14, fontWeight: '600' },
  reasonText: { fontSize: 9.5 },
  hint: { fontSize: 12 },
});
