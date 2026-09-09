import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  confirmSettlement,
  getPayRates,
  getSettlements,
  revertSettlement,
  savePayRate,
  toggleSettlementPaid,
} from '@/lib/management-api';
import {
  CONSULTANT_ROLE_TITLES,
  type ConsultantPayRate,
  type ConsultantRoleTitle,
  type SettlementRow,
  type SettlementSummary,
} from '@/lib/management-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      periodMonth: string;
      periods: string[];
      rows: SettlementRow[];
      summary: SettlementSummary;
      payRates: ConsultantPayRate[];
    };

function formatWon(amount: number) {
  return `${amount.toLocaleString('ko-KR')}원`;
}

function formatPeriod(periodMonth: string) {
  const [year, month] = periodMonth.split('-');
  return `${year}년 ${Number(month)}월`;
}

/** 실장 전용: 월별 정산 확정/되돌리기/지급완료 + 직책별 단가 관리. */
export function SettlementsScreen() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [rateEditing, setRateEditing] = useState<ConsultantRoleTitle | null>(null);
  const [rateValue, setRateValue] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const text = useThemeColor({}, 'text');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const success = useThemeColor({}, 'success');

  const load = useCallback(async (periodMonth?: string) => {
    try {
      const [settlements, { payRates }] = await Promise.all([getSettlements(periodMonth), getPayRates()]);
      setState({
        status: 'ready',
        periodMonth: settlements.periodMonth,
        periods: settlements.periods,
        rows: settlements.rows,
        summary: settlements.summary,
        payRates,
      });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : '불러오지 못했습니다.' });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load(state.status === 'ready' ? state.periodMonth : undefined);
    setRefreshing(false);
  }

  async function handleConfirm(row: SettlementRow) {
    if (state.status !== 'ready') return;
    setBusyKey(row.consultant.id);
    try {
      const result = await confirmSettlement({ consultantId: row.consultant.id, periodMonth: state.periodMonth });
      Alert.alert('정산 확정', result.message);
      load(state.periodMonth);
    } catch (error) {
      Alert.alert('확정 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRevert(row: SettlementRow) {
    if (!row.settlement) return;
    setBusyKey(row.consultant.id);
    try {
      await revertSettlement(row.settlement.id);
      if (state.status === 'ready') load(state.periodMonth);
    } catch (error) {
      Alert.alert('되돌리기 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleTogglePaid(row: SettlementRow) {
    if (!row.settlement) return;
    setBusyKey(row.consultant.id);
    try {
      await toggleSettlementPaid(row.settlement.id);
      if (state.status === 'ready') load(state.periodMonth);
    } catch (error) {
      Alert.alert('처리 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSaveRate() {
    if (!rateEditing || !rateValue.trim()) return;
    setSavingRate(true);
    try {
      await savePayRate({ roleTitle: rateEditing, ratePerRound: Number(rateValue.trim()) });
      setRateEditing(null);
      setRateValue('');
      if (state.status === 'ready') load(state.periodMonth);
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSavingRate(false);
    }
  }

  if (state.status === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: background }]}>
        <ActivityIndicator color={primary} />
      </View>
    );
  }

  if (state.status === 'error') {
    return <StatusMessage message={state.message} onRetry={() => load()} />;
  }

  const { periodMonth, periods, rows, summary, payRates } = state;
  const rateByTitle = new Map(payRates.map((rate) => [rate.role_title, rate]));

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primary} />}>
      <ScreenHeader title="정산" subtitle={formatPeriod(periodMonth)} />

      <View style={styles.chipRow}>
        {periods.map((period) => {
          const selected = period === periodMonth;
          return (
            <Pressable
              key={period}
              onPress={() => load(period)}
              style={[styles.chip, { backgroundColor: selected ? primary : surfaceSecondary }]}>
              <ThemedText style={[styles.chipText, { color: selected ? '#fff' : text }]}>
                {formatPeriod(period)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>미정산</ThemedText>
          <ThemedText style={styles.summaryValue}>{formatWon(summary.pendingAmount)}</ThemedText>
        </View>
        <View style={styles.summaryRow}>
          <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>확정</ThemedText>
          <ThemedText style={styles.summaryValue}>{formatWon(summary.confirmedAmount)}</ThemedText>
        </View>
        <View style={styles.summaryRow}>
          <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>지급완료</ThemedText>
          <ThemedText style={[styles.summaryValue, { color: success }]}>{formatWon(summary.paidAmount)}</ThemedText>
        </View>
        {summary.missingRateCount > 0 ? (
          <Badge label={`단가 미설정 ${summary.missingRateCount}건`} tone="warning" />
        ) : null}
      </Card>

      <ThemedText type="defaultSemiBold">직책별 단가</ThemedText>
      <Card style={{ gap: Spacing.sm }}>
        {CONSULTANT_ROLE_TITLES.map((title) => {
          const rate = rateByTitle.get(title);
          const editing = rateEditing === title;
          return (
            <View key={title} style={[styles.rateRow, { borderTopColor: border }]}>
              <ThemedText style={styles.rateTitle}>{title}</ThemedText>
              {editing ? (
                <View style={styles.rateEditRow}>
                  <TextInput
                    style={[styles.rateInput, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
                    value={rateValue}
                    onChangeText={setRateValue}
                    keyboardType="number-pad"
                    autoFocus
                  />
                  <Button label="저장" size="sm" fullWidth={false} loading={savingRate} onPress={handleSaveRate} />
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    setRateEditing(title);
                    setRateValue(rate ? String(rate.rate_per_round) : '');
                  }}>
                  <ThemedText style={[styles.rateValue, { color: rate ? text : textSecondary }]}>
                    {rate ? formatWon(rate.rate_per_round) : '미설정'}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          );
        })}
      </Card>

      <ThemedText type="defaultSemiBold">컨설턴트별 정산</ThemedText>
      <View style={{ gap: Spacing.md }}>
        {rows.map((row) => {
          const status = row.settlement?.status ?? null;
          const busy = busyKey === row.consultant.id;
          return (
            <Card key={row.consultant.id} style={{ gap: Spacing.xs }}>
              <View style={styles.rowHeader}>
                <ThemedText style={styles.rowName}>{row.consultant.name}</ThemedText>
                {status ? (
                  <Badge label={status} tone={status === '지급완료' ? 'success' : 'primary'} />
                ) : (
                  <Badge label="미정산" tone="neutral" />
                )}
              </View>
              <ThemedText style={[styles.rowMeta, { color: textSecondary }]}>
                {row.roundTotal}회 · {row.sessionCount}건
                {row.rate ? ` · ${formatWon(row.rate)}/회` : ' · 단가 미설정'}
              </ThemedText>
              <ThemedText style={styles.rowAmount}>
                {formatWon(row.settlement?.amount ?? row.pendingAmount)}
              </ThemedText>
              <View style={styles.rowButtons}>
                {!row.settlement ? (
                  <Button
                    label="정산 확정"
                    size="sm"
                    fullWidth={false}
                    loading={busy}
                    disabled={row.unsettledRoundTotal <= 0}
                    onPress={() => handleConfirm(row)}
                  />
                ) : (
                  <>
                    <Button
                      label={row.settlement.status === '지급완료' ? '지급완료 해제' : '지급완료 처리'}
                      size="sm"
                      fullWidth={false}
                      loading={busy}
                      onPress={() => handleTogglePaid(row)}
                    />
                    {row.settlement.status !== '지급완료' ? (
                      <Button
                        label="되돌리기"
                        size="sm"
                        variant="ghost"
                        fullWidth={false}
                        loading={busy}
                        onPress={() => handleRevert(row)}
                      />
                    ) : null}
                  </>
                )}
              </View>
            </Card>
          );
        })}
        {rows.length === 0 ? (
          <ThemedText style={[styles.empty, { color: textSecondary }]}>이 달에는 정산할 내역이 없어요.</ThemedText>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, paddingTop: Spacing.xxxl + 20, paddingBottom: 60, gap: Spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm - 2, borderRadius: Radius.pill },
  chipText: { fontSize: 12.5, fontWeight: '700' },
  summaryCard: { gap: Spacing.xs },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 15, fontWeight: '700' },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
  },
  rateTitle: { fontSize: 13.5, fontWeight: '600', flexShrink: 1 },
  rateValue: { fontSize: 14, fontWeight: '700' },
  rateEditRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rateInput: {
    height: 36,
    width: 110,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sm,
    fontSize: 13,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 12.5 },
  rowAmount: { fontSize: 17, fontWeight: '800' },
  rowButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  empty: { textAlign: 'center', marginTop: 20, fontSize: 14 },
});
