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
  - `app/(tabs)/` — 로그인 후 진입하는 탭. 홈 / 생기부 / 수시 / 정시 / 마이페이지.
    **콘솔 탭은 서버가 정한다** — `/api/mobile/me` 의 `sections` 에 없으면
    `href: null` 로 숨는다. 라우트 자체는 남겨 두며(주소로 들어가도 API 가 다시
    권한을 본다) 탭을 숨기는 것은 보안이 아니라 쓸 수 없는 메뉴를 감추는 목적이다.
  - `app/management/[studentId]`, `app/susi/application/[applicationId]`,
    `app/susi/student/[studentId]`, `app/jungsi/[onboardingId]` — 직원용 상세.
  - `app/progress/*` — 계정 없는 고객·학부모가 링크로 여는 화면. 로그인과 무관하므로
    `Stack.Protected` 밖에 둔다.
  - `app/_layout.tsx` — `Stack.Protected`로 세션 유무에 따라 `(tabs)` ↔ `login` 분기.
- `lib/api.ts` — medsky_homepage 의 `/api/mobile/**` 클라이언트. 로그인 조회는
  `apiGet()`(액세스 토큰을 매번 세션에서 꺼내 Bearer 로 붙인다), 토큰 링크 조회는
  `apiGetPublic()`.
- `lib/api-types.ts` — 그 응답의 모양. 화면이 실제로 쓰는 필드만 옮겨 둔다.
- `lib/use-api.ts` — `useApi()` / `usePublicApi()`. loading·error·당겨서 새로고침을
  한 곳에 모은다.
- `lib/viewer-context.tsx` — `/api/mobile/me` 를 한 번만 부르고 앱 전체가 공유한다.
  역할·담당 서비스·탭 구성의 유일한 근거다.
- `lib/customer-links.tsx` — 알림톡으로 받은 진행 링크(수시·정시·학부모)를 기기에
  저장한다. 링크 전체를 붙여 넣어도 토큰만 떼어낸다.
- `components/console.tsx` — 세 서비스 화면이 공유하는 카드·배지·지표·조회 상태.
- `lib/supabase.ts` — Supabase 클라이언트. 세션은 `expo-secure-store`(암호화 키) +
  `AsyncStorage`(암호문)에 나눠 저장한다 (JWT가 SecureStore 2KB 제한을 넘을 수 있어서).
  **로그인에만 쓴다** — 아래 "데이터는 어디서 오는가" 참고.
- `lib/auth-context.tsx` — `AuthProvider`/`useAuth()`. 로그인 세션과 `profiles` row.
- `lib/database.types.ts` — Supabase `public` 스키마 생성 타입
  (`mcp__Supabase__generate_typescript_types`, project `htxlggyucplpjhiyymkt`).
  마이그레이션이 추가되면 재생성할 것. `crm`/`management`/`susi`/`jungsi` 스키마는
  포함돼 있지 않다 (PostgREST에 노출되지 않음).

## 환경 변수

`.env.example`을 `.env`로 복사하고 medsky_homepage의
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`와 같은 값을 넣는다.
Expo는 `EXPO_PUBLIC_` 접두사가 붙은 변수만 클라이언트 번들에 노출한다.

`EXPO_PUBLIC_API_BASE_URL` 은 medsky_homepage 배포 주소다. 비워 두면
`https://medsky.co.kr` 을 쓴다. 로컬 서버를 붙일 때는 실제 기기에서 열리는 주소여야
한다 — `localhost` 는 시뮬레이터 밖에서 동작하지 않는다.

## 데이터는 어디서 오는가

**이 앱은 Supabase 를 직접 읽지 않는다.** 세 상품이 쓰는 `management` / `susi` /
`jungsi` 스키마는 anon·authenticated 에 권한이 없고, 서비스 롤 키는 서버에만 있다.
그래서 모든 조회는 medsky_homepage 의 `/api/mobile/**` 를 거친다 (그쪽 CLAUDE.md 의
"모바일 앱 API" 절에 경로 목록이 있다). `lib/supabase.ts` 는 로그인·세션 보관에만 쓴다.

**판정은 서버가 한다.** 진행률 · 매칭 SLA · 자료 마감일 · 환불 비율은 이미 계산된
값으로 내려온다. 앱에서 다시 계산하면 "수업일 3일 전" 같은 규정이 두 곳으로 갈라져,
앱을 새로 배포하기 전까지 웹과 다른 값을 보여주게 된다. 화면은 받은 값을 그린다.

**필요한 값이 부족하면 API 응답을 넓힌다.** 앱에서 여러 번 호출해 합치지 않는다.

### 접근 방식 두 가지

1. **Supabase Auth 로그인** — 실장·컨설턴트, 그리고 레거시 `management` 상품 학생.
   역할과 담당 서비스는 `/api/mobile/me` 가 답하고, 그 `sections` 가 곧 탭 구성이다.
   앱이 역할을 스스로 판단하지 않는 것은, 판단이 갈리는 순간 "탭은 보이는데 열면
   403" 이 되기 때문이다.
2. **토큰 링크** — 현재 주력 상품(2027 수시/정시)의 고객과 생기부 학부모는 계정을
   만들지 않는다. 결제 후 알림톡에 실린 링크가 유일한 진입점이다(가입 절차를 끼워
   넣으면 실제로 들어오는 비율이 급격히 떨어진다). 앱은 `app/progress/connect` 에서
   그 링크를 받아 토큰만 저장하고 같은 화면을 연다.

   딥링크(`medskyapp://`)로 바로 여는 것은 아직 안 붙였다. 알림톡에 실리는 것은 웹
   https 링크이고, 그걸 앱이 가로채려면 Universal Links / App Links 설정(도메인 인증
   파일 배포)이 먼저 필요하다. 지금은 고객이 링크를 붙여 넣는 방식으로만 동작한다.

### 앱에서 하지 않는 것

읽기 전용이다. 자료 업로드·약관 동의·배정·리포트 작성은 웹에서 한다. 특히 대학 매칭
보고서 작성은 입결 표를 옆에 놓고 비교하는 작업이라 좁은 화면에서는 오히려 실수가
는다. 쓰기가 필요해지면 앱이 Supabase 에 직접 쓰게 두지 말고, 웹 서버 액션과 같은
권한 검사를 거치는 `POST /api/mobile/**` 를 먼저 추가한다.

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
