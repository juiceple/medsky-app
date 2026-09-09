# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

---

# medsky-app

메드스카이(MED SKY) 고객용 모바일 앱. Expo (SDK 54) + expo-router + TypeScript,
[medsky_homepage](../../medsky_homepage)와 같은 Supabase 프로젝트를 백엔드로 쓴다.

**이 앱은 종합 생기부 관리만 구동한다.** 정시/수시 원서 컨설팅(토큰 URL 접근 상품)은
아래 "인증 모델" 문단의 이유로 아직 붙이지 않았고, 붙일 계획도 확정되지 않았다.

## 구조

- `app/` — expo-router 파일 기반 라우팅.
  - `app/login.tsx` — 로그인 화면. Google OAuth 로그인이 기본으로 크게 보이고,
    이메일/비밀번호 로그인·회원가입은 그 아래 작은 링크(`아이디로 로그인 · 가입`)
    를 눌러야 펼쳐진다. Google OAuth는 Supabase 대시보드에서 Google provider를
    켜고(Client ID/Secret) Redirect URL 에 `medskyapp://`(`app.json`의 `expo.scheme`)
    를 추가해야 실제로 동작한다 — 코드만으로는 안 됨.
  - `app/(tabs)/` — 로그인 후 진입하는 홈 탭 (`index.tsx`) / 채팅 탭 (`chat.tsx`) /
    마이페이지 탭 (`profile.tsx`). 홈·채팅 탭은 `useManagementViewer()`(역할: 학생 /
    컨설턴트·실장 / 해당없음)에 따라 서로 다른 화면을 그린다 — 학생이면 자기
    마이페이지·채팅방을, 컨설턴트/실장이면 담당 학생 명부·채팅 목록을 보여준다.
  - `app/student/[id].tsx` — 컨설턴트/실장이 보는 학생 상세. 인적사항·진행 상태·내부
    메모(`StudentInfoCard`), 수업 예약 등록/완료·노쇼·취소 처리(`ReservationPanel`),
    회차 기록(자료 링크 포함) 목록·수정·삭제까지 웹 `/consultant/management/[studentId]`
    와 동일한 기능을 담는다.
  - `app/session/[sessionId].tsx` — 회차 기록 작성/수정 화면(모달). `sessionId`가
    `'new'`면 쿼리 파라미터로 받은 `reservationId`에 새 기록을 만들고, 아니면 기존
    기록을 고친다. 웹의 `LessonSessionForm`과 같은 필드(주제/학생 공개 요약/다음
    할 일/내부 메모/자료 링크/학생 공개 여부)를 담는다.
  - `app/chat/[studentId].tsx` — 컨설턴트/실장이 특정 학생과의 채팅방을 여는 화면.
    학생 본인의 채팅방은 `(tabs)/chat.tsx` 안에서 바로 연다.
  - `app/_layout.tsx` — `Stack.Protected`로 세션 유무에 따라 `(tabs)`+상세 화면들
    ↔ `login` 분기.
- `lib/supabase.ts` — Supabase 클라이언트. 세션은 `expo-secure-store`(암호화 키) +
  `AsyncStorage`(암호문)에 나눠 저장한다 (JWT가 SecureStore 2KB 제한을 넘을 수 있어서).
- `lib/auth-context.tsx` — `AuthProvider`/`useAuth()`. 로그인 세션, `profiles` row,
  role(`user_roles` → 레거시 `profiles.role` 순으로 조회, medsky_homepage의
  `src/lib/auth/require-admin.ts`와 동일한 로직)을 제공한다. 이 role은 `public`
  스키마만 보고 판정하는 앱 전역 표시용이고, 종합 생기부 관리 화면은 아래
  `lib/management-api.ts` 가 medsky_homepage 서버에서 다시 판정한 역할을 쓴다
  (management 스키마의 `consultant_profiles`/`students` 까지 봐야 정확하기 때문).
- `lib/database.types.ts` — Supabase `public` 스키마 생성 타입
  (`mcp__Supabase__generate_typescript_types`, project `htxlggyucplpjhiyymkt`).
  마이그레이션이 추가되면 재생성할 것. `crm`/`management`/`susi`/`jungsi` 스키마는
  포함돼 있지 않다 (PostgREST에 노출되지 않음).
- `lib/management-api.ts` / `lib/management-types.ts` — 종합 생기부 관리 데이터
  클라이언트. `management` 스키마가 PostgREST에 노출되지 않아 이 앱이 Supabase를
  직접 조회할 수 없으므로, medsky_homepage의 `/api/mobile/management/*` 를
  `Authorization: Bearer <supabase access_token>` 로 호출한다(아래 참고). 응답
  타입은 생성된 것이 아니라 medsky_homepage의
  `src/features/management/types.ts`를 손으로 옮긴 것이라, 그쪽이 바뀌면 같이 고쳐야
  한다.
- `lib/reservation-rules.ts` / `lib/reservation-calendar.ts` — 수업 예약 규칙(서비스별
  겹침 범위, 0.5회차 허용, 회차 선택 폭)과 날짜 계산. medsky_homepage 의
  `src/lib/reservations/rules.ts` / `calendar.ts` 를 그대로 옮긴 것이라, 그쪽이
  바뀌면(특히 `SERVICE_RULES`) 같이 고쳐야 한다. 최종 방어선은 항상 서버(mobile API
  route)다.
- `hooks/use-management-viewer.ts` — 로그인한 계정의 종합 생기부 관리 역할
  (student/consultant/manager/none)을 가져오는 훅. 홈·채팅 탭이 공유한다.
- `hooks/use-slot-availability.ts` — 예약 가능 시간 조회. medsky_homepage 의 인증이
  필요 없는 `GET /api/reservations/availability` 를 직접 부른다.
- `components/management/` — 학생 마이페이지(`student-portal-screen`), 컨설턴트/실장
  명부(`student-roster-screen`), 채팅방(`chat-thread`), 채팅 목록(`chat-inbox-screen`),
  학생 상세의 인적사항·진행 상태·내부 메모(`student-info-card`), 수업 예약 등록/일정
  변경/완료·노쇼·취소 처리(`reservation-panel` + 예약 팝업 `book-lesson-dialog`,
  날짜 선택 `reservation-calendar`, 시간 선택 `slot-picker` — medsky_homepage 의
  `StudentReservationPanel`/`BookLessonDialog`/`ReservationCalendar`/`SlotPicker` 와
  같은 흐름·문구를 쓴다).

## 환경 변수

`.env.example`을 `.env`로 복사하고 medsky_homepage의
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`와 같은 값,
그리고 medsky_homepage 배포 주소(`EXPO_PUBLIC_HOMEPAGE_API_URL`, 기본값
`https://medsky.co.kr`)를 넣는다. Expo는 `EXPO_PUBLIC_` 접두사가 붙은 변수만
클라이언트 번들에 노출한다.

## 인증 모델

medsky_homepage에는 두 가지 고객 접근 방식이 있다:

1. **Supabase Auth 로그인** — 레거시 `management` 상품(종합 생기부 관리) 학생, 그리고
   컨설턴트/매니저/관리자. 이 앱은 이 방식만 구현되어 있다 (Google OAuth + 이메일/
   비밀번호 로그인·회원가입).
2. **토큰 URL 접근** (`student/susi/[token]`, `student/jungsi/[token]`,
   `parent/management/[token]`) — 현재 주력 상품(2027 수시/정시)의 학생·학부모는
   로그인 없이 알림톡으로 받은 토큰 링크로만 진행 상황을 본다. 이건 Next.js
   서버 컴포넌트가 서비스 롤 키로 직접 조회하는 구조라, 모바일 앱(서비스 롤 키를
   가질 수 없음)이 같은 데이터를 보려면 medsky_homepage 쪽에 토큰을 검증하는
   REST API가 먼저 필요하다. 아직 없음 — 이 앱에서 손대지 않았다.

`management` 스키마(종합 생기부 관리의 실제 데이터: 컨설턴트, 회차, 크레딧, 생기부
파일 제출, 채팅)는 2026-07 학생부 법 개정 대응으로 PostgREST에 아예 노출되지
않는다(`schema usage`가 `anon`/`authenticated`에서 revoke됨 — RLS 이전에 스키마
레벨에서 막힌다). 그래서 이 앱은 Supabase를 직접 조회하지 못하고, medsky_homepage에
새로 만든 `src/app/api/mobile/management/*` 라우트를 거친다. 그 라우트들은 웹의
쿠키 세션 대신 `Authorization: Bearer <supabase access_token>` 로 신원을 확인하고
(`src/features/management/lib/mobile-auth.ts`), 나머지 조회/쓰기 로직은 웹이 쓰는
것과 같은 함수(`src/features/management/queries/*`, `lib/storage.ts` 등)를 그대로
재사용한다. 생기부 파일·채팅 첨부 업로드는 서버를 거치지 않고 이 앱이 Supabase
Storage로 직접 올린다(서명 업로드 URL 티켓 방식 — 웹과 동일).

홈 화면의 "수업 예약" / "공지·칼럼" 카드는 별도 상품(susi/jungsi 토큰 접근, CMS
콘텐츠)의 자리표시자였고, 이번에 앱 범위를 종합 생기부 관리로 좁히면서 제거했다.
나중에 다른 상품을 붙이려면 그때 다시 화면을 늘려야 한다.

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

## Git

**모든 세션에서, 브랜치에 커밋을 push 했으면 사용자가 별도로 요청하지 않아도
항상 PR을 만들고 사용자 확인 없이 바로 merge까지 한다.** 이미 열려 있는 PR이
있으면 새로 만들지 않고 그 PR을 그대로 쓴다. `main`으로 직접 push/merge하지
않고 항상 PR을 거친다.
