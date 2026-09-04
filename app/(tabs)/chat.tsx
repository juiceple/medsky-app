import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ChatScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">채팅</ThemedText>

      <ThemedView style={styles.card}>
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
