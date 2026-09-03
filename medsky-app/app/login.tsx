import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
} from 'react-native';

import { AntDesign } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth-context';

type EmailMode = 'signIn' | 'signUp';

const TABLET_BREAKPOINT = 768;

export default function LoginScreen() {
  const { signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailMode>('signIn');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setGoogleSubmitting(true);
    setErrorMessage(null);
    const { error } = await signInWithGoogle();
    setGoogleSubmitting(false);
    if (error) {
      setErrorMessage('구글 로그인에 실패했습니다. 다시 시도해 주세요.');
    }
  }

  async function handleEmailSubmit() {
    if (!email || !password) {
      setErrorMessage('이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    if (emailMode === 'signIn') {
      const { error } = await signInWithPassword(email.trim(), password);
      setSubmitting(false);
      if (error) {
        setErrorMessage('로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.');
      }
      return;
    }

    const { error, needsEmailConfirmation } = await signUpWithPassword(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setErrorMessage('회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    if (needsEmailConfirmation) {
      setInfoMessage('가입 확인 이메일을 보냈어요. 메일함을 확인해 주세요.');
    }
  }

  function toggleEmailMode() {
    setEmailMode((mode) => (mode === 'signIn' ? 'signUp' : 'signIn'));
    setErrorMessage(null);
    setInfoMessage(null);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ThemedView style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <ThemedView
            style={[
              styles.container,
              isTablet && styles.containerTablet,
              { paddingHorizontal: isTablet ? 0 : 24 },
            ]}>
            <ThemedText type="title" style={[styles.title, isTablet && styles.titleTablet]}>
              메드스카이
            </ThemedText>
            <ThemedText style={[styles.subtitle, isTablet && styles.subtitleTablet]}>
              로그인 후 이용해 주세요
            </ThemedText>

            <Pressable
              style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed]}
              onPress={handleGoogleSignIn}
              disabled={googleSubmitting}>
              {googleSubmitting ? (
                <ActivityIndicator color="#1f1f1f" />
              ) : (
                <>
                  <AntDesign name="google" size={18} color="#1f1f1f" style={styles.googleIcon} />
                  <ThemedText style={styles.googleButtonText}>Google로 계속하기</ThemedText>
                </>
              )}
            </Pressable>

            {errorMessage ? <ThemedText style={styles.error}>{errorMessage}</ThemedText> : null}
            {infoMessage ? <ThemedText style={styles.info}>{infoMessage}</ThemedText> : null}

            {showEmailForm ? (
              <ThemedView style={styles.emailForm}>
                <TextInput
                  style={styles.input}
                  placeholder="이메일"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  editable={!submitting}
                />
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호"
                  placeholderTextColor="#999"
                  secureTextEntry
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                  editable={!submitting}
                />

                <Pressable
                  style={({ pressed }) => [styles.smallButton, pressed && styles.buttonPressed]}
                  onPress={handleEmailSubmit}
                  disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.smallButtonText}>
                      {emailMode === 'signIn' ? '이메일로 로그인' : '이메일로 가입하기'}
                    </ThemedText>
                  )}
                </Pressable>

                <Pressable onPress={toggleEmailMode} hitSlop={8}>
                  <ThemedText style={styles.linkText}>
                    {emailMode === 'signIn'
                      ? '계정이 없으신가요? 회원가입'
                      : '이미 계정이 있으신가요? 로그인'}
                  </ThemedText>
                </Pressable>
              </ThemedView>
            ) : (
              <Pressable
                onPress={() => setShowEmailForm(true)}
                hitSlop={8}
                style={styles.emailToggle}>
                <ThemedText style={styles.linkText}>아이디로 로그인 · 가입</ThemedText>
              </Pressable>
            )}
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    width: '100%',
    gap: 12,
  },
  containerTablet: {
    maxWidth: 480,
    alignSelf: 'center',
    gap: 16,
  },
  title: {
    textAlign: 'center',
  },
  titleTablet: {
    fontSize: 40,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 24,
  },
  subtitleTablet: {
    fontSize: 16,
    marginBottom: 32,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dadce0',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: '#1f1f1f',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
    textAlign: 'center',
  },
  info: {
    color: '#0a7ea4',
    fontSize: 13,
    textAlign: 'center',
  },
  emailToggle: {
    marginTop: 32,
    alignItems: 'center',
  },
  emailForm: {
    marginTop: 24,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  smallButton: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  linkText: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
