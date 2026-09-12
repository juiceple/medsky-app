import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

/**
 * 실장 콘솔 공용 모달 셸. 담당 배정, 등록/수정 폼, 확정 확인 등 여러 화면의
 * 팝업이 같은 머리(제목+부제+닫기)/발바닥(취소+확인) 구성을 쓰도록 감싼다.
 * 확인 버튼이 필요 없는 화면(선택만으로 끝나는 배정 목록 등)은 onConfirm을 비워둔다.
 */
export function AppModal({
  visible,
  title,
  subtitle,
  onClose,
  onConfirm,
  confirmLabel = '확인',
  confirmDisabled,
  confirmLoading,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  children: ReactNode;
}) {
  const surface = useThemeColor({}, 'surface');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.avoider}>
          <View style={[styles.card, { backgroundColor: surface }, Shadows.lg]}>
            <View style={styles.header}>
              <View style={styles.headerTexts}>
                <ThemedText style={[styles.title, { color: text }]}>{title}</ThemedText>
                {subtitle ? <ThemedText style={[styles.subtitle, { color: textSecondary }]}>{subtitle}</ThemedText> : null}
              </View>
              <Pressable
                hitSlop={8}
                onPress={onClose}
                style={[styles.closeButton, { backgroundColor: surfaceSecondary }]}>
                <Ionicons name="close" size={16} color={textSecondary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>

            {onConfirm ? (
              <View style={styles.footer}>
                <Button label="취소" variant="secondary" fullWidth={false} onPress={onClose} style={styles.footerButton} />
                <Button
                  label={confirmLabel}
                  fullWidth={false}
                  disabled={confirmDisabled}
                  loading={confirmLoading}
                  onPress={onConfirm}
                  style={styles.footerButton}
                />
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: 'rgba(15,23,42,0.32)',
  },
  avoider: { width: '100%', maxWidth: 460, maxHeight: '86%' },
  card: { borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  headerTexts: { flex: 1, gap: 3, minWidth: 0 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 13 },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { gap: Spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, paddingTop: Spacing.xs },
  footerButton: { minWidth: 96 },
});
