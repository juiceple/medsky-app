import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Card, ConsoleScroll, Field, SectionTitle, styles } from '@/components/console';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth-context';
import { LINK_KINDS, LINK_LABELS, useCustomerLinks } from '@/lib/customer-links';
import { formatPhone } from '@/lib/format';
import { IDLE_API_STATE } from '@/lib/use-api';
import { useViewer } from '@/lib/viewer-context';

/**
 * 마이페이지.
 *
 * 계정 정보와 함께 "이 앱에서 무엇이 열리는가" 를 보여준다. 콘솔 탭이 안 보이는
 * 이유가 담당 서비스 미등록인지 로그인 계정이 달라서인지를 여기서 알 수 있어야,
 * 실장에게 물어볼 것이 분명해진다.
 */
export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth();
  const { data: me } = useViewer();
  const { links } = useCustomerLinks();

  const connected = LINK_KINDS.filter((kind) => links[kind]);

  return (
    <ConsoleScroll state={IDLE_API_STATE}>
      <ThemedText type="title">마이페이지</ThemedText>

      <Card>
        <Field label="이름" value={profile?.name ?? me?.name ?? '-'} />
        <Field label="이메일" value={user?.email ?? '-'} />
        <Field label="학교" value={profile?.school ?? '-'} />
        <Field label="연락처" value={formatPhone(profile?.phone) ?? '-'} />
      </Card>

      <SectionTitle hint="담당 서비스는 회사 명부를 따릅니다">앱에서 열리는 화면</SectionTitle>
      <Card>
        {me && me.sections.length > 0 ? (
          <View style={styles.badgeRow}>
            {me.services.map((service) => (
              <Badge key={service} tone="blue">
                {service}
              </Badge>
            ))}
            {me.role === 'manager' ? <Badge tone="emerald">전체 콘솔</Badge> : null}
          </View>
        ) : (
          <ThemedText style={styles.muted}>
            열람 가능한 콘솔이 없습니다. 담당자 계정이라면 회사에 등록된 이메일로
            로그인했는지, 컨설턴트 명부에 담당 서비스가 등록되어 있는지 확인해 주세요.
          </ThemedText>
        )}
      </Card>

      <SectionTitle hint="계정 없이 보는 진행 상황">진행 링크</SectionTitle>
      <Card>
        {connected.length > 0 ? (
          <View style={styles.badgeRow}>
            {connected.map((kind) => (
              <Badge key={kind}>{LINK_LABELS[kind]}</Badge>
            ))}
          </View>
        ) : (
          <ThemedText style={styles.muted}>연결된 링크가 없습니다.</ThemedText>
        )}
        <Link href="/progress/connect" asChild>
          <Pressable style={({ pressed }) => pressed && styles.cardPressed}>
            <ThemedText type="link">링크 관리</ThemedText>
          </Pressable>
        </Link>
      </Card>

      <Pressable
        style={({ pressed }) => [local.signOutButton, pressed && local.signOutButtonPressed]}
        onPress={signOut}>
        <ThemedText style={local.signOutText}>로그아웃</ThemedText>
      </Pressable>
    </ConsoleScroll>
  );
}

const local = StyleSheet.create({
  signOutButton: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutButtonPressed: {
    opacity: 0.7,
  },
  signOutText: {
    color: '#dc2626',
    fontWeight: '600',
  },
});
