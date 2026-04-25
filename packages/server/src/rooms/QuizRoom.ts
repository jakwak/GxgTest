import { Room, Client } from 'colyseus';
import { QuizState, Player } from '../state/QuizState.js';
import { supabase } from '../supabase.js';
import { grade } from '../grader/index.js';
import type { Question } from '@gxg/shared';

interface CreateOpts {
  sessionId: string;
}

interface JoinOpts {
  name: string;
  role: 'student' | 'teacher';
}

interface AnswerPayload {
  response: any;
}

/**
 * QuizRoom — 한 세션(=한 교실 수업) 단위.
 *  - onCreate: Supabase 에서 문제 셋 로드
 *  - onJoin  : student 면 Player 생성, teacher 는 관전
 *  - 메시지  : start / next / answer
 */
export class QuizRoom extends Room<QuizState> {
  questions: Question[] = [];
  sessionId!: string;
  questionStartAt = 0;
  timer?: NodeJS.Timeout;

  async onCreate(opts: CreateOpts) {
    this.setState(new QuizState());
    this.sessionId = opts.sessionId;

    // 1) 세션 + 퀴즈셋 로드
    const { data: session, error: sErr } = await supabase
      .from('gxgtest_sessions')
      .select('*, gxgtest_quiz_sets(*)')
      .eq('id', opts.sessionId)
      .single();

    if (sErr || !session) {
      console.error('[QuizRoom] session load failed', sErr);
      this.disconnect();
      return;
    }

    // 2) 문제들 순서대로 로드
    const ids: string[] = session.gxgtest_quiz_sets.question_ids;
    const { data: qs, error: qErr } = await supabase
      .from('gxgtest_questions')
      .select('*')
      .in('id', ids);

    if (qErr || !qs) {
      console.error('[QuizRoom] questions load failed', qErr);
      this.disconnect();
      return;
    }

    // ids 순서대로 정렬 + camelCase 매핑
    this.questions = ids.map((id) => {
      const row = qs.find((q) => q.id === id)!;
      return {
        id: row.id,
        type: row.type,
        title: row.title,
        prompt: row.prompt,
        tip: row.tip,
        score: row.score,
        timeLimit: row.time_limit,
        payload: row.payload
      } as Question;
    });

    this.state.totalQuestions = this.questions.length;

    // 3) 메시지 핸들러
    this.onMessage('start', () => this.startQuiz());
    this.onMessage('next', () => this.nextQuestion());
    this.onMessage('answer', (client, payload: AnswerPayload) =>
      this.handleAnswer(client, payload)
    );

    console.log(
      `[QuizRoom] created sessionId=${opts.sessionId} questions=${this.questions.length}`
    );
  }

  onJoin(client: Client, opts: JoinOpts) {
    if (opts.role === 'student') {
      const p = new Player();
      p.id = client.sessionId;
      p.name = opts.name;
      this.state.players.set(client.sessionId, p);
    }
    // teacher 는 state 만 관전 → players 등록 안 함
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
  }

  /** 교사가 "▶ 시작" */
  startQuiz() {
    if (this.state.status !== 'waiting' && this.state.status !== 'reveal')
      return;
    this.state.status = 'playing';
    this.state.currentIndex = 0;
    this.loadCurrent();

    // sessions.status 동기화
    supabase
      .from('gxgtest_sessions')
      .update({ status: 'playing', started_at: new Date().toISOString() })
      .eq('id', this.sessionId);
  }

  /** 한 문제 로드 + 학생들에게 broadcast (정답 제거) */
  loadCurrent() {
    const q = this.questions[this.state.currentIndex];
    this.state.currentQuestionId = q.id;
    this.state.timeLeft = q.timeLimit;
    this.state.submittedPlayers.clear();
    this.state.players.forEach((p) => {
      p.hasSubmitted = false;
      p.lastCorrect = false;
    });

    this.broadcast('question', stripAnswer(q));
    this.questionStartAt = Date.now();

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.state.timeLeft--;
      if (this.state.timeLeft <= 0) this.revealAnswer();
    }, 1000);
  }

  /** 학생 제출 처리 */
  async handleAnswer(client: Client, payload: AnswerPayload) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.hasSubmitted) return;
    if (this.state.status !== 'playing') return;

    const q = this.questions[this.state.currentIndex];
    const correct = grade(q, payload.response);
    const elapsed = Date.now() - this.questionStartAt;

    // 빨리 풀수록 보너스 — 1초당 1점 차감, 최저 10점 보장
    const earned = correct
      ? Math.max(10, q.score - Math.floor(elapsed / 1000))
      : 0;

    player.hasSubmitted = true;
    player.lastCorrect = correct;
    player.answeredCount++;
    player.score += earned;
    this.state.submittedPlayers.push(client.sessionId);

    // DB 저장
    const { error } = await supabase.from('gxgtest_answers').insert({
      session_id: this.sessionId,
      student_id: player.name,
      question_id: q.id,
      response: payload.response,
      is_correct: correct,
      score: earned,
      elapsed_ms: elapsed
    });
    if (error) console.error('[answers.insert]', error);

    // 모두 제출 → 자동 공개
    if (this.state.submittedPlayers.length === this.state.players.size) {
      this.revealAnswer();
    }
  }

  revealAnswer() {
    if (this.timer) clearInterval(this.timer);
    this.state.status = 'reveal';
    const q = this.questions[this.state.currentIndex];
    this.broadcast('reveal', { answer: getAnswer(q) });
  }

  nextQuestion() {
    if (this.state.currentIndex + 1 >= this.questions.length) {
      this.state.status = 'ended';
      this.broadcast('ended');

      supabase
        .from('gxgtest_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', this.sessionId);
      return;
    }
    this.state.currentIndex++;
    this.state.status = 'playing';
    this.loadCurrent();
  }
}

/** 학생에게 보낼 때 정답 필드만 제거 */
function stripAnswer(q: Question): any {
  const clone: any = JSON.parse(JSON.stringify(q));
  switch (clone.type) {
    case 'matching':
    case 'classify':
    case 'hotspot':
    case 'slider':
      delete clone.payload.correct;
      break;
    case 'multiple_choice':
      delete clone.payload.correctId;
      break;
    case 'ordering':
      delete clone.payload.correctOrder;
      break;
  }
  return clone;
}

/** 공개용 정답 */
function getAnswer(q: Question): any {
  const p: any = q.payload;
  return p.correct ?? p.correctId ?? p.correctOrder ?? null;
}
