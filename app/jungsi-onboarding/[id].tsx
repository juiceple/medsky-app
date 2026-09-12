import { useLocalSearchParams } from 'expo-router';

import { JungsiOnboardingDetailScreen } from '@/components/jungsi/jungsi-onboarding-detail-screen';

export default function JungsiOnboardingDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <JungsiOnboardingDetailScreen onboardingId={id} />;
}
