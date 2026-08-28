import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * 고객이 알림톡으로 받은 진행 링크.
 *
 * 수시 · 정시 원서 컨설팅 고객과 생기부 학부모는 계정을 만들지 않는다. 결제 후
 * 알림톡에 실린 링크 하나가 진행 상황을 보는 유일한 통로다(가입 절차를 끼워 넣으면
 * 실제로 들어오는 비율이 급격히 떨어져, 진행을 눈에 보이게 만든다는 목적 자체가
 * 성립하지 않는다).
 *
 * 앱은 그 링크에서 토큰만 떼어 저장해 두고 같은 화면을 연다. 토큰이 곧 자격증명이라
 * SecureStore 대신 AsyncStorage 를 쓰는 것이 아니라, 이 값은 이미 고객의 문자함에
 * 평문으로 있고 서버가 요청마다 유효성을 다시 판정하기 때문이다. 서버가 링크를
 * 무효화하면 저장된 값도 그 즉시 열리지 않는다.
 */

export const LINK_KINDS = ['susi', 'jungsi', 'management'] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export const LINK_LABELS: Record<LinkKind, string> = {
  susi: '수시 원서 컨설팅',
  jungsi: '정시 원서 컨설팅',
  management: '종합 생기부 관리 (학부모)',
};

const STORAGE_KEY = 'medsky.customer-links.v1';

/** 웹 진행 페이지의 주소 모양. 링크를 통째로 붙여 넣어도 토큰만 떼어낸다. */
const LINK_PATTERNS: Record<LinkKind, RegExp> = {
  susi: /\/student\/susi\/([A-Za-z0-9_-]{16,128})/,
  jungsi: /\/student\/jungsi\/([A-Za-z0-9_-]{16,128})/,
  management: /\/parent\/management\/([A-Za-z0-9_-]{16,128})/,
};

const BARE_TOKEN = /^[A-Za-z0-9_-]{16,128}$/;

/**
 * 붙여 넣은 값에서 토큰을 뽑는다.
 *
 * 고객은 링크 전체를 붙여 넣기도 하고 토큰만 옮겨 적기도 한다. 어느 쪽이든 받아야
 * "링크가 안 된다" 는 문의가 생기지 않는다. 종류를 지정하면 그 주소 모양만 인정한다 —
 * 수시 링크를 정시 칸에 넣으면 열리지 않는 편이 낫다.
 */
export function extractToken(input: string, kind: LinkKind): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const matched = trimmed.match(LINK_PATTERNS[kind]);
  if (matched) return matched[1];

  // 다른 상품의 링크를 넣은 경우. 토큰만 떼어 쓰면 계속 404 가 나므로 여기서 막는다.
  if (Object.values(LINK_PATTERNS).some((pattern) => pattern.test(trimmed))) return null;

  return BARE_TOKEN.test(trimmed) ? trimmed : null;
}

type LinkMap = Partial<Record<LinkKind, string>>;

type CustomerLinksValue = {
  links: LinkMap;
  loading: boolean;
  save: (kind: LinkKind, token: string) => Promise<void>;
  remove: (kind: LinkKind) => Promise<void>;
};

const CustomerLinksContext = createContext<CustomerLinksValue | undefined>(undefined);

function isLinkKind(value: string): value is LinkKind {
  return (LINK_KINDS as readonly string[]).includes(value);
}

function parseStored(raw: string | null): LinkMap {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const links: LinkMap = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (isLinkKind(key) && typeof value === 'string') links[key] = value;
    }

    return links;
  } catch {
    // 형식이 깨졌으면 없는 것으로 본다. 고객은 링크를 다시 넣으면 되고,
    // 여기서 예외를 올리면 앱이 첫 화면에서 멈춘다.
    return {};
  }
}

export function CustomerLinksProvider({ children }: { children: ReactNode }) {
  const [links, setLinks] = useState<LinkMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (active) setLinks(parseStored(raw));
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback(async (next: LinkMap) => {
    setLinks(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const value = useMemo<CustomerLinksValue>(
    () => ({
      links,
      loading,
      save: (kind, token) => persist({ ...links, [kind]: token }),
      remove: (kind) => {
        const next = { ...links };
        delete next[kind];
        return persist(next);
      },
    }),
    [links, loading, persist]
  );

  return (
    <CustomerLinksContext.Provider value={value}>{children}</CustomerLinksContext.Provider>
  );
}

export function useCustomerLinks(): CustomerLinksValue {
  const context = useContext(CustomerLinksContext);
  if (!context) {
    throw new Error('useCustomerLinks must be used within a CustomerLinksProvider');
  }
  return context;
}
