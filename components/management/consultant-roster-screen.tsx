import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';

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
  cancelConsultantInvitation,
  createConsultantInvitation,
  getConsultantInvitations,
  getConsultants,
  saveConsultant,
} from '@/lib/management-api';
import {
  CONSULTANT_ROLE_TITLES,
  CONSULTANT_SERVICES,
  CONSULTANT_TRACKS,
  type ConsultantInvitation,
  type ConsultantRoleTitle,
  type ConsultantService,
  type ConsultantTrack,
  type ConsultantWithServices,
} from '@/lib/management-types';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; consultants: ConsultantWithServices[]; invitations: ConsultantInvitation[] };

type FormValues = {
  consultantId: string | null;
  name: string;
  track: ConsultantTrack | null;
  roleTitle: ConsultantRoleTitle | null;
  phone: string;
  email: string;
  career: string;
  ratePerRound: string;
  services: ConsultantService[];
};

const EMPTY_FORM: FormValues = {
  consultantId: null,
  name: '',
  track: null,
  roleTitle: null,
  phone: '',
  email: '',
  career: '',
  ratePerRound: '',
  services: [],
};

function ChipPicker<T extends string>({
  options,
  value,
  onChange,
  optional,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
  optional?: boolean;
}) {
  const primary = useThemeColor({}, 'primary');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const text = useThemeColor({}, 'text');

  return (
    <View style={styles.chipRow}>
      {optional ? (
        <Pressable
          onPress={() => onChange(null)}
          style={[styles.chip, { backgroundColor: value === null ? primary : surfaceSecondary }]}>
          <ThemedText style={[styles.chipText, { color: value === null ? '#fff' : text }]}>없음</ThemedText>
        </Pressable>
      ) : null}
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.chip, { backgroundColor: selected ? primary : surfaceSecondary }]}>
            <ThemedText style={[styles.chipText, { color: selected ? '#fff' : text }]}>{option}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function ServicePicker({
  value,
  onChange,
}: {
  value: ConsultantService[];
  onChange: (value: ConsultantService[]) => void;
}) {
  const primary = useThemeColor({}, 'primary');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const text = useThemeColor({}, 'text');

  return (
    <View style={styles.chipRow}>
      {CONSULTANT_SERVICES.map((service) => {
        const selected = value.includes(service);
        return (
          <Pressable
            key={service}
            onPress={() => onChange(selected ? value.filter((item) => item !== service) : [...value, service])}
            style={[styles.chip, { backgroundColor: selected ? primary : surfaceSecondary }]}>
            <ThemedText style={[styles.chipText, { color: selected ? '#fff' : text }]}>{service}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  const textSecondary = useThemeColor({}, 'textSecondary');
  return <ThemedText style={[styles.fieldLabel, { color: textSecondary }]}>{label}</ThemedText>;
}

/** 실장 전용: 컨설턴트 명부 조회, 등록/수정, 초대 발급/취소. */
export function ConsultantRosterScreen() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [formOpen, setFormOpen] = useState<'edit' | 'invite' | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const background = useThemeColor({}, 'background');
  const primary = useThemeColor({}, 'primary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const textTertiary = useThemeColor({}, 'textTertiary');
  const text = useThemeColor({}, 'text');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const border = useThemeColor({}, 'border');

  const load = useCallback(async () => {
    try {
      const [{ consultants }, { invitations }] = await Promise.all([getConsultants(), getConsultantInvitations()]);
      setState({ status: 'ready', consultants, invitations });
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
    await load();
    setRefreshing(false);
  }

  function openEdit(consultant?: ConsultantWithServices) {
    setForm(
      consultant
        ? {
            consultantId: consultant.id,
            name: consultant.name,
            track: consultant.track,
            roleTitle: consultant.role_title,
            phone: consultant.phone ?? '',
            email: consultant.email ?? '',
            career: consultant.career ?? '',
            ratePerRound: consultant.rate_per_round ? String(consultant.rate_per_round) : '',
            services: consultant.services,
          }
        : EMPTY_FORM
    );
    setFormOpen('edit');
  }

  function openInvite() {
    setForm(EMPTY_FORM);
    setFormOpen('invite');
  }

  async function handleSaveConsultant() {
    if (!form.name.trim() || !form.track) {
      Alert.alert('입력 필요', '이름과 담당 계열은 필수예요.');
      return;
    }
    if (form.services.length === 0) {
      Alert.alert('입력 필요', '담당 서비스를 하나 이상 선택해주세요.');
      return;
    }
    setSaving(true);
    try {
      const result = await saveConsultant({
        consultantId: form.consultantId,
        name: form.name.trim(),
        track: form.track,
        roleTitle: form.roleTitle,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        career: form.career.trim() || null,
        ratePerRound: form.ratePerRound.trim() ? Number(form.ratePerRound.trim()) : null,
        services: form.services,
      });
      Alert.alert('저장 완료', result.message);
      setFormOpen(null);
      load();
    } catch (error) {
      Alert.alert('저장 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateInvitation() {
    if (!form.name.trim() || !form.track || !form.phone.trim() || !form.email.trim()) {
      Alert.alert('입력 필요', '이름·담당 계열·연락처·이메일은 필수예요.');
      return;
    }
    if (form.services.length === 0) {
      Alert.alert('입력 필요', '담당 서비스를 하나 이상 선택해주세요.');
      return;
    }
    setSaving(true);
    try {
      const result = await createConsultantInvitation({
        name: form.name.trim(),
        track: form.track,
        roleTitle: form.roleTitle,
        phone: form.phone.trim(),
        email: form.email.trim(),
        services: form.services,
      });
      setFormOpen(null);
      load();
      Share.share({ message: `${form.name.trim()} 컨설턴트 초대 링크: ${result.url}` });
    } catch (error) {
      Alert.alert('발급 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelInvitation(invitation: ConsultantInvitation) {
    setCancelingId(invitation.id);
    try {
      await cancelConsultantInvitation(invitation.id);
      load();
    } catch (error) {
      Alert.alert('취소 실패', error instanceof Error ? error.message : '다시 시도해주세요.');
    } finally {
      setCancelingId(null);
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
    return <StatusMessage message={state.message} onRetry={load} />;
  }

  const pendingInvitations = state.invitations.filter((invitation) => ['발송 대기', '발송 완료'].includes(invitation.status));

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={primary} />}>
      <ScreenHeader title="컨설턴트 명부" subtitle={`${state.consultants.length}명 등록됨`} />

      <View style={styles.actionRow}>
        <Button label="컨설턴트 등록" size="sm" fullWidth={false} onPress={() => openEdit()} style={styles.actionButton} />
        <Button
          label="초대 발급"
          size="sm"
          variant="secondary"
          fullWidth={false}
          onPress={openInvite}
          style={styles.actionButton}
        />
        <View style={{ flex: 1 }} />
        {pendingInvitations.length > 0 ? (
          <ThemedText style={[styles.hint, { color: textTertiary }]}>발급된 초대 {pendingInvitations.length}건 대기</ThemedText>
        ) : null}
      </View>

      {pendingInvitations.length > 0 ? (
        <Card style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">발급된 초대</ThemedText>
          {pendingInvitations.map((invitation) => (
            <View key={invitation.id} style={[styles.inviteRow, { borderTopColor: border }]}>
              <View style={styles.inviteInfo}>
                <ThemedText style={styles.inviteName}>{invitation.name}</ThemedText>
                <ThemedText style={[styles.inviteMeta, { color: textSecondary }]}>
                  {invitation.track} · {invitation.status}
                </ThemedText>
              </View>
              <Button
                label="취소"
                size="sm"
                variant="ghost"
                fullWidth={false}
                loading={cancelingId === invitation.id}
                onPress={() => handleCancelInvitation(invitation)}
              />
            </View>
          ))}
        </Card>
      ) : null}

      <View style={styles.grid}>
        {state.consultants.map((consultant) => (
          <Pressable key={consultant.id} onPress={() => openEdit(consultant)} style={styles.gridItem}>
            {({ pressed }) => (
              <Card style={[styles.consultantCard, pressed && styles.cardPressed, { borderColor: pressed ? primary : border }]}>
                <View style={styles.consultantHeaderRow}>
                  <ThemedText style={styles.consultantName}>{consultant.name}</ThemedText>
                  {!consultant.user_id ? <Badge label="계정 미연결" tone="warning" /> : null}
                </View>
                <ThemedText style={[styles.consultantMeta, { color: textSecondary }]}>
                  {consultant.track}
                  {consultant.role_title ? ` · ${consultant.role_title}` : ''}
                  {consultant.rate_per_round ? ` · ${consultant.rate_per_round.toLocaleString('ko-KR')}원/회` : ' · 단가 미설정'}
                </ThemedText>
                <View style={styles.chipRow}>
                  {consultant.services.map((service) => (
                    <Badge key={service} label={service} tone="primary" />
                  ))}
                </View>
              </Card>
            )}
          </Pressable>
        ))}
      </View>

      <AppModal
        visible={formOpen != null}
        title={formOpen === 'invite' ? '컨설턴트 초대 발급' : form.consultantId ? '컨설턴트 정보 수정' : '컨설턴트 등록'}
        subtitle={formOpen === 'invite' ? '이름 · 담당 계열 · 연락처 · 이메일은 필수' : undefined}
        onClose={() => setFormOpen(null)}
        onConfirm={formOpen === 'invite' ? handleCreateInvitation : handleSaveConsultant}
        confirmLabel={formOpen === 'invite' ? '초대 링크 발급' : '저장'}
        confirmLoading={saving}>
        <TextInput
          style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
          value={form.name}
          onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
          placeholder="이름"
          placeholderTextColor={textSecondary}
        />

        <FieldLabel label="담당 계열" />
        <ChipPicker options={CONSULTANT_TRACKS} value={form.track} onChange={(track) => setForm((prev) => ({ ...prev, track }))} />

        <FieldLabel label="직책" />
        <ChipPicker
          options={CONSULTANT_ROLE_TITLES}
          value={form.roleTitle}
          optional
          onChange={(roleTitle) => setForm((prev) => ({ ...prev, roleTitle }))}
        />

        <TextInput
          style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
          value={form.phone}
          onChangeText={(phone) => setForm((prev) => ({ ...prev, phone }))}
          placeholder="연락처 (숫자만)"
          placeholderTextColor={textSecondary}
          keyboardType="phone-pad"
        />
        <TextInput
          style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
          value={form.email}
          onChangeText={(email) => setForm((prev) => ({ ...prev, email }))}
          placeholder="이메일"
          placeholderTextColor={textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {formOpen === 'edit' ? (
          <>
            <TextInput
              style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
              value={form.career}
              onChangeText={(career) => setForm((prev) => ({ ...prev, career }))}
              placeholder="경력"
              placeholderTextColor={textSecondary}
            />
            <TextInput
              style={[styles.input, { color: text, backgroundColor: surfaceSecondary, borderColor: border }]}
              value={form.ratePerRound}
              onChangeText={(ratePerRound) => setForm((prev) => ({ ...prev, ratePerRound }))}
              placeholder="개인 단가 (회차당 원, 비우면 직책 기본값)"
              placeholderTextColor={textSecondary}
              keyboardType="number-pad"
            />
          </>
        ) : null}

        <FieldLabel label="담당 서비스" />
        <ServicePicker value={form.services} onChange={(services) => setForm((prev) => ({ ...prev, services }))} />
      </AppModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: Spacing.xl, paddingTop: Spacing.xxxl + 20, paddingBottom: 60, gap: Spacing.md },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  actionButton: {},
  hint: { fontSize: 12.5 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  input: {
    height: 44,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm - 2, borderRadius: Radius.pill },
  chipText: { fontSize: 12.5, fontWeight: '700' },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
  },
  inviteInfo: { gap: 2, flexShrink: 1 },
  inviteName: { fontSize: 14, fontWeight: '700' },
  inviteMeta: { fontSize: 12.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginHorizontal: -Spacing.xs },
  gridItem: { flexGrow: 1, flexBasis: 300, minWidth: 260, marginHorizontal: Spacing.xs },
  consultantCard: { gap: Spacing.sm, borderWidth: 1, height: '100%' },
  cardPressed: { opacity: 0.92 },
  consultantHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  consultantName: { fontSize: 16, fontWeight: '700' },
  consultantMeta: { fontSize: 13 },
});
