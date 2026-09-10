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

/**
 * 홈/채팅의 3열 워크스페이스 레이아웃(오늘 수업+할 일 / 학생·일정 / 채팅 또는
 * 채팅 목록+대화창+학생 정보)을 켤지 판단하는 기준. 태블릿 세로(834px)는 아직
 * 좁아서 끄고, 태블릿 가로(1112px)부터 PC까지는 켠다 — `tablet`/`desktop`
 * 브레이크포인트(내비게이션 크롬용)와는 독립적인 컨텐츠 레이아웃 기준이다.
 */
const WORKSPACE_MIN_WIDTH = 1000;

export function useIsWorkspaceWide(): boolean {
  const { width } = useWindowDimensions();
  return width >= WORKSPACE_MIN_WIDTH;
}
