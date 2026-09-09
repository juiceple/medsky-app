import { useLocalSearchParams } from 'expo-router';

import { StudentTimelineScreen } from '@/components/management/student-timeline-screen';

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StudentTimelineScreen studentId={id} />;
}
