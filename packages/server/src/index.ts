import 'dotenv/config';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import type { Question } from '@gxg/shared';
import { QuizRoom } from './rooms/QuizRoom.js';
import { supabase } from './supabase.js';

const port = Number(process.env.PORT ?? 2568);

const gameServer = new Server({
  transport: new WebSocketTransport()
});

gameServer.define('quiz', QuizRoom).filterBy(['sessionId']);

const json = (res: http.ServerResponse, code: number, body: unknown) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

async function readJson<T>(req: http.IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return (raw ? JSON.parse(raw) : {}) as T;
}

function withCors(res: http.ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
}

function makeRoomCode() {
  return `GXG${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function createUniqueRoomCode() {
  for (let i = 0; i < 10; i++) {
    const roomCode = makeRoomCode();
    const { data } = await supabase
      .from('gxgtest_sessions')
      .select('id')
      .eq('room_code', roomCode)
      .maybeSingle();

    if (!data) return roomCode;
  }

  return `GXG${randomUUID().slice(0, 4).toUpperCase()}`;
}

const aux = http.createServer(async (req, res) => {
  withCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');

  try {
    if (req.method === 'GET' && url.pathname === '/session-by-code') {
      const code = url.searchParams.get('code') ?? '';
      const { data } = await supabase
        .from('gxgtest_sessions')
        .select('id, room_code, status, set_id')
        .eq('room_code', code)
        .single();

      json(res, 200, data ?? null);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/author/bootstrap') {
      const [
        { data: questions, error: qErr },
        { data: quizSets, error: sErr },
        { data: sessions, error: sessErr }
      ] = await Promise.all([
        supabase
          .from('gxgtest_questions')
          .select('id, type, title, prompt, tip, score, time_limit, payload, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('gxgtest_quiz_sets')
          .select('id, name, question_ids, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('gxgtest_sessions')
          .select('id, room_code, status, set_id, created_at')
          .order('created_at', { ascending: false })
      ]);

      if (qErr || sErr || sessErr) {
        json(res, 500, { error: qErr?.message ?? sErr?.message ?? sessErr?.message ?? 'bootstrap failed' });
        return;
      }

      json(res, 200, { questions, quizSets, sessions });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/author/questions') {
      const body = await readJson<{ question: Omit<Question, 'id'> }>(req);
      const { question } = body;

      const { data, error } = await supabase
        .from('gxgtest_questions')
        .insert({
          type: question.type,
          title: question.title,
          prompt: question.prompt,
          tip: question.tip,
          score: question.score,
          time_limit: question.timeLimit,
          payload: question.payload
        })
        .select('*')
        .single();

      if (error) {
        json(res, 400, { error: error.message });
        return;
      }

      json(res, 200, data);
      return;
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/author/questions/')) {
      const id = url.pathname.split('/').pop() ?? '';
      const body = await readJson<{ question: Omit<Question, 'id'> }>(req);
      const { question } = body;

      const { data, error } = await supabase
        .from('gxgtest_questions')
        .update({
          type: question.type,
          title: question.title,
          prompt: question.prompt,
          tip: question.tip,
          score: question.score,
          time_limit: question.timeLimit,
          payload: question.payload
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        json(res, 400, { error: error.message });
        return;
      }

      json(res, 200, data);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/author/quiz-sets') {
      const body = await readJson<{ name: string; questionIds: string[] }>(req);
      const { data, error } = await supabase
        .from('gxgtest_quiz_sets')
        .insert({
          name: body.name,
          question_ids: body.questionIds
        })
        .select('*')
        .single();

      if (error) {
        json(res, 400, { error: error.message });
        return;
      }

      json(res, 200, data);
      return;
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/author/quiz-sets/')) {
      const id = url.pathname.split('/').pop() ?? '';
      const body = await readJson<{ name?: string; questionIds?: string[] }>(req);
      const update: Record<string, unknown> = {};

      if (typeof body.name === 'string') update.name = body.name;
      if (Array.isArray(body.questionIds)) update.question_ids = body.questionIds;

      if (Object.keys(update).length === 0) {
        json(res, 400, { error: 'No fields to update.' });
        return;
      }

      const { data, error } = await supabase
        .from('gxgtest_quiz_sets')
        .update(update)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        json(res, 400, { error: error.message });
        return;
      }

      json(res, 200, data);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/author/sessions') {
      const body = await readJson<{ setId: string; roomCode?: string }>(req);
      const roomCode = body.roomCode?.trim() || (await createUniqueRoomCode());

      const { data, error } = await supabase
        .from('gxgtest_sessions')
        .insert({
          set_id: body.setId,
          room_code: roomCode,
          status: 'waiting'
        })
        .select('*')
        .single();

      if (error) {
        json(res, 400, { error: error.message });
        return;
      }

      json(res, 200, data);
      return;
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/author/quiz-sets/')) {
      const id = url.pathname.split('/').pop() ?? '';
      const { error } = await supabase
        .from('gxgtest_quiz_sets')
        .delete()
        .eq('id', id);

      if (error) {
        json(res, 400, { error: error.message });
        return;
      }

      json(res, 200, { ok: true });
      return;
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/author/questions/')) {
      const id = url.pathname.split('/').pop() ?? '';
      const { data: impactedSets, error: setReadError } = await supabase
        .from('gxgtest_quiz_sets')
        .select('id, question_ids')
        .contains('question_ids', [id]);

      if (setReadError) {
        json(res, 400, { error: setReadError.message });
        return;
      }

      for (const set of impactedSets ?? []) {
        const nextIds = (set.question_ids as string[]).filter((questionId) => questionId !== id);
        const { error: setUpdateError } = await supabase
          .from('gxgtest_quiz_sets')
          .update({ question_ids: nextIds })
          .eq('id', set.id);

        if (setUpdateError) {
          json(res, 400, { error: setUpdateError.message });
          return;
        }
      }

      const { error } = await supabase
        .from('gxgtest_questions')
        .delete()
        .eq('id', id);

      if (error) {
        json(res, 400, { error: error.message });
        return;
      }

      json(res, 200, { ok: true });
      return;
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/author/sessions/')) {
      const id = url.pathname.split('/').pop() ?? '';
      const { error } = await supabase
        .from('gxgtest_sessions')
        .delete()
        .eq('id', id);

      if (error) {
        json(res, 400, { error: error.message });
        return;
      }

      json(res, 200, { ok: true });
      return;
    }

    json(res, 404, { error: 'not found' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    json(res, 500, { error: message });
  }
});

aux.listen(port + 1, () =>
  console.log(`[aux] http://localhost:${port + 1}/session-by-code?code=DEMO01`)
);

gameServer
  .listen(port)
  .then(() => console.log(`[Colyseus] ws://localhost:${port}`));
