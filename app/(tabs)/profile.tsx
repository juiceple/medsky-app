import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth-context';

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.section}>
        <ThemedText style={styles.label}>이름</ThemedText>
        <ThemedText style={styles.value}>{profile?.name ?? '-'}</ThemedText>
      </ThemedView>
      <ThemedView style={styles.section}>
        <ThemedText style={styles.label}>이메일</ThemedText>
        <ThemedText style={styles.value}>{user?.email ?? '-'}</ThemedText>
      </ThemedView>
      <ThemedView style={styles.section}>
        <ThemedText style={styles.label}>학교</ThemedText>
        <ThemedText style={styles.value}>{profile?.school ?? '-'}</ThemedText>
      </ThemedView>
      <ThemedView style={styles.section}>
        <ThemedText style={styles.label}>연락처</ThemedText>
        <ThemedText style={styles.value}>{profile?.phone ?? '-'}</ThemedText>
      </ThemedView>

      <Pressable
        style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutButtonPressed]}
        onPress={signOut}>
        <ThemedText style={styles.signOutText}>로그아웃</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    gap: 20,
  },
  section: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    opacity: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
  signOutButton: {
    marginTop: 'auto',
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
