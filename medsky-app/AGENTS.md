# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

---

# medsky-app

메드스카이(MED SKY) 고객용 모바일 앱. Expo (SDK 54) + expo-router + TypeScript,
[medsky_homepage](../../medsky_homepage)와 같은 Supabase 프로젝트를 백엔드로 쓴다.

## 구조

- `app/` — expo-router 파일 기반 라우팅.
  - `app/login.tsx` — 로그인 화면. Google OAuth 로그인이 기본으로 크게 보이고,
    이메일/비밀번호 로그인·회원가입은 그 아래 작은 링크(`아이디로 로그인 · 가입`)
    를 눌러야 펼쳐진다. Google OAuth는 Supabase 대시보드에서 Google provider를
    켜고(Client ID/Secret) Redirect URL 에 `medskyapp://`(`app.json`의 `expo.scheme`)
    를 추가해야 실제로 동작한다 — 코드만으로는 안 됨.
  - `app/(tabs)/` — 로그인 후 진입하는 홈 탭 (`index.tsx`) / 마이페이지 탭 (`profile.tsx`).
  - `app/_layout.tsx` — `Stack.Protected`로 세션 유무에 따라 `(tabs)` ↔ `login` 분기.
- `lib/supabase.ts` — Supabase 클라이언트. 세션은 `expo-secure-store`(암호화 키) +
  `AsyncStorage`(암호문)에 나눠 저장한다 (JWT가 SecureStore 2KB 제한을 넘을 수 있어서).
- `lib/auth-context.tsx` — `AuthProvider`/`useAuth()`. 로그인 세션, `profiles` row,
  role(`user_roles` → 레거시 `profiles.role` 순으로 조회, medsky_homepage의
  `src/lib/auth/require-admin.ts`와 동일한 로직)을 제공한다.
- `lib/database.types.ts` — Supabase `public` 스키마 생성 타입
  (`mcp__Supabase__generate_typescript_types`, project `htxlggyucplpjhiyymkt`).
  마이그레이션이 추가되면 재생성할 것. `crm`/`management`/`susi`/`jungsi` 스키마는
  포함돼 있지 않다 (PostgREST에 노출되지 않음).

## 환경 변수

`.env.example`을 `.env`로 복사하고 medsky_homepage의
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`와 같은 값을 넣는다.
Expo는 `EXPO_PUBLIC_` 접두사가 붙은 변수만 클라이언트 번들에 노출한다.

## 인증 모델 — 아직 안 붙인 부분

medsky_homepage에는 두 가지 고객 접근 방식이 있다:

1. **Supabase Auth 로그인** — 레거시 `management` 상품 학생, 그리고 컨설턴트/매니저/
   관리자. 이 앱은 이 방식만 구현되어 있다 (Google OAuth + 이메일/비밀번호
   로그인·회원가입).
2. **토큰 URL 접근** (`student/susi/[token]`, `student/jungsi/[token]`,
   `parent/management/[token]`) — 현재 주력 상품(2027 수시/정시)의 학생·학부모는
   로그인 없이 알림톡으로 받은 토큰 링크로만 진행 상황을 본다. 이건 Next.js
   서버 컴포넌트가 서비스 롤 키로 직접 조회하는 구조라, 모바일 앱(서비스 롤 키를
   가질 수 없음)이 같은 데이터를 보려면 **medsky_homepage 쪽에 토큰을 검증하는
   REST API가 먼저 필요하다.** 아직 없음 — 이 앱에서 손대지 않았다.

홈 화면의 "수업 예약" / "생기부·자료" / "공지·칼럼" 카드는 위 이유로 아직 실제
데이터를 연결하지 않은 자리표시자다. 실데이터를 연결하려면 어느 스키마/API를 쓸지
먼저 정해야 한다 (공개된 `public` 스키마로 될지, 아니면 medsky_homepage에 새
API 라우트를 추가해야 할지).

## 리포지토리 구조

이 앱은 `medsky-app` 저장소 안의 `medsky-app/` 하위 폴더에 들어있다 (한 겹 더
중첩됨 — `create-expo-app`을 저장소 루트가 아니라 그 안의 하위 폴더 이름으로
실행해서 생긴 구조). 저장소를 새로 클론하면 실제 앱은
`<clone 위치>/medsky-app/medsky-app/` 에 있다.

## 개발

```bash
npm install
npx expo start
```
