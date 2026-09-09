import { useWindowDimensions } from 'react-native';

/**
 * 태블릿/PC 확장 디자인(834px, 1440px 아트보드) 기준 브레이크포인트.
 * mobile < 768 <= tablet < 1200 <= desktop.
 */
export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1200,
} as const;

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}
