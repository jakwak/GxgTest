# GxgTest — 실행 가이드

실시간 수학 퀴즈 플랫폼 (Colyseus + SvelteKit + 로컬 Supabase).

## 사전 요구사항

- Node.js 20+
- pnpm 9+ (`npm i -g pnpm`)
- Docker Desktop (Supabase 로컬용)
- Supabase CLI (`brew install supabase/tap/supabase`)

## 최초 설치

```bash
cd /Users/ondalssam/Desktop/GxgTest

# 1) 워크스페이스 의존성
pnpm install

# 2) 로컬 Supabase 기동 + 스키마 적용
supabase start
supabase db reset   # 0001_init + 0002_rls + seed.sql 적용
```

`supabase start` 실행 후 출력되는 `API URL`, `anon key`, `service_role key`를
`packages/client/.env`, `packages/server/.env`에 채워주세요. 예시 파일은
각 패키지의 `.env.example` 참고.

## 개발 서버 실행

```bash
# 터미널 1 — Colyseus 서버
pnpm -F server dev          # ws://localhost:2568

# 터미널 2 — SvelteKit 클라이언트
pnpm -F client dev          # http://localhost:5173
```

## 시나리오

1. 교사 → `/teacher/author` 에서 6개 유형 문제 작성
2. 같은 화면에서 문제를 선택해 `gxgtest_quiz_sets` 생성
3. 같은 화면에서 `gxgtest_sessions` 생성 후 **room_code 발급**
   (`DEMO01` 시드 세션은 그대로 유지됨)
4. 교사 → `/teacher/monitor/ROOMCODE` 진입 (방 자동 join)
5. 학생 → `/student/ROOMCODE` 진입 → 닉네임 입력
6. 교사 "퀴즈 시작" → 모든 학생에게 1번 문제 broadcast
7. 학생 제출 → 서버 채점 → 점수·제출 상태 실시간 갱신
8. 모두 제출(또는 시간 종료) → 정답 공개 → 교사 "다음 문제"
9. 마지막 문제 후 `status=ended` → Supabase에 결과 누적

## 폴더 구조

```
GxgTest/
├── packages/
│   ├── shared/                # 서버·클라이언트 공통 타입
│   ├── server/                # Colyseus
│   └── client/                # SvelteKit
└── supabase/
    ├── migrations/            # 0001_init.sql, 0002_rls.sql
    └── seed.sql
```

## 참고

- 이 워크스페이스는 Git 저장소가 아닙니다. 이후 변경 추적이 필요하면 `git init` 후 진행하는 것을 권장합니다.
- 현재 교사용 작성실은 JSON 직접 편집 대신 폼 기반 입력으로 payload를 생성합니다.
