import { ActivityIndicator, StyleSheet } from 'react-native';

import { StatusMessage } from '@/components/management/status-message';
import { StudentPortalScreen } from '@/components/management/student-portal-screen';
import { StudentRosterScreen } from '@/components/management/student-roster-screen';
import { ThemedView } from '@/components/themed-view';
import { useManagementViewer } from '@/hooks/use-management-viewer';

/**
 * 이 앱은 종합 생기부 관리만 구동한다. 로그인한 사람의 역할에 따라
 * 학생 마이페이지 또는 컨설턴트/실장 명부를 홈 화면으로 보여준다.
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
    return <StudentRosterScreen />;
  }

  return (
    <StatusMessage message="이 계정은 종합 생기부 관리 대상이 아니에요. 담당 컨설턴트에게 문의해주세요." />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
