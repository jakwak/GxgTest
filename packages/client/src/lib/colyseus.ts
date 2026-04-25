import { Client, type Room } from 'colyseus.js';
import { get, writable } from 'svelte/store';
import { env } from '$env/dynamic/public';

const WS = env.PUBLIC_COLYSEUS_WS ?? 'ws://localhost:2568';
const AUX = env.PUBLIC_AUX_HTTP ?? 'http://localhost:2569';

export const client = new Client(WS);

export const room = writable<Room | null>(null);
export const state = writable<any>(null);
export const currentQuestion = writable<any>(null);
export const revealedAnswer = writable<any>(null);
export const ended = writable<boolean>(false);

function resetStores() {
  room.set(null);
  state.set(null);
  currentQuestion.set(null);
  revealedAnswer.set(null);
  ended.set(false);
}

async function auxJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${AUX}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? `request failed: ${response.status}`);
  }

  return data as T;
}

/** room_code → sessionId 변환 (서버 aux HTTP) */
async function resolveSessionId(roomCode: string): Promise<string> {
  const data = await auxJson<{ id?: string }>(
    `/session-by-code?code=${encodeURIComponent(roomCode)}`
  );

  if (!data?.id) {
    throw new Error(`room_code "${roomCode}" 에 해당하는 세션을 찾을 수 없습니다.`);
  }

  return data.id;
}

export async function joinAsStudent(roomCode: string, name: string) {
  const sessionId = await resolveSessionId(roomCode);
  const joinedRoom = await client.joinOrCreate('quiz', {
    sessionId,
    role: 'student',
    name
  });
  bind(joinedRoom);
}

export async function joinAsTeacher(roomCode: string) {
  const sessionId = await resolveSessionId(roomCode);
  const joinedRoom = await client.joinOrCreate('quiz', {
    sessionId,
    role: 'teacher',
    name: 'TEACHER'
  });
  bind(joinedRoom);
}

function bind(joinedRoom: Room) {
  resetStores();
  room.set(joinedRoom);

  joinedRoom.onStateChange((s: any) => {
    state.set({
      ...s.toJSON(),
      players: Array.from(s.players.values()).map((p: any) =>
        p.toJSON ? p.toJSON() : p
      )
    });
  });

  joinedRoom.onMessage('question', (q: any) => {
    currentQuestion.set(q);
    revealedAnswer.set(null);
  });
  joinedRoom.onMessage('reveal', (d: any) => revealedAnswer.set(d.answer));
  joinedRoom.onMessage('ended', () => ended.set(true));

  joinedRoom.onLeave(() => resetStores());
}

export function leaveRoom() {
  get(room)?.leave();
  resetStores();
}

export { auxJson, AUX };
