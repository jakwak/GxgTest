-- 0001_init.sql — 핵심 스키마

-- 문제 (교사가 작성)
create table gxgtest_questions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in
    ('matching','multiple_choice','classify','ordering','hotspot','slider')),
  title text not null,
  prompt text,
  tip text,
  score int default 80,
  time_limit int default 150,            -- 초
  payload jsonb not null,                 -- 유형별 데이터(보기·정답)
  tags text[] default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index on gxgtest_questions using gin (tags);
create index on gxgtest_questions using gin (payload);

-- 퀴즈 세트 (문제 묶음, 1~20번)
create table gxgtest_quiz_sets (
  id uuid primary key default gen_random_uuid(),
  name text,
  question_ids uuid[] not null,           -- 순서대로
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 세션 (한 회 수업)
create table gxgtest_sessions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid references gxgtest_quiz_sets(id) on delete cascade,
  room_code text unique,                  -- 학생 입장 코드
  status text default 'waiting',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now()
);

-- 학생 답안
create table gxgtest_answers (
  id bigserial primary key,
  session_id uuid references gxgtest_sessions(id) on delete cascade,
  student_id text,                        -- 닉네임/임시 id
  question_id uuid references gxgtest_questions(id),
  response jsonb,
  is_correct boolean,
  score int,
  elapsed_ms int,
  submitted_at timestamptz default now()
);

create index on gxgtest_answers (session_id, question_id);
create index on gxgtest_answers (session_id, student_id);
