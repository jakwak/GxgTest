import type { Question } from '@gxg/shared';

/** 문제 유형별 채점기. correct → true */
export function grade(q: Question, response: any): boolean {
  switch (q.type) {
    case 'matching': {
      const c = q.payload.correct;
      return Object.keys(c).every((k) => response?.[k] === c[k]);
    }

    case 'multiple_choice':
      return response === q.payload.correctId;

    case 'classify':
      return Object.entries(q.payload.correct).every(([card, accepted]) => {
        const value = response?.[card];
        return Array.isArray(accepted)
          ? accepted.includes(value)
          : value === accepted;
      });

    case 'ordering':
      return JSON.stringify(response) === JSON.stringify(q.payload.correctOrder);

    case 'hotspot': {
      const set = new Set<number>(response ?? []);
      const correct = q.payload.correct;
      return set.size === correct.length && correct.every((n) => set.has(n));
    }

    case 'slider':
      return Number(response) === q.payload.correct;

    default:
      return false;
  }
}
