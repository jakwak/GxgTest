-- 0002_rls.sql — Row-Level Security
-- 정책 요지:
--   * gxgtest_questions  : 누구나 읽기, insert/update는 created_by = auth.uid() 인 교사만
--   * gxgtest_quiz_sets  : 동일
--   * gxgtest_sessions   : 누구나 읽기 (room_code 로 학생이 직접 진입), 작성/변경은 set 작성자만
--   * gxgtest_answers    : 본인 student_id 로 insert 가능, 본인 row 만 select. 교사(세션 소유자)는 전체 select

alter table gxgtest_questions enable row level security;
alter table gxgtest_quiz_sets enable row level security;
alter table gxgtest_sessions  enable row level security;
alter table gxgtest_answers   enable row level security;

-- ── gxgtest_questions ────────────────────────────────────────────
create policy "gxgtest_questions_select_all"
  on gxgtest_questions for select
  using (true);

create policy "gxgtest_questions_insert_owner"
  on gxgtest_questions for insert
  with check (created_by = auth.uid());

create policy "gxgtest_questions_update_owner"
  on gxgtest_questions for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "gxgtest_questions_delete_owner"
  on gxgtest_questions for delete
  using (created_by = auth.uid());

-- ── gxgtest_quiz_sets ────────────────────────────────────────────
create policy "gxgtest_quiz_sets_select_all"
  on gxgtest_quiz_sets for select using (true);

create policy "gxgtest_quiz_sets_write_owner"
  on gxgtest_quiz_sets for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- ── gxgtest_sessions ─────────────────────────────────────────────
create policy "gxgtest_sessions_select_all"
  on gxgtest_sessions for select using (true);

create policy "gxgtest_sessions_write_owner"
  on gxgtest_sessions for all
  using (
    exists (
      select 1 from gxgtest_quiz_sets s
      where s.id = gxgtest_sessions.set_id and s.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from gxgtest_quiz_sets s
      where s.id = gxgtest_sessions.set_id and s.created_by = auth.uid()
    )
  );

-- ── gxgtest_answers ──────────────────────────────────────────────
-- 학생: 익명/임시 student_id 기준으로 자기 row 만 read
create policy "gxgtest_answers_select_self"
  on gxgtest_answers for select
  using (
    student_id = coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'student_id', '')
  );

-- 교사(세션 소유자): 자기 세션의 답안 전체 read
create policy "gxgtest_answers_select_teacher"
  on gxgtest_answers for select
  using (
    exists (
      select 1
      from gxgtest_sessions ss
      join gxgtest_quiz_sets qs on qs.id = ss.set_id
      where ss.id = gxgtest_answers.session_id
        and qs.created_by = auth.uid()
    )
  );

-- 학생/서버 모두 insert 가능 (Colyseus 서버는 service_role 키로 호출)
create policy "gxgtest_answers_insert_any"
  on gxgtest_answers for insert
  with check (true);
