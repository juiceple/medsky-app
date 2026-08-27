import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth-context';

const ROLE_LABEL: Record<string, string> = {
  student: '학생',
  consultant: '컨설턴트',
  manager: '매니저',
  admin: '관리자',
};

export default function HomeScreen() {
  const { profile, role, user } = useAuth();
  const displayName = profile?.name ?? user?.email ?? '회원';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">안녕하세요, {displayName}님</ThemedText>
      {role ? <ThemedText style={styles.roleBadge}>{ROLE_LABEL[role] ?? role}</ThemedText> : null}

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">수업 예약</ThemedText>
        <ThemedText style={styles.cardBody}>연동 준비 중입니다. 곧 만나보실 수 있어요.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">생기부 · 자료</ThemedText>
        <ThemedText style={styles.cardBody}>연동 준비 중입니다. 곧 만나보실 수 있어요.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">공지 · 칼럼</ThemedText>
        <ThemedText style={styles.cardBody}>연동 준비 중입니다. 곧 만나보실 수 있어요.</ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 60,
    gap: 16,
  },
  roleBadge: {
    fontSize: 13,
    opacity: 0.6,
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.25)',
    borderRadius: 12,
    padding: 16,
    gap: 6,
    marginTop: 4,
  },
  cardBody: {
    fontSize: 13,
    opacity: 0.6,
  },
});
