import { useLocalSearchParams } from 'expo-router';

import { SusiApplicationDetailScreen } from '@/components/susi/susi-application-detail-screen';

export default function SusiApplicationDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SusiApplicationDetailScreen applicationId={id} />;
}
