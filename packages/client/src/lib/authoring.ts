import type { Question, QuestionType } from '@gxg/shared';

export type AuthorQuestion = {
  [K in QuestionType]: Omit<Extract<Question, { type: K }>, 'id'>;
}[QuestionType];

export interface AuthorDraft {
  type: QuestionType;
  title: string;
  prompt: string;
  tip: string;
  score: number;
  timeLimit: number;
  matchingLeft: string;
  matchingRight: string;
  matchingCorrect: string;
  mcSituation: string;
  mcQuestion: string;
  mcOptions: string;
  mcCorrectIndex: number;
  classifyCards: string;
  classifyBins: string;
  classifyCorrect: string;
  orderingSlotCount: number;
  orderingPool: string;
  orderingDistractors: string;
  orderingFixed: string;
  orderingCorrectOrder: string;
  hotspotRangeFrom: number;
  hotspotRangeTo: number;
  hotspotCorrect: string;
  hotspotDecoys: string;
  sliderA: number;
  sliderB: number;
  sliderMin: number;
  sliderMax: number;
  sliderCorrect: number;
}

export function templateDraft(type: QuestionType): AuthorDraft {
  return {
    type,
    title: defaultTitles[type],
    prompt: defaultPrompts[type],
    tip: defaultTips[type],
    score: 80,
    timeLimit: type === 'slider' ? 90 : type === 'classify' || type === 'hotspot' ? 180 : 150,
    matchingLeft: '(12, 18)\n(15, 25)\n(8, 20)\n(9, 16)',
    matchingRight: '5\n1\n6\n4',
    matchingCorrect: '1=3\n2=1\n3=4\n4=2',
    mcSituation: '빨간 버스는 6분마다, 파란 버스는 8분마다 출발해요.\n두 버스가 오전 9시에 동시에 출발했어요.',
    mcQuestion: '다음에 두 버스가 동시에 출발하는 시각은?',
    mcOptions: '9시 12분\n9시 24분\n9시 32분\n9시 48분',
    mcCorrectIndex: 2,
    classifyCards: '1,2,3,5,6,7,12,18,24,25',
    classifyBins: '6의 약수,6의 배수,둘 다 아님',
    classifyCorrect: '1=1\n2=1\n3=1\n5=3\n6=1|2\n7=3\n12=2\n18=2\n24=2\n25=3',
    orderingSlotCount: 8,
    orderingPool: '4,8,12,5,7,9',
    orderingDistractors: '5,7,9',
    orderingFixed: '1=1\n2=2\n3=3\n5=6\n8=24',
    orderingCorrectOrder: '1,2,3,4,6,8,12,24',
    hotspotRangeFrom: 1,
    hotspotRangeTo: 50,
    hotspotCorrect: '8,16,24,32,40,48',
    hotspotDecoys: '6,18',
    sliderA: 16,
    sliderB: 24,
    sliderMin: 1,
    sliderMax: 30,
    sliderCorrect: 8
  };
}

const defaultTitles: Record<QuestionType, string> = {
  matching: '두 수와 최대공약수 연결하기',
  multiple_choice: '버스 시간표',
  classify: '6의 약수 / 6의 배수',
  ordering: '24의 약수를 작은 수부터',
  hotspot: '8의 배수를 모두 클릭',
  slider: '최대공약수 맞히기'
};

const defaultPrompts: Record<QuestionType, string> = {
  matching: '왼쪽의 두 수와 알맞은 최대공약수를 선으로 연결하세요.',
  multiple_choice: '상황을 읽고 알맞은 답을 고르세요.',
  classify: '아래 수 카드를 알맞은 상자에 분류하세요.',
  ordering: '24의 약수 카드를 작은 수부터 큰 수 순서로 배열하세요.',
  hotspot: '1부터 50까지의 수 배열표에서 8의 배수를 모두 클릭하세요.',
  slider: '슬라이더를 움직여 16과 24의 최대공약수를 맞혀보세요.'
};

const defaultTips: Record<QuestionType, string> = {
  matching: '두 수를 모두 나누어떨어지게 하는 가장 큰 수를 떠올려보세요.',
  multiple_choice: '간격이 언제 다시 만나는지 최소공배수로 생각해보세요.',
  classify: '6 자체는 약수이면서 배수예요. 잘 생각해보세요.',
  ordering: '24를 두 수의 곱으로 나타내면 빠르게 찾을 수 있어요.',
  hotspot: '8씩 더해가며 배수를 찾아보세요.',
  slider: '더 큰 수도 두 수를 모두 나누는지 확인해보세요.'
};

function lines(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function csvNumbers(text: string) {
  return text
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number(value));
}

function csvStrings(text: string) {
  return text
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function buildQuestion(draft: AuthorDraft): AuthorQuestion {
  const base = {
    type: draft.type,
    title: draft.title.trim(),
    prompt: draft.prompt.trim(),
    tip: draft.tip.trim(),
    score: Number(draft.score),
    timeLimit: Number(draft.timeLimit)
  };

  switch (draft.type) {
    case 'matching': {
      const left = lines(draft.matchingLeft).map((label, index) => ({
        id: String(index + 1),
        label
      }));
      const right = lines(draft.matchingRight).map((label, index) => ({
        id: String(index + 1),
        label
      }));
      const correct = Object.fromEntries(
        lines(draft.matchingCorrect).map((line) => {
          const [leftIndex, rightIndex] = line.split('=').map((value) => value.trim());
          return [leftIndex, rightIndex];
        })
      );
      return { ...base, type: 'matching', payload: { left, right, correct } };
    }

    case 'multiple_choice': {
      const options = lines(draft.mcOptions).map((label, index) => ({
        id: String(index + 1),
        label
      }));
      return {
        ...base,
        type: 'multiple_choice',
        payload: {
          situation: draft.mcSituation.trim(),
          question: draft.mcQuestion.trim(),
          options,
          correctId: String(draft.mcCorrectIndex)
        }
      };
    }

    case 'classify': {
      const bins = csvStrings(draft.classifyBins).map((label, index) => ({
        id: String(index + 1),
        label
      }));
      const correct = Object.fromEntries(
        lines(draft.classifyCorrect).map((line) => {
          const [card, answer] = line.split('=').map((value) => value.trim());
          const accepted = answer.split('|').map((value) => value.trim());
          return [card, accepted.length === 1 ? accepted[0] : accepted];
        })
      );
      return {
        ...base,
        type: 'classify',
        payload: {
          cards: csvNumbers(draft.classifyCards),
          bins,
          correct
        }
      };
    }

    case 'ordering': {
      const fixed = lines(draft.orderingFixed).map((line) => {
        const [index, value] = line.split('=').map((part) => Number(part.trim()));
        return { index: index - 1, value };
      });
      return {
        ...base,
        type: 'ordering',
        payload: {
          slotCount: Number(draft.orderingSlotCount),
          pool: csvNumbers(draft.orderingPool),
          distractors: csvNumbers(draft.orderingDistractors),
          fixed,
          correctOrder: csvNumbers(draft.orderingCorrectOrder)
        }
      };
    }

    case 'hotspot':
      return {
        ...base,
        type: 'hotspot',
        payload: {
          rangeFrom: Number(draft.hotspotRangeFrom),
          rangeTo: Number(draft.hotspotRangeTo),
          correct: csvNumbers(draft.hotspotCorrect),
          decoys: csvNumbers(draft.hotspotDecoys)
        }
      };

    case 'slider':
      return {
        ...base,
        type: 'slider',
        payload: {
          a: Number(draft.sliderA),
          b: Number(draft.sliderB),
          min: Number(draft.sliderMin),
          max: Number(draft.sliderMax),
          correct: Number(draft.sliderCorrect)
        }
      };
  }
}

export function previewLines(question: AuthorQuestion) {
  switch (question.type) {
    case 'matching':
      return [
        `왼쪽 ${question.payload.left.length}개 / 오른쪽 ${question.payload.right.length}개`,
        `정답 매핑 ${Object.keys(question.payload.correct).length}개`
      ];
    case 'multiple_choice':
      return [`선택지 ${question.payload.options.length}개`, `정답 ${question.payload.correctId}번`];
    case 'classify':
      return [`카드 ${question.payload.cards.length}개`, `분류 상자 ${question.payload.bins.length}개`];
    case 'ordering':
      return [`슬롯 ${question.payload.slotCount}칸`, `풀 카드 ${question.payload.pool.length}개`];
    case 'hotspot':
      return [`범위 ${question.payload.rangeFrom} ~ ${question.payload.rangeTo}`, `정답 ${question.payload.correct.length}개`];
    case 'slider':
      return [`수 ${question.payload.a}, ${question.payload.b}`, `정답 ${question.payload.correct}`];
  }
}
