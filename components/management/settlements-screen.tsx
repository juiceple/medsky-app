import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { ThemedText } from '@/components/themed-text';
import { AppModal } from '@/components/ui/app-modal';
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
  const [confirmRow, setConfirmRow] = useState<SettlementRow | null>(null);
  const [confirming, setConfirming] = useState(false);

  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const text = useThemeColor({}, 'text');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');
  const success = useThemeColor({}, 'success');
  const danger = useThemeColor({}, 'danger');
  const dangerMuted = useThemeColor({}, 'dangerMuted');

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

  async function handleConfirm() {
    if (!confirmRow || state.status !== 'ready') return;
    setConfirming(true);
    try {
      const result = await confirmSettlement({ consultantId: confirmRow.consultant.id, periodMonth: state.periodMonth });
      Alert.alert('정산 확정', result.message);
      setConfirmRow(null);
      load(state.periodMonth);
    } catch (error) {
      Alert.alert('확정 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setConfirming(false);
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
  const confirmRate = confirmRow
    ? confirmRow.rate ?? (confirmRow.consultant.role_title ? rateByTitle.get(confirmRow.consultant.role_title)?.rate_per_round : null) ?? null
    : null;
  const confirmAmount = confirmRow && confirmRate ? confirmRate * confirmRow.roundTotal : 0;

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primary} />}>
      <ScreenHeader title="정산 · 단가" subtitle={formatPeriod(periodMonth)} />

      <View style={styles.chipRow}>
        {periods.map((period) => {
          const selected = period === periodMonth;
          return (
            <Pressable
              key={period}
              onPress={() => load(period)}
              style={[styles.chip, { backgroundColor: selected ? primary : surfaceSecondary }]}>
              <ThemedText style={[styles.chipText, { color: selected ? '#fff' : text }]}>{formatPeriod(period)}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.summaryCard} padded={false}>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryTile}>
            <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>미정산</ThemedText>
            <ThemedText style={styles.summaryValue}>{formatWon(summary.pendingAmount)}</ThemedText>
          </View>
          <View style={styles.summaryTile}>
            <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>확정</ThemedText>
            <ThemedText style={styles.summaryValue}>{formatWon(summary.confirmedAmount)}</ThemedText>
          </View>
          <View style={styles.summaryTile}>
            <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>지급완료</ThemedText>
            <ThemedText style={[styles.summaryValue, { color: success }]}>{formatWon(summary.paidAmount)}</ThemedText>
          </View>
        </View>
      </Card>
      {summary.missingRateCount > 0 ? <Badge label={`단가 미설정 ${summary.missingRateCount}건`} tone="warning" /> : null}

      <View style={styles.columns}>
        <Card style={styles.column} padded={false}>
          <ThemedText type="defaultSemiBold" style={styles.columnTitle}>
            직책별 단가
          </ThemedText>
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
                    <ThemedText style={[styles.rateValue, { color: rate ? text : textTertiary }]}>
                      {rate ? formatWon(rate.rate_per_round) : '미설정'}
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            );
          })}
        </Card>

        <Card style={styles.column} padded={false}>
          <ThemedText type="defaultSemiBold" style={styles.columnTitle}>
            컨설턴트별 정산
          </ThemedText>
          {rows.map((row) => {
            const status = row.settlement?.status ?? null;
            const busy = busyKey === row.consultant.id;
            return (
              <View key={row.consultant.id} style={[styles.settleRow, { borderTopColor: border }]}>
                <View style={styles.settleInfo}>
                  <View style={styles.settleHeaderRow}>
                    <ThemedText style={styles.rowName}>{row.consultant.name}</ThemedText>
                    <Badge label={status ?? '미정산'} tone={status === '지급완료' ? 'success' : status === '확정' ? 'primary' : 'neutral'} />
                  </View>
                  <ThemedText style={[styles.rowMeta, { color: textSecondary }]}>
                    {row.roundTotal}회 · {row.sessionCount}건{row.rate ? ` · ${formatWon(row.rate)}/회` : ' · 단가 미설정'}
                  </ThemedText>
                </View>
                <ThemedText style={styles.rowAmount}>{formatWon(row.settlement?.amount ?? row.pendingAmount)}</ThemedText>
                <View style={styles.rowButtons}>
                  {!row.settlement ? (
                    <Button
                      label="정산 확정"
                      size="sm"
                      fullWidth={false}
                      disabled={row.unsettledRoundTotal <= 0}
                      onPress={() => setConfirmRow(row)}
                    />
                  ) : (
                    <>
                      <Button
                        label={row.settlement.status === '지급완료' ? '지급완료 해제' : '지급완료 처리'}
                        size="sm"
                        variant="secondary"
                        fullWidth={false}
                        loading={busy}
                        onPress={() => handleTogglePaid(row)}
                      />
                      {row.settlement.status !== '지급완료' ? (
                        <Pressable
                          disabled={busy}
                          onPress={() => handleRevert(row)}
                          style={[styles.revertButton, { backgroundColor: dangerMuted }]}>
                          <ThemedText style={[styles.revertButtonLabel, { color: danger }]}>되돌리기</ThemedText>
                        </Pressable>
                      ) : null}
                    </>
                  )}
                </View>
              </View>
            );
          })}
          {rows.length === 0 ? (
            <View style={styles.empty}>
              <ThemedText style={[styles.emptyText, { color: textTertiary }]}>이 달에는 정산할 내역이 없어요.</ThemedText>
            </View>
          ) : null}
        </Card>
      </View>

      <AppModal
        visible={confirmRow != null}
        title="정산 확정"
        subtitle={confirmRow ? `${confirmRow.consultant.name} · ${formatPeriod(periodMonth)}` : undefined}
        onClose={() => setConfirmRow(null)}
        onConfirm={handleConfirm}
        confirmLabel="확정하기"
        confirmLoading={confirming}>
        {confirmRow ? (
          <View style={[styles.confirmBox, { backgroundColor: surfaceSecondary }]}>
            <View style={styles.confirmLine}>
              <ThemedText style={[styles.confirmLabel, { color: textSecondary }]}>진행 회차</ThemedText>
              <ThemedText style={styles.confirmValue}>{confirmRow.roundTotal}회</ThemedText>
            </View>
            <View style={styles.confirmLine}>
              <ThemedText style={[styles.confirmLabel, { color: textSecondary }]}>적용 단가</ThemedText>
              <ThemedText style={styles.confirmValue}>{confirmRate ? formatWon(confirmRate) : '미설정'}</ThemedText>
            </View>
            <View style={styles.confirmLine}>
              <ThemedText style={[styles.confirmLabel, { color: textSecondary }]}>정산 금액</ThemedText>
              <ThemedText style={styles.confirmValue}>{formatWon(confirmAmount)}</ThemedText>
            </View>
          </View>
        ) : null}
      </AppModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, paddingTop: Spacing.xxxl + 20, paddingBottom: 60, gap: Spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm - 2, borderRadius: Radius.pill },
  chipText: { fontSize: 12.5, fontWeight: '700' },
  summaryCard: { overflow: 'hidden' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  summaryTile: { flexGrow: 1, flexBasis: '33%', padding: Spacing.lg, gap: 4 },
  summaryLabel: { fontSize: 12.5 },
  summaryValue: { fontSize: 19, fontWeight: '700' },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  column: { flexGrow: 1, flexBasis: 320, minWidth: 280, overflow: 'hidden' },
  columnTitle: { padding: Spacing.lg, paddingBottom: Spacing.sm },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rateTitle: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  rateValue: { fontSize: 13.5, fontWeight: '700' },
  rateEditRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rateInput: {
    height: 34,
    width: 100,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sm,
    fontSize: 13,
  },
  settleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  settleInfo: { flex: 1, minWidth: 150, gap: 2 },
  settleHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowName: { fontSize: 14, fontWeight: '700' },
  rowMeta: { fontSize: 12.5 },
  rowAmount: { fontSize: 16, fontWeight: '700' },
  rowButtons: { flexDirection: 'row', gap: Spacing.sm },
  revertButton: { height: 36, paddingHorizontal: Spacing.md, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  revertButtonLabel: { fontSize: 12.5, fontWeight: '600' },
  empty: { padding: Spacing.xxl, alignItems: 'center' },
  emptyText: { fontSize: 13.5 },
  confirmBox: { padding: Spacing.md, borderRadius: Radius.lg, gap: Spacing.sm },
  confirmLine: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  confirmLabel: { fontSize: 13 },
  confirmValue: { fontSize: 13.5, fontWeight: '600' },
});
