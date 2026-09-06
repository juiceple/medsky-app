import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { AntDesign, Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/lib/auth-context';

type EmailMode = 'signIn' | 'signUp';

const TABLET_BREAKPOINT = 768;

const BRAND_BLUE = '#2871E6';
const BRAND_BLUE_PRESSED = '#1F5FC4';
const BRAND_BLUE_MUTED = '#EAF1FD';
const INK = '#111827';
const INK_MUTED = '#6B7280';
const BORDER = '#E5E7EB';

export default function LoginScreen() {
  const { signInWithGoogle, signInWithPassword, signUpWithPassword } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailMode>('signIn');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
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
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View
            style={[
              styles.container,
              isTablet && styles.containerTablet,
              { paddingHorizontal: isTablet ? 0 : 24 },
            ]}>
            <View style={styles.brandBlock}>
              <View style={styles.logoBadge}>
                <Image
                  source={require('@/assets/images/medsky-logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.brandTitle}>메드스카이</Text>
              <Text style={styles.brandTagline}>의약학계열 입시의 시작</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>로그인</Text>
              <Text style={styles.subtitle}>계정으로 로그인 후 이용해 주세요</Text>

              <Pressable
                style={({ pressed }) => [styles.googleButton, pressed && styles.googleButtonPressed]}
                onPress={handleGoogleSignIn}
                disabled={googleSubmitting}>
                {googleSubmitting ? (
                  <ActivityIndicator color={INK} />
                ) : (
                  <>
                    <AntDesign name="google" size={18} color={INK} style={styles.googleIcon} />
                    <Text style={styles.googleButtonText}>Google로 계속하기</Text>
                  </>
                )}
              </Pressable>

              {errorMessage ? (
                <View style={styles.messageRow}>
                  <Ionicons name="alert-circle" size={15} color="#DC2626" />
                  <Text style={styles.error}>{errorMessage}</Text>
                </View>
              ) : null}
              {infoMessage ? (
                <View style={styles.messageRow}>
                  <Ionicons name="checkmark-circle" size={15} color={BRAND_BLUE} />
                  <Text style={styles.info}>{infoMessage}</Text>
                </View>
              ) : null}

              {showEmailForm ? (
                <View style={styles.emailForm}>
                  <View style={styles.divider} />

                  <TextInput
                    style={[styles.input, focusedField === 'email' && styles.inputFocused]}
                    placeholder="이메일"
                    placeholderTextColor="#9AA0A6"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    editable={!submitting}
                  />
                  <TextInput
                    style={[styles.input, focusedField === 'password' && styles.inputFocused]}
                    placeholder="비밀번호"
                    placeholderTextColor="#9AA0A6"
                    secureTextEntry
                    autoComplete="password"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    editable={!submitting}
                  />

                  <Pressable
                    style={({ pressed }) => [
                      styles.submitButton,
                      pressed && styles.submitButtonPressed,
                    ]}
                    onPress={handleEmailSubmit}
                    disabled={submitting}>
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        {emailMode === 'signIn' ? '이메일로 로그인' : '이메일로 가입하기'}
                      </Text>
                    )}
                  </Pressable>

                  <Pressable onPress={toggleEmailMode} hitSlop={8}>
                    <Text style={styles.linkText}>
                      {emailMode === 'signIn'
                        ? '계정이 없으신가요? 회원가입'
                        : '이미 계정이 있으신가요? 로그인'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setShowEmailForm(true)}
                  hitSlop={8}
                  style={styles.emailToggle}>
                  <Text style={styles.linkText}>아이디로 로그인 · 가입</Text>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  page: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  container: {
    width: '100%',
  },
  containerTablet: {
    maxWidth: 400,
    alignSelf: 'center',
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  logo: {
    width: 44,
    height: 44,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: INK,
    letterSpacing: -0.3,
  },
  brandTagline: {
    fontSize: 13,
    color: INK_MUTED,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    gap: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: INK,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: INK_MUTED,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1.4,
    borderColor: BORDER,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonPressed: {
    backgroundColor: '#F5F6F8',
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: INK,
    fontSize: 15,
    fontWeight: '700',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  error: {
    color: '#DC2626',
    fontSize: 13,
  },
  info: {
    color: BRAND_BLUE,
    fontSize: 13,
  },
  emailToggle: {
    marginTop: 24,
    alignItems: 'center',
  },
  emailForm: {
    marginTop: 8,
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 16,
  },
  input: {
    height: 52,
    borderWidth: 1.4,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: INK,
    backgroundColor: '#fff',
  },
  inputFocused: {
    borderColor: BRAND_BLUE,
    backgroundColor: BRAND_BLUE_MUTED,
  },
  submitButton: {
    backgroundColor: BRAND_BLUE,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonPressed: {
    backgroundColor: BRAND_BLUE_PRESSED,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  linkText: {
    fontSize: 13,
    color: BRAND_BLUE,
    fontWeight: '600',
    textAlign: 'center',
  },
});
