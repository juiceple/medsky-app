import { ActivityIndicator, StyleSheet } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { StudentPortalScreen } from '@/components/management/student-portal-screen';
import { ThemedView } from '@/components/themed-view';
import { WorkspaceHomeScreen } from '@/components/workspace/workspace-home-screen';
import { useManagementViewer } from '@/hooks/use-management-viewer';

/**
 * 로그인한 사람의 역할에 따라 학생 마이페이지 또는 컨설턴트/실장 워크스페이스(종합
 * 생기부 관리 · 수시 · 정시 원서 컨설팅)를 홈 화면으로 보여준다.
 */
export default function HomeScreen() {
  const viewerState = useManagementViewer();

  if (viewerState.status === 'loading') {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (viewerState.status === 'error') {
    return <StatusMessage message={viewerState.message} onRetry={viewerState.reload} />;
  }

  const { viewer } = viewerState;

  if (viewer.role === 'student') {
    return <StudentPortalScreen />;
  }

  if (viewer.role === 'consultant' || viewer.role === 'manager') {
    return <WorkspaceHomeScreen viewer={viewer} />;
  }

  return (
    <StatusMessage message="이 계정은 담당하는 서비스가 없어요. 담당 컨설턴트에게 문의해주세요." />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
