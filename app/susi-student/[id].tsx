import { useLocalSearchParams } from 'expo-router';

import { SusiStudentDetailScreen } from '@/components/susi/susi-student-detail-screen';

export default function SusiStudentDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SusiStudentDetailScreen studentId={id} />;
}
