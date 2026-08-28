import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Card, ConsoleScroll, SectionTitle, styles } from '@/components/console';
import { ThemedText } from '@/components/themed-text';
import {
  LINK_KINDS,
  LINK_LABELS,
  extractToken,
  useCustomerLinks,
  type LinkKind,
} from '@/lib/customer-links';
import { IDLE_API_STATE } from '@/lib/use-api';

/**
 * 알림톡으로 받은 진행 링크를 앱에 연결한다.
 *
 * 수시 · 정시 원서 컨설팅 고객과 생기부 학부모는 계정을 만들지 않는다. 가입 절차를
 * 끼워 넣으면 실제로 들어오는 비율이 급격히 떨어지고, 그러면 이 화면이 하려던 일
 * (진행이 눈에 보이게 만드는 것)이 성립하지 않는다. 그래서 앱도 가입을 요구하지 않고
 * 링크를 그대로 받는다.
 *
 * 링크 전체를 붙여 넣어도, 토큰만 옮겨 적어도 받는다. 고객이 어느 쪽을 하든
 * "링크가 안 된다" 는 문의가 생기지 않게 하려는 것이다.
 */

export default function ConnectScreen() {
  const router = useRouter();
  const { links, save, remove } = useCustomerLinks();

  return (
    <ConsoleScroll state={IDLE_API_STATE}>
      <ThemedText type="title">진행 링크 연결</ThemedText>
      <ThemedText style={styles.muted}>
        결제 후 알림톡으로 받은 링크를 붙여 넣으면, 로그인 없이 이 앱에서 진행 상황을
        볼 수 있습니다. 링크 주소 전체를 넣어도 되고 뒤쪽 코드만 넣어도 됩니다.
      </ThemedText>

      {LINK_KINDS.map((kind) => (
        <LinkRow
          key={kind}
          kind={kind}
          saved={links[kind]}
          onSave={async (token) => {
            await save(kind, token);
            router.push(`/progress/${kind}`);
          }}
          onRemove={() => remove(kind)}
        />
      ))}

      <SectionTitle>링크를 잃어버렸다면</SectionTitle>
      <Card>
        <ThemedText style={styles.muted}>
          수시 · 정시 원서 컨설팅은 홈페이지의 본인 확인 재진입 페이지에서 이름과
          연락처를 확인하면 새 링크가 발급됩니다. 종합 생기부 관리 학부모 링크는
          담당 실장에게 재발급을 요청해 주세요.
        </ThemedText>
      </Card>
    </ConsoleScroll>
  );
}

function LinkRow({
  kind,
  saved,
  onSave,
  onRemove,
}: {
  kind: LinkKind;
  saved: string | undefined;
  onSave: (token: string) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [value, setValue] = useState('');

  async function submit() {
    const token = extractToken(value, kind);

    if (!token) {
      Alert.alert(
        '링크를 확인해 주세요',
        `${LINK_LABELS[kind]} 링크가 아닙니다. 알림톡에 실린 주소를 그대로 붙여 넣어 주세요.`
      );
      return;
    }

    setValue('');
    await onSave(token);
  }

  return (
    <Card>
      <View style={styles.cardHeader}>
        <ThemedText style={styles.cardTitle}>{LINK_LABELS[kind]}</ThemedText>
        {saved ? (
          <Pressable onPress={onRemove}>
            <ThemedText style={local.remove}>연결 해제</ThemedText>
          </Pressable>
        ) : null}
      </View>

      {saved ? (
        <ThemedText style={styles.muted}>연결됨 · 홈에서 바로 열 수 있습니다.</ThemedText>
      ) : null}

      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="https://medsky.co.kr/student/... 또는 코드"
        placeholderTextColor="rgba(128,128,128,0.7)"
        autoCapitalize="none"
        autoCorrect={false}
        style={local.input}
        onSubmitEditing={submit}
        returnKeyType="done"
      />

      <Pressable
        onPress={submit}
        style={({ pressed }) => [local.button, pressed && styles.cardPressed]}>
        <ThemedText style={local.buttonText}>{saved ? '링크 바꾸기' : '연결하기'}</ThemedText>
      </Pressable>
    </Card>
  );
}

const local = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.35)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0a7ea4',
    marginTop: 4,
  },
  button: {
    borderRadius: 8,
    backgroundColor: '#0a7ea4',
    paddingVertical: 11,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  remove: {
    fontSize: 12,
    color: '#be123c',
  },
});
